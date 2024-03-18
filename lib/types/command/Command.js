/** @module */
const { prompt } = require('enquirer');
const Diviner = require('./Diviner');
const { mergeArgs } = require('./CommandFlagConfig');

/**
 * @typedef {object} CommandArgs
 * @property {import('jsforce').Connection} [connection] an authorized JSForce Connection
 */

/**
 * Unlike standard Diviners, a Command's execution must not complete until done() is called. Subclasses will 
 * generally not call done() directly, but will call doneResolver or doneRejecter during event handling.
 * A subclass is easy to expose via command-line as executeInteractive() is implemented in this base class
 * and handles chaining of subdiviners automatically.
 * @class
 */
class Command extends Diviner{

    // donePromise cannot be fulfilled when false; done() sets to true
    #_done = false;

    /**
     * @constructor
     * @argument {CommandArgs} args command-specific arguments hash
     */
    constructor(args={}){
        super();
        // merge static config with runtime args
        Object.assign(this, mergeArgs(
            [ Command.flagConfig, Object.getPrototypeOf(this)?.constructor?.flagConfig || {} ], 
            [ args ]
        ));
        // create Promise with externalized resolver/rejecter fns that will ensure done() has been called
        function doneChecker(fulfillmentFn){
            const wrapper = function(resultOrErr){
                const name = Object.getPrototypeOf(this)?.constructor?.name;
                if(!this.#_done){
                    this.log(this.chalk.bgRed(`${name} has attempted to fulfill donePromise before done() method has been called`));
                    // immediately exit
                    process.exit(1);
                }
                this.log('Closing command as done() has been called.');
                fulfillmentFn(resultOrErr);
            }
            wrapper.bind(this);

            return wrapper;
        }
        const donePromise = new Promise((res, rej) => {
            this.doneResolver = doneChecker(res);
            this.doneRejecter = doneChecker(rej);
        });
        // define non-enumerable property
        Object.defineProperties(this, {
            '_donePromise': {
                value: donePromise
            }
        });
        // ensure getSubDiviners() automatically includes done()
        const own = this.getSubDiviners() || {};
        function doneAppender(){
            const boundDone = this.done.bind(this);
            
            return Object.assign(own, { done: boundDone });
        }
        this.getSubDiviners = doneAppender.bind(this);
    }

    /**
     * Extending commands MAY implement if they support flags passed via command line (interactive mode). 
     * The static flags here are supported for all commands
     * @returns {import('../../types/command/CommandFlagConfig').FlagConfig}
     */
    static get flagConfig(){
        return { 
            'no-assist': {
                alias: 'O',
                description: 'When passed, prompts that would otherwise provide schema-based auto completion will omit them',
                bool: true,
                initial: false
            }
        };
    }

    /**
     * Subclasses MAY override; defaults to true when in interactive mode
     * @returns {boolean} 
     */
    get requiresConnection(){
        return this.interactive;
    }

    /** Convenience attribute to ensure all subdiviners have resolved and done() has been called */
    get readyToResolve(){
        return this.#_done && this.allSubsFinished;
    }

    /**
     * Default non-interactive implementation; return the _donePromise which subclass MUST resolve, 
     * generally in handleSubdivinerEvent(). 
     * 
     * If overridden, subclass MUST return _donePromise.
     * @returns {Promise<any>}
     */
    async execute(){ 
        return await this._donePromise; 
    }

    /**
     * Default interactive implementation; prompts the user for a subcommand and recursively relays execution
     * until done() is called, upon which it returns the _donePromise which subclass MUST resolve, 
     * generally in handleSubdivinerEvent().
     * 
     * If overridden, subclass MUST prompt user with subDiviners + done, and return _donePromise upon selection od 'done'.
     * @param {number} [maxRecursion = -1] for internal use only; limits number of recursive calls, the effect of which
     * is that this.done() is automatically invoked without user action on the nth method recursion
     * @param {number} [iteration = 0] for internal use only (recursively)
     * @returns {Promise<any>}
     */
    async executeInteractive(maxRecursion = -1, iteration = 0){
        // add mock Diviner to meta as called count needs to be manipulated in interactive mode
        const mock = new class InteractiveOffset extends Diviner{ }(), // TODO a bit hacky - cleaner way?
            mockName = Object.getPrototypeOf(mock).constructor.name;
        if(iteration === 0) this.subdivinerMeta.called.push(mockName);
        // prompt user for command to execute
        const { subCmd } = await prompt([
            {
                name: 'subCmd',
                message: `Select next ${Object.getPrototypeOf(this).constructor.name} action:`,
                choices: Object.entries(this.getSubDiviners()).map(entry => {
                    if(entry){
                        const [ key, val ] = entry;
                        const { name, hint } = val?.interactiveMeta?.() || {};
                        
                        return {
                            name: name || key,
                            hint,
                            value: key
                        }
                    }
                }),
                required: true,
                type: 'autocomplete'
            }
        ]);
        // finalizer fn
        const finalizer = async () => {
            this.done();
            this.subdivinerMeta.done.push(mockName);
            // call done event with undefined payload
            this.handleSubDivinerEvent('done', undefined, mock);

            return await this._donePromise;
        }
        // once done is called, invoke done() and return _donePromise to terminate recursive execution
        if(subCmd === 'done'){
            return await finalizer();
        } else{
            // relay to select cmd / subcmd
            await this.relay(this.getSubDiviners()[subCmd]);
            iteration = iteration + 1;
        }

        // recursive call until done() called or maxRecursion is hit
        return iteration === maxRecursion ? 
         await finalizer() : 
         await this.executeInteractive(maxRecursion, iteration);
    }

    /**
     * Method must be invoked either by caller (non-interactive mode) or internally (interactive mode) 
     * to complete a Command's execution.
     */
    done(){
        /** subclasses implementing getSubDiviners() MUST add this method to the hash returned by it */
        this.#_done = true;

        // necessary for DivinerPromise relay used in lib chaining
        return this.parent ? this.parent.runPromise : this.runPromise;
    }
}

module.exports = Command;