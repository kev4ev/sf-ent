const Command = require('../../types/Command');
const { resolve } = require('node:path');

/**
 * @typedef {import('../../types/Command').CommandArgs & { out: string }} GenerateArgs
 */

class Generate extends Command{
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
        this._out = this._resolvePath(this.args?.out);
    }
    
    /** @returns {import('../../types/CommandFlagConfig').FlagConfig} */
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

    async readyToExecute(){
        // always prompt once in interactive mode
        this.checkCtr = !this.checkCtr ? 1 : this.checkCtr + 1;
        if(this.args.interactive && this.checkCtr < 2) return false; 
    }

    async *getPrompts(){
        /** @type {import('../../types/Diviner').Question} */
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

    async execute(){
        return 'todo';
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