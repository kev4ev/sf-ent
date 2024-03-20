const commands = require('./lib/commands');
const Command = require('./lib/types/command/Command');
const relay = require('./lib/types/command/DivinerPromise');
const { interactive } = require('./lib/types/command/Diviner');

class Ent extends Command{

    /**
     * @param {import('./lib/types/command/Command').CommandArgs} args
     * @param {string} [topCmd] only valid when provided from command line
     */
    constructor(args, topCmd){
        super(args);
        this.topCmd = topCmd;
    }

    getSubDiviners(){
        return commands;
    }

    async *getPrompts(){
        // no additional prompts necessary
    }

    async readyToExecute(){ 
        return !this.interactive || this.topCmd ? true : 'User must provide top-level command';
    }

    async #setConnection(){
        if(!this.connection) await this.getConnection();
    }

    /**
     * 
     * @param {string} evt 'called' or 'done'
     * @param {string} payload result of cmd execution
     * @param {import('./lib/types/command/Command')} cmd
     */
    async handleSubDivinerEvent(evt, payload, cmd){
        // make sure there is an authorized connection for cmds that need it prior to their execution
        if(evt === 'called' && cmd.requiresConnection){
            await this.#setConnection(cmd);
        }

        if(evt !== 'called'){
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
    const ent = Ent.init(args, topCmd);

    return relay(ent);
}
initEnt.interactive = (bool=true) => interactive(bool);

module.exports = {
    ent: initEnt,
    flagConfig: Ent.flagConfig
}