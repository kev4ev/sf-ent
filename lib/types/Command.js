const Diviner = require('./Diviner');

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
     * @argument {import('jsforce').Connection} connection an authorized JSForce Connection object
     * @argument {import('./Diviner').DivinerArgs} args command-specific arguments
     */
    constructor(connection, args){
        super(args);
        this.connection = connection;
        this.apiVersion = connection?.version;
    }

    /**
     * @returns {CommandFlagConfig}
     */
    static get flagConfig(){ /** commands that accept flags must implement */ }
}

module.exports = Command;

/** 
 * Including this tag enables typedefs and top-level vars to be "exported" as type info
 * @module 
 */

/**
 * @typedef {object} FlagConfig
 * @property {string} alias an allowable alias for this flag
 * @property {boolean} required when true, flag value must be passed upon invocation
 * @property {any} initial default value; when present, required cannot be true
 */

/**
 * @typedef {Object.<string, FlagConfig>} CommandFlagConfig
 */