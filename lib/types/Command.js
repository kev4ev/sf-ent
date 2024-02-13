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
    /**
     * @constructor
     * @argument {CommandArgs} args command-specific arguments
     */
    constructor(args){
        super(args);
        this.connection = args.connection;
        // merge static config with runtime args
        this.args = mergeArgs(Object.getPrototypeOf(this)?.constructor?.flagConfig || Command.flagConfig, args);
        // create Promise with externalized resolver
        const donePromise = new Promise((res, rej) => {
            this.doneResolver = res;
            this.doneRejecter = rej;
        });
        Object.defineProperty(this, '_donePromise', {
            value: donePromise
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

    async execute(){ return await this._donePromise; }

    /**
     * Method must be invoked either by caller or internally to complete a Command's execution. If done() must
     * be called externally, this method should be added to the Commands subdiviner API in the hash returned
     * by getSubDiviners().
     */
    done(){
        /** subclasses MUST implement and call doneResolver or doneRejecter */
        // this._throwNotImplemented('done');
    }
}

module.exports = Command;