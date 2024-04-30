const commands = require('./lib/commands');
const Command = require('./lib/types/command/Command');
const relay = require('./lib/types/command/DivinerPromise');
const { interactive } = require('./lib/types/command/Diviner');
const cache = require('./lib/utils/connection/cache');
const Connect = require('./lib/utils/connection/Connect');

/**
 * @typedef {object} EntArgs
 * @property {ConnectionInterface} [connection]
 * @property {Array<ConnectionInterface>} [connections]
 */

class Ent extends Command {

    #cmdArgs;

    /**
     * @param {import('./lib/types/command/Command').CommandArgs & EntArgs} args
     * @param {string} [topCmd] only valid when provided from command line
     */
    constructor(args, topCmd) {
        super(args);
        this.#cmdArgs = args;
        this.topCmd = topCmd?.toLowerCase();
        // handle connections
        const conns = args.connections || [];
        if (args.connection) {
            // add to cache collection
            conns.push(args.connection);
            // set as preferred and initial conn
            Connect.initial = args.connection;
        }
        if (conns.length > 0) {
            cache.setAll(conns);
        }
    }

    /**
     * shadows superclass property so that flags can be retrieved for a subcommand
     * @param {string} subCmd 
     */
    static flagConfig(subCmd) {
        subCmd = subCmd?.toLowerCase?.();
        const match = subCmd ? Object.keys(commands).filter(key => key.toLowerCase() === subCmd)[0] : undefined;

        return match ? commands[match].flagConfig : { /** no ent-specific flags */ };
    }

    getSubDiviners() {
        return commands;
    }

    async *getPrompts() {
        // no additional prompts necessary
    }

    async readyToExecute(){ return true; }

    async #setConnection() {
        if (!this.connection) await this.getConnection();
    }

    async executeInteractive(){
        return await (this.topCmd ? this.relay(commands[this.topCmd], this.#cmdArgs) : super.executeInteractive());
    }

    /**
     * 
     * @param {string} evt 'called' or 'done'
     * @param {string} payload result of cmd execution
     * @param {import('./lib/types/command/Command')} cmd
     */
    async handleSubDivinerEvent(evt, payload, cmd) {
        // make sure there is an authorized connection for cmds that need it prior to their execution
        if (evt === 'called' && cmd.requiresConnection) {
            await this.#setConnection(cmd);
        }

        if (evt === 'error') return this.doneRejecter(payload);
        if (evt === 'done' && this.readyToResolve || (this.topCmd && this.allSubsFinished)){
            // Ent  must call done() internally as it will never be called externally
            this.done();

            this.doneResolver(payload);
        }
    }
}

/**
 * 
 * @param {import('./lib/types/command/Command').CommandArgs} args 
 * @param {string} topCmd if provided, the top-level command to run
 * @returns {DivinerPromise}
 */
function initEnt(args = {}, topCmd) {
    const ent = Ent.init(args, topCmd);

    return relay(ent);
}
initEnt.interactive = (bool = true) => interactive(bool);

module.exports = {
    ent: initEnt,
    flagConfig: Ent.flagConfig
}