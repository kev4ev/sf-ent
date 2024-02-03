const { prompt } = require('enquirer');
const log = require('../utils/logging/log');

/**
 * @typedef {object} DivinerArgs args object that may be expanded by extending classes; each Diviner arg should
 * receive only the config properties relevant to it to avoid pollution; other information can 
 * be passed as additional constructor args
 * @property {boolean} interactive whether the user is available to provide input (true) or not (false)
 * @property {Function} runResolver the resolver fn that has been externalized and passed to the Diviner
 * for resolution of its DivinerPromise; for internal use only
 * @property {Function} runRejector the resolver fn that has been externalized and passed to the Diviner
 * for rejection of its DivinerPromise; for internal use only
 */

/**
 * Type definition copied from enquirer interface
 * @typedef {object} Question
 * @property {string | (() => string)} name
 * @property {string | (() => string)} type
 * @property {string | (() => string) | (() => Promise<string>)} message
 * @property {string} [prefix]
 * @property {any} [initial]
 * @property {boolean} [required=false]
 * @property {boolean | string} [enabled=true]
 * @property {boolean | string} [disabled=false]
 * @property {(value: string): string | Promise<string>} [format]
 * @property {(value: string): string | Promise<string>} [result]
 * @property {((state: object) => boolean | Promise<boolean>) | boolean} [skip]
 * @property {(value: string): boolean | string | Promise<boolean | string>} [validate]
 * @property {(name: string, value: any, prompt: Enquirer.Prompt): boolean | Promise<boolean>} [onSubmit] this will always be set to instances answerHandler() method
 * @property {(name: string, value: any, prompt: Enquirer.Prompt): boolean | Promise<boolean>} [onCancel]
 */
 
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
 */
class Diviner {
    /**
     * @constructor
     * @argument {DivinerArgs} args the arguments expected by the instance, or none (interactive mode)
     */
    constructor(args={}){
        this.args = args;
        /** 
         * for internal use only; will be set when a Diviner is run within a DivinerPromise's executor
         * function (which Diviners always are); properties set here only for intellisense/transparency
         */
        /** @type {Diviner} */
        this.parent = undefined;
        this.runResolver = (result) => result;
        this.runRejector = (err) => {
            console.error(this.chalk.bgRed(err.message));

            process.exit(1);
        }
        // define private props
        Object.defineProperties(this, {
            _throwNotImplemented: {
                value: (methodName) => {
                    throw new Error(`${methodName} has not been properly implemented by ${Object.getPrototypeOf(this).name}`);
                }
            },
            _args: {
                value: args,
                writable: true
            },
            _handleLifecycleEvent: {
                value: async (evt, payload) => {
                    this.log('Firing lifecycle event: "%s"', evt);
                    if(this.parent){
                        this.log(
                            'Parent handler found. Invoking handler fn on %s', 
                            Object.getPrototypeOf(this.parent).constructor.name
                        );
                        await this.parent.handleSubDivinerEvent(evt, payload, this);
                    }
                }
            },
            _relay: {
                value: require('../types/DivinerPromise') // MUST import here to avoid circular dependency error
            }
        });
        // initialize a namespaced-logger for all Diviner instances
        this.log = log.extend(Object.getPrototypeOf(this).constructor.name);
        this.log('New instance initialized with args: %j', args);
    }

    /** Useful when args must be modified after super() call, e.g. Command class */
    set args(args){ this._args = args; }
    get args(){ return this._args; }

    /**
     * Runs a concrete Diviner instance's logic after validating/gathering all required inputs
     * @returns {Promise<any>}
     */
    async run(){
        this.log('Starting run() in %s mode', this.args.interactive ? 'interactive' : 'non-interactive');
        // init chalk for all instances
        this.chalk = await require('../utils/logging/chalk-cjs')();
        // invoke parent handler for 'called' lifecycle
        await this._handleLifecycleEvent('called', this);
        // prerun lifecycle
        await this.preRun();
        // prompt if interactive
        if(this.args.interactive){
            const generator = this.getPrompts(); 
            let prompts = await generator.next();
            while(!prompts.done){
                const answers = await prompt(prompts.value);
                Object.assign(this.args, answers);
                prompts = await generator.next();
            }
        }
        // check readyStatus and conditionally exit
        const readyStatus = await this.readyToExecute();
        if(typeof readyStatus === 'string'){
            console.error(this.chalk.bgRed(`Unable to execute due to following error: ${readyStatus}`));

            process.exit(1);
        }
        // get result
        try{
            const result = await (this.args.interactive ? this.executeInteractive() : this.execute());
            // trigger 'done' lifecycle event
            await this._handleLifecycleEvent('done', result);
            // call the runResolver, which will be set when the instance has been wrapped by DivinerPromise.eagerRelay
            this.runResolver(result);
            // lastly, return the result in the event that the Diviner was executed directly (such as util diviners)
            return result;
        } catch(err){
            // trigger 'error' lifecycle event
            await this._handleLifecycleEvent('error', err);
            // always reject own DivinerPromise on error
            this.runRejector(err);

            console.error(err.message);
        }

    }

    /**
     * Should be called internally when one Diviner needs to relay execution to another in interactive mode. This
     * is prefereable to instantiating and calling run() on a Diviner directly because it allows the instantiator
     * (parent) to be registered as the parent and receive lifecycle events of the new (child) Diviner. This way
     * children can be handled the same way in both interactive and non-interactive (cli) modes.
     * @param {{ function(argObj: object): Diviner }} divinerInit the Diviner's wrapper function
     * @returns {DivinerPromise} 
     */
    relayInteractive(divinerInit){
        return this._relay(divinerInit(this.args), this);
    }

    /**
     * Called before run() to allow commands to perform setup as necessary
     */
    async preRun(){ /** subclasses MAY implement */ }
    
    /**
     * Returns true when all Diviner has all necessary data to execute() or an error string, when it does not
     * @returns {Promise<boolean|string>}
     */
    async readyToExecute(){ this._throwNotImplemented('readyToExecute()'); }

    /**
     * The prompts used by the Diviner when in interactive mode to get necessary data for run()
     * @yields {Array<Question>} GeneratorFunction that returns an Array<Question> 
     * when it needs more info from the user. Calls to next() yield a new array until all info is gathered.
     * All answers will be assigned as instance properties during run();
     */
    async *getPrompts(){ this._throwNotImplemented('*getPrompts()'); }

    async executeInteractive(){ this._throwNotImplemented('executeInteractive'); }
    
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
     */
    async handleSubDivinerEvent(evt, payload, diviner){
        /** MUST be implemented by subclass IF getSubDiviners() is implemented */
    }
}

module.exports = Diviner