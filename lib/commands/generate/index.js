const Command = require('../../types/command/Command');
const { resolve } = require('node:path');
const subcommands = require('./subs');

/**
 * @typedef {import('../../types/command/Command').CommandArgs & { out: string }} GenerateArgs
 */

class Generate extends Command{

    #_request = [];

    /**
     * @constructor
     * @param {GenerateArgs} args
     */
    constructor(args){
        super(args);
        Object.defineProperties(this, {
            _resolvePath: {
                value: function(out){
                    try{
                        const path = resolve(process.cwd(), out);
                
                        return path;
                    } catch(err){
                        console.error(this.chalk.bgRed(`Could not resolve output path: ${value}`));
                
                        process.exit(1);
                    }
                }
            }
        });
        this._out = this._resolvePath(this?.out);
    }
    
    /** @returns {import('../../types/command/CommandFlagConfig').FlagConfig} */
    static get flagConfig(){
        return {
            out: {
                description: 'output directory for the genrated file',
                required: true,
                initial: process.cwd()
            },
            teardown: {
                alias: 't',
                description: 'when true, a teardown file will be created in the same directory as the import file',
                bool: true
            },
            prefix: {
                alias: 'p',
                description: 'prefix for generated files'
            }
        }
    }

    static get requiresConnection(){ return true; } // TODO testing only

    async *getPrompts(){
        /** @type {import('../../types/command/Diviner').Question} */
        let prompts = [
            {
                name: 'out',
                message: 'Enter directory path for generated file(s)',
                type: 'input',
                initial: this._out,
                required: true,
                onSubmit: (name, value) => {
                    this._out = this._resolvePath(value);
                }
            }
        ];
        yield prompts;
    }

    async readyToExecute(){
        return this._out ? true : 'Output path must be provided';
    }

    getSubDiviners(){
        return subcommands;
    }

    /**
     * 
     * @param {string} evt 'called' or 'done'
     * @param {object} payload the subrequest payload to serialize
     * @param {import('../../types/command/SubCommand')} diviner 
     */
    async handleSubDivinerEvent(evt, payload, diviner){
        switch (Object.getPrototypeOf(diviner)?.constructor?.name?.toLowerCase()){
            case 'query':
                if(evt === 'done'){
                    this.#_request.push(payload);
                }
                break;
        
            default:
                break;
        }

        if(evt === 'done' && this.allSubsFinished){
            this.doneResolver(this.#_request); // todo actual output
        }
    }
}

/**
 * 
 * @param {GenerateArgs} args 
 * @returns 
 */
module.exports = (args) => {
    return new Generate(args);
}