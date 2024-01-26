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
     * @param {import('jsforce').Connection} [connection]
     */
    constructor(args, connection){
        super();
        this.connection = connection;
        // merge static config with runtime args
        this.args = mergeArgs(Object.getPrototypeOf(this)?.constructor?.flagConfig || Command.flagConfig, args);
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
}

module.exports = Command;