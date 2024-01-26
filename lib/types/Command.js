/** @module */

const { Diviner } = require('./Diviner');
const { mergeArgs } = require('./CommandFlagConfig');

/**
 * @typedef {import('./Diviner').DivinerArgs & { connection: import('jsforce').Connection }} CommandArgs
 */

/**
 * A sf-entish Command. A command can be called directly from the command-line, as opposed
 * to a SubCommand which is only available in the CLI as a prompt from within a Command.
 * ```
 * const cmd = new Command(connection, args);
 * ```
 */
class Command extends Diviner{
    /**
     * @constructor
     * @argument {CommandArgs} args command-specific arguments
     */
    constructor(args){
        super();
        // merge static config with runtime args
        this.args = mergeArgs(Object.getPrototypeOf(this).constructor.flagConfig, args);
        this.connection = args.connection;
    }

    /**
     * @returns {CommandFlagConfig}
     */
    static get flagConfig(){ /** commands that accept flags must implement */ }
}

module.exports = Command;