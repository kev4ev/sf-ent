const commands = require('./lib/commands');
const Command = require('./lib/types/command/Command');
const relay = require('./lib/types/command/DivinerPromise');
const connect = require('./lib/utils/diviners/Connect');

class Ent extends Command{
    /**
     * @param {import('./lib/types/command/Command').CommandArgs} args
     * @param {string} [topCmd] only valid when provided from command line
     */
    constructor(args, topCmd){
        super(args);
        this.topCmd = topCmd;
        Object.defineProperties(this, {
            _hasAuthConnection: {
                value: () => this.connection && this?.connection?.accessToken
            }
        });
        // if there is not an authorized connection, add the Promise to the this so that
        // relayed Diviners inherit it; it will be resolved by this class during execution
        if(!this._hasAuthConnection()){
            let resolver, rejecter;
            const connPromise = new Promise((res, rej) => {
                resolver = res;
                rejecter = rej;
            });
            this.connection = connPromise;
            Object.defineProperties(this, {
                _connResolver: { value: resolver },
                _connRejecter: { value: rejecter }
            });
        }
    }

    getSubDiviners(){
        return commands;
    }

    async *getPrompts(){
        yield [
            {
                name: 'topCmd',
                type: 'select',
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
            const cmdWrapper = commands[topCmd];
            // if cmd requires a JSForceConnection, establish and await it
            if(cmdWrapper.requiresConnection && !this._hasAuthConnection()) await this.relay(connect);

            // return relay so that this will be registered as parent and cmd's lifecycle events will be fired to handler
            return await this.relay(cmdWrapper);
        }

        throw new Error('Command could not be inferred');
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
        if(evt === 'called' && cmd.requiresConnection && !this._hasAuthConnection()){
            await this.relay(connect);
        }

        if(evt === 'done' && isConnect){
            this._connResolver(payload);
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

module.exports = {
    ent: initEnt,
    flagConfig: Ent.flagConfig
}