/** @module */

const Diviner = require('./Diviner');
const { mergeArgs } = require('./CommandFlagConfig');

/**
 * @typedef {import('./Diviner').DivinerArgs & { connection: import('jsforce').Connection }} CommandArgs
 */

/**
 * A Command is a Diviner that can be invoked directly from the command-line and passed values via flags. 
 * Unlike standard Diviners, a Command's execution must not complete until done() is called. Thus, subclasses
 * need only implement done() and not execute().
 */
class Command extends Diviner{

    #_done = false; // set to true when done() is called; donePromise cannot be fulfilled when false

    /**
     * @constructor
     * @argument {CommandArgs} args command-specific arguments
     */
    constructor(args){
        super(args);
        this.connection = args.connection;
        // merge static config with runtime args
        this.args = mergeArgs(Object.getPrototypeOf(this)?.constructor?.flagConfig || Command.flagConfig, args);
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
     * All commands must support the interactive flag; extending classes may add additional config as well
     * by shadowing this static getter
     * @returns {import('./lib/types/CommandFlagConfig').FlagConfig}
     */
    static get flagConfig(){
        return {
            interactive: {
                alias: 'i',
                initial: false
            }
        }
    }

    /**
     * Subclasses must override if they need an authenticated JSForceConnection (this.args.connection) to 
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

    /** Allows subclassed to check if the done() method has been called, e.g. during event handling */
    get doneCalled(){
        return this.#_done;
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
     * @returns {Promise<any>}
     */
    async executeInteractive(){
        // prompt user for command to execute
        const { subCmd } = await prompt([
            {
                name: 'subCmd',
                message: `Select next ${Object.getPrototypeOf(this)?.constructor?.name} subcommand:`,
                choices: Object.keys(Object.assign(this.getSubDiviners(), { done: this.done.bind(this) })),
                required: true,
                type: 'select'
            }
        ]);
        // once done is called, terminate recursive execution and return await of _donePromise
        if(subCmd === 'done') return await this._donePromise;

        await this.relay(this.getSubDiviners()[subCmd]);

        // recursive call until done() called
        return await this.executeInteractive();
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