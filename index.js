const commands = require('./lib/commands');
const Command = require('./lib/types/command/Command');
const relay = require('./lib/types/command/DivinerPromise');
const connect = require('./lib/utils/diviners/Connect');
const { interactive } = require('./lib/types/command/Diviner');

class Ent extends Command{

    #topArgs;

    /**
     * @param {import('./lib/types/command/Command').CommandArgs} args
     * @param {string} [topCmd] only valid when provided from command line
     */
    constructor(args, topCmd){
        super(args);
        this.#topArgs = args;
        this.topCmd = topCmd;
    }

    getSubDiviners(){
        return commands;
    }

    async *getPrompts(){
        yield [
            {
                name: 'topCmd',
                type: 'autocomplete',
                required: true,
                skip: this.topCmd,
                choices: Object.keys(this.getSubDiviners()),
                message: 'Select command to execute'
            }
        ];
    }

    async readyToExecute(){ 
        return !this.interactive || this.topCmd ? true : 'User must provide top-level command';
    }  

    async executeInteractive(){
        const { topCmd } = this;
        // interactive mode; relay control to top-level Command and pass connection
        if(topCmd){
            const cmd = commands[topCmd];

            // return relay so that this will be registered as parent and cmd's lifecycle events will be fired to handler
            return await this.relay(cmd, this.#topArgs);
        }

        throw new Error('Command could not be inferred');
    }

    async #setConnection(){
        if(!this.connection){
            const conn = await this.relay(connect);
            Command.connection(conn);
        }
    }

    /**
     * 
     * @param {string} evt 'called' or 'done'
     * @param {string} payload result of cmd execution
     * @param {import('./lib/types/command/Command')} cmd
     */
    async handleSubDivinerEvent(evt, payload, cmd){
        const isConnect = Object.getPrototypeOf(cmd).constructor.name === 'Connect';
        // make sure there is an authorized connection for cmds that need it prior to their execution
        if(evt === 'called' && cmd.requiresConnection){
            await this.#setConnection(cmd);
        }

        if(evt !== 'called' && !isConnect){
            // Ent  must call done() internally as it will never be called externally
            this.done();
            if(evt === 'error') return this.doneRejecter(payload);
        
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
function initEnt(args={}, topCmd){
    const ent = new Ent(args, undefined, topCmd);

    return relay(ent);
}
initEnt.interactive = (bool=true) => interactive(bool);

module.exports = {
    ent: initEnt,
    flagConfig: Ent.flagConfig
}