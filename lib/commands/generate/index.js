const Command = require('../../types/Command');
const { resolve } = require('node:path');
const subcommands = require('./subs');
const composite = require('../../api/composite');
const { prompt } = require('enquirer');

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

    static get requiresConnection(){ return true; } // TODO testing only

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

    async readyToExecute(){
        return this._out ? true : 'Output path must be provided';
    }

    getSubDiviners(){
        return subcommands;
    }

    async executeInteractive(){
        // prompt user for command to execute
        const { subCmd } = await prompt([
            {
                name: 'subCmd',
                message: 'Select Composite API Subrequest to add to request',
                choices: Object.keys(Object.assign(this.getSubDiviners(), { done: this.done })),
                required: true,
                type: 'select'
            }
        ]);
        if(subCmd === 'done') return await this.done();

        await this.relayInteractive(this.getSubDiviners()[subCmd]);

        // recursive call until done() called
        return await this.executeInteractive();
    }

    /**
     * 
     * @param {string} evt 'called' or 'done'
     * @param {object} payload the subrequest payload to serialize
     * @param {import('../../types/SubCommand')} diviner 
     */
    async handleSubDivinerEvent(evt, payload, diviner){
        if(evt === 'done'){
            debugger;
        }
    }

    async done(){
        // todo write 
        debugger;
        // this.doneResolver('a value');
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