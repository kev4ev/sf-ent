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
 */
class Command extends Diviner{

    // donePromise cannot be fulfilled when false; done() sets to true
    #_done = false;

    /**
     * @constructor
     * @argument {CommandArgs} args command-specific arguments hash
     */
    constructor(args){
        super();
        // merge static config with runtime args
        Object.assign(this, mergeArgs(Object.getPrototypeOf(this)?.constructor?.flagConfig || Command.flagConfig, args));
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
    }

    /**
     * Extending commands MAY override if they support flags passed via command line
     * @returns {import('./lib/types/CommandFlagConfig').FlagConfig}
     */
    static get flagConfig(){
        return { };
    }

    /**
     * Subclasses must override if they need an authenticated JSForceConnection (this.connection) to 
     * complete execution.
     * @returns {boolean} 
     */
    static get requiresConnection(){
        return false;
    }

    /**
     * Just an instance version that returns the static value for convenience
     */
    get requiresConnection(){
        return Object.getPrototypeOf(this).constructor.requiresConnection;
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
     * @param {number} [iteration=0] for internal use only (recursively)
     * @returns {Promise<any>}
     */
    async executeInteractive(iteration=0){
        // add mock Diviner to meta as called count needs to be manipulated in interactive mode
        const mock = new class InteractiveOffset extends Diviner{ }(),
            mockName = Object.getPrototypeOf(mock).constructor.name;
        if(iteration === 0) this.subdivinerMeta.called.push(mockName);
        // prompt user for command to execute
        const { subCmd } = await prompt([
            {
                name: 'subCmd',
                message: 'Select next command:',
                choices: Object.keys(Object.assign(this.getSubDiviners(), { done: this.done.bind(this) })),
                required: true,
                type: 'select'
            }
        ]);
        // once done is called, invoke done() and return _donePromise to terminate recursive execution
        if(subCmd === 'done'){ // TODO a bit hacky - cleaner way?
            this.done();
            this.subdivinerMeta.done.push(mockName);
            this.handleSubDivinerEvent('done', mock, mock);

            return await this._donePromise;
        }

        // relay to select cmd / subcmd
        await this.relay(this.getSubDiviners()[subCmd]);

        // recursive call until done() called
        return await this.executeInteractive(iteration += 1);
    }

    /**
     * Method must be invoked either by caller (non-interactive mode) or internally (interactive mode) 
     * to complete a Command's execution.
     */
    done(){
        /** subclasses implementing getSubDiviners() MUST add this method to the hash returned by it */
        this.#_done = true;
    }
}

module.exports = Command;