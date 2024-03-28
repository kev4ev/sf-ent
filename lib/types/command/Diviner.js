const { prompt } = require('enquirer');
const log = require('../../utils/logging/log');
const { EventEmitter, captureRejectionSymbol } = require('node:events');
const factory = require('../../utils/prompts/factory');

/** @module */
/** @typedef {import('../../utils/prompts/factory').Question} Question */
/** @typedef {import('../../utils/prompts/factory').FactoryQuestion} FactoryQuestion */

let interactiveMode = false;
/** @typedef {import('jsforce').Connection} Connection */
let jsfConnection;

/**
 * Diviner is the base class for all objects that must be available for invocation through
 * Enquirer's command-line prompts OR as a library within a script. Due to the 
 * patterns used in this library, modules that include a SUBCLASS of Diviner MUST expose it behind 
 * a synchronous wrapper function, as such:
 * ```
 * class MyDiviner extends Diviner{
 *   // ...
 * }
 * 
 * module.exports = {
 *  Diviner: (argObj) => new MyDiviner(argObj),
 *  flagConfig: Diviner.flagConfig // if subclass of Command
 * }
 * ```
 * 
 * Additionally, because DivinerPromise uses merges passed arguments with a parent instance's this.arg, any 
 * args that a parent wishes to pass to a child MUST be set in the parent Diviner's constructor. If the result of
 * the arg property must be retrieved async then the value should be the Promise that will resolve to it. Then child
 * Diviners will have the argument property when they're constructed even if they must await its result. A good 
 * example of this is the connection property that gets set to Promise<JSForce.Connection>.
 * @class
 */
class Diviner extends EventEmitter{

    /** 
     * used to ensure that parent Diviners receive 'done' event of their subdiviners in the same
     * order that they were called; object keys correspond to subdivinerMeta.called index
     * @type {Object.<number, { diviner: Diviner, payload: any, done: boolean, filled: boolean }} 
     */
    #doneQueue = {};

    constructor(){
        // ensure instances always capture promise rejectsion of event handlers
        super({ captureRejections: true });

        this.name = Object.getPrototypeOf(this)?.constructor?.name;
        /** 
         * for internal use only; will be set when a Diviner is run within a DivinerPromise's executor
         * function (which Diviners always are); properties set here only for intellisense/transparency
         */
        /** @type {Diviner} */
        this.parent = undefined;
        this.runResolver = (result) => result;
        this.runRejector = (err) => err;

        // init subdiviner meta
        this.subdivinerMeta = {
            called: [],
            done: [],
            error: []
        }
        // define read-only props
        Object.defineProperties(this, {
            _throwNotImplemented: {
                value: (methodName, name) => {
                    throw new Error(`${methodName} has not been properly implemented by ${name || Object.getPrototypeOf(this).name}`);
                }
            },
            _relay: {
                value: require('../command/DivinerPromise') // MUST import here to avoid circular dependency error
            }
        });
        // initialize a namespaced-logger for all Diviner instances
        this.log = log.extend(Object.getPrototypeOf(this).constructor.name);
        this.log('New instance initialized with args');
    }

    /**
     * Subclasses MAY override
     * @param  {...any} args 
     * @returns {Diviner}
     */
    static init(...args){
        return new this(...args);
    }

    /**
     * @typedef {object} InteractiveMeta
     * @property {string} name text that will be displayed to invoke the Diviner
     * @property {string} hint displayed as an Enquirer hint
     */

    /**
     * Subclasses exposed via CLI MUST override
     * @returns {InteractiveMeta}
     */
    static interactiveMeta(){
        throw new Error(`static interactiveMeta() has not been implemented by ${this.name}`);
    }

    /** Global setting for interactive mode; inherited by all instances in a transaction */
    static interactive(bool=true){ interactiveMode = bool; }
    
    /** 
     * instance read-only gette
     * @returns {boolean}
     */
    get interactive(){ return interactiveMode; }

    /** 
     * instance setter that sets connection at the module-level
     * @param {import('jsforce').Connection} jsfConnection
     */
    set connection(connection){
        jsfConnection = connection;
    }

    get connection(){
        return jsfConnection;
    }

    /** 
     * Get the authorized connection 
     * @returns {import('jsforce').Connection}
     */
    async getConnection(){
        if(!jsfConnection){
            // MUST require here to avoid circular module dependencies
            const Connect = require('../../utils/diviners/Connect');
            jsfConnection = await new Connect().run();
        }

        return jsfConnection; 
    }

    /** 
     * Convenience attribute for subclasses to check whether all subdiviners called have fired either a 'done' or 'error' lifecycle event 
     * @returns {boolean}
     */
    get allSubsFinished(){
        const finished = Object.values(this.#doneQueue).reduce((prev, curr) => {
            if(curr){
                prev = prev && curr.done && curr.filled;
            }

            return prev;
        }, true);

        return finished;
    }

    /**
     * MAY be overridden by subclasses to provided further information on a Diviners purpose
     * @returns {string}
     */
    get description(){ return ''; }

    /**
     * Runs a concrete Diviner instance's logic after validating/gathering all required inputs
     * @returns {Promise<any>}
     */
    async run(){
        try{
            this.log('Starting run() in %s mode', this.interactive ? 'interactive' : 'non-interactive');
            // init chalk for all instances
            this.chalk = await require('../../utils/logging/chalk-cjs')();
            // invoke parent handler for 'called' lifecycle
            await this.#dispatchLifecycleEvent('called', this);
            // prerun lifecycle
            await this.preRun();
            // prompt if interactive
            if(this.interactive){
                this.log('Interactive mode - beginning user prompts');
                const generator = this.getPrompts(); 
                let prompts = await generator.next();
                while(!prompts.done){
                    const { value } = prompts;
                    try {
                        const answers = await prompt(Array.isArray(value) ? value : [ value ]);
                        // assign answers to instance properties
                        Object.assign(this, answers);
                        prompts = await generator.next();
                    } catch (error) {
                        this.log(this.chalk.bgRed(`Unexpected prompt error: ${error.message}`));

                        throw error;
                    }
                }
            }
        
            // check readyStatus and conditionally exit
            const readyStatus = await this.readyToExecute();
            if(readyStatus === false || readyStatus !== true){
                const errType = typeof readyStatus;
                if(errType === 'string') throw new Error(readyStatus);
                if(errType === 'object') throw errType;

                throw new Error('Unidentified exception encountered');
            }
            const result = await (this.interactive ? this.executeInteractive() : this.execute());
            // ensure Diviner does not resolve itself until all called subdiviners have themselves resolved
            if(this.subdivinerMeta.called.length !== [...this.subdivinerMeta.done, ...this.subdivinerMeta.error].length){
                throw new Error('Diviner has attempted to resolve its promise before all called subdiviners have finished');
            }
            // pass result to runResolver, in the event this Diviner has been wrapped by DivinerPromise.eagerRelay
            this.runResolver(result);
            // trigger 'done' lifecycle event
            await this.#dispatchLifecycleEvent('done', result);
            // lastly, return the result in the event that the Diviner was executed directly (such as util diviners)
            return result;
        } catch(err){
            // log internal or display to user the exception
            const msg = this.chalk.bgRed(`Exception encountered: ${err.message}`);
            err.displayToUser ? console.log(msg) : this.log(msg);
            if(err.stack) err.displayToUser ? console.log(err.stack) : this.log(err.stack);
            // trigger 'error' lifecycle event; if parent handler returns truthy, error is recoverable
            // and the process will not be exited
            const recoverable = await this.#dispatchLifecycleEvent('error', err);
            // always reject own DivinerPromise on error
            this.runRejector(err);

            if(!recoverable) process.exit(1);
        }
    }

    async #dispatchLifecycleEvent(evt, payload){
        const parentMsg = !this.parent ? 'no parent' : `parent is ${Object.getPrototypeOf(this.parent).constructor.name}`;
        this.log(`Lifecycle event: ${this.chalk.yellow(evt)} - ${parentMsg}`);
        // in all cases emit event to non-parents BEFORE calling parent handler, to avoid issue where parent resolves
        // its promise before listeners have received event (e.g. bug that showed up in Generate command)
        try{
            this.emit(evt, payload);
        } catch(err){
            // this will gracefully handle any async exceptions thrown by handlers
            this[captureRejectionSymbol](err, evt);
        }
        if(this.parent){
            // closure necessary to effect #doneQueue
            const invokeHandlers = async (evt, payload, diviner) => {
                this.parent.log(`Processing event ${evt} from child Diviner`);
                // return result of parent handler in the event that event is 'error'
                return await this.parent.handleSubDivinerEvent(evt, payload, diviner);
            };
            // in all events track subdiviner meta on parent
            this.parent.subdivinerMeta[evt].push(this);
            const fillDoneQueueItem = () => {
                // get index of done diviner and set values in #doneQueue
                const pos = this.parent.subdivinerMeta.called.indexOf(this),
                    queueItem = this.parent.#doneQueue[pos];
                queueItem.done = true;
                queueItem.payload = payload;
            }
            switch (evt) {
                case 'called':
                    // populate #doneQueue to allow parent to receive done events in order children were called
                    this.parent.#doneQueue[this.parent.subdivinerMeta.called.length - 1] = { diviner: this, payload: undefined, done: false, filled: false };
                    await invokeHandlers(evt, payload, this);
                    break;

                case 'done':
                    // fill queue in the order that subrequests were called
                    // breaking at first unfinished item each time
                    fillDoneQueueItem();
                    for(const key in this.parent.#doneQueue){
                        const queueItem = this.parent.#doneQueue[key];
                        if(!queueItem.done) break;
                        
                        if(!queueItem.filled){
                            queueItem.filled = true;
                            await invokeHandlers(evt, queueItem.payload, queueItem.diviner);
                        }
                    }
                    break;

                case 'error': 
                    fillDoneQueueItem();
                    // only event that may use return value from parent
                    return await invokeHandlers(evt, payload, this);

                default:
                    break;
            }
        }
    }

    /**
     * Handles Promise rejection of any registered listeners
     */
    [captureRejectionSymbol](err, evt, ...args){
        this.log(this.chalk.red(`Caught Promise rejection of event listener on '${evt}' event. Error will not stop process:\n${err.message}`));
    }

    /**
     * Convenience method that exposes DivinerPromise.eagerRelay as instance method.
     * Should be called internally when one Diviner needs to relay execution to another. This
     * is prefereable to instantiating and calling run() on a Diviner directly because it allows the instantiator
     * (parent) to be registered as the parent and receive lifecycle events of the new (child) Diviner. This way
     * children can be handled the same way in both interactive and non-interactive (cli) modes.
     * @param {Diviner} diviner the Diviner to which execution will be relayed
     * @param {...any} [args] any args to pass to the Diviner's constructor
     * @returns {DivinerPromise} 
     */
    relay(diviner, ...args){
        return this._relay(diviner.init(...args), this);
    }

    /**
     * Called before run() to allow commands to perform setup as necessary
     */
    async preRun(){ /** subclasses MAY implement */ }
    
    /**
     * In the event of an error, returns either a string with the error message to be logged internally, 
     * or an object implementing the interface below which can be conditionally displayed to the user
     * via stdout
     * @returns {Promise<boolean|string|{ message: string, displayToUser: boolean }>}
     */
    async readyToExecute(){ this._throwNotImplemented('readyToExecute()'); }

    /**
     * The prompts used by the Diviner when in interactive mode to get necessary data for run()
     * @async
     * @generator
     * @yields {Promise<FactoryQuestion|Array<FactoryQuestion>>} GeneratorFunction that returns one or more Question objects 
     * that SHOULD, but not must, be wrapped by promptFactory()
     */
    async *getPrompts(){ this._throwNotImplemented('*getPrompts()'); }

    /**
     * Convenience method for subclasses to build Enquirer prompts with improved runtime stability
     * @param  {...Question} prompts 
     * @returns {Array<FactoryQuestion>}
     */
    promptFactory(...prompts){
        return factory(...prompts);
    }
    
    /**
     * Logic to execute when in non-interactive mode (no user to respond to prompts)
     * @returns {Promise<any>}
     */
    async execute(){ this._throwNotImplemented('execute'); }

    /**
     * Logic to execute when in interactive (cli) mode and user can respond to prompts
     * @returns {Promise<any>}
     */
    async executeInteractive(){ this._throwNotImplemented('executeInteractive'); }

    /**
     * Must return a hash of functions that return a Diviner. The hash becomes this instance's 
     * synchronous API that gets attached to its DivinerPromise that wraps run()
     * @returns {Object.<string, function(DivinerArgs, ...any): Diviner>}
     */
    getSubDiviners(){ /** MAY be implemented by subclasses when they need to define a subcommand API */ }

    /**
     * Handles lifecycle events of subDiviners
     * @param {string} evt the lifecycle event of the child Diviner; either of 'called' or 'done'
     * @param {object} payload for 'called', the child Diviner instance; for 'done', the result of the child
     * Diviner's execute() method
     * @param {Diviner} diviner the instance on which the lifecycle event was fired
     * @returns {void|boolean} when evt is 'error', handler may return a boolean to indicate whether the error
     * is recoverable; when false (default) the process will immediately exit
     */
    async handleSubDivinerEvent(evt, payload, diviner){
        /** MUST be implemented by subclass IF getSubDiviners() is implemented */
        if(this.getSubDiviners()) this._throwNotImplemented('handleSubDivinerEvent');
    }
}

module.exports = Diviner