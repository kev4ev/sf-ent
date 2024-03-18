const Command = require('../../types/command/Command');
const { resolve } = require('node:path');
const { writeFile } = require('node:fs/promises');
const { getRegistry, parse } = require('../../utils/request/referenceRegistry');
const refPrompt = require('../../utils/prompts/reference');

/**
 * @typedef {import('../../types/command/Command').CommandArgs & { in: string, out: string }} ModifyArgs
*/

class Modify extends Command{

    #parsedRegistry;

    /**
     * @constructor
     * @param {ModifyArgs} args
     * @param {boolean} [currentOnly=false] when true and in interactive mode, will not prompt user for input file
     */
    constructor(args, currentOnly=false){
        super(args);
        this.currentOnly = currentOnly;
        if(this.in)this.#resolvePath(this.in);
    }
    
    /** @returns {import('../../types/command/CommandFlagConfig').FlagConfig} */
    static get flagConfig(){
        return {
            in: {
                alias: 'i',
                description: 'allOrNone for the generated request; defaults to true',
                required: true // required when invoked directly from command line but not otherwise
            },
            out: {
                description: 'path of file to write modified request; defaults to the input file to overwrite'
            }
        }
    }

    static interactiveMeta(){
        return {
            name: 'Modify',
            hint: 'modify an existing composite request'
        };
    }

    #resolvePath(path){
        try{
            const path = resolve(process.cwd(), path);
    
            this._in = path;
        } catch(err){
            console.error(this.chalk.bgRed(`Could not resolve input path: ${path}`));
    
            process.exit(1);
        }
    }

    async *getPrompts(){
        /** @type {import('../../types/command/Diviner').Question} */
        let prompts = [
            {
                name: 'in',
                message: 'Enter path to composite request .json file',
                type: 'input',
                initial: this._in,
                skip: this.currentOnly,
                onSubmit: (name, value) => {
                    this.#resolvePath(value);
                }
            }
        ];
        yield prompts;
        // parse the input file if necessary
        if(!this.currentOnly) parse(require(this._in));

        this.#parsedRegistry = getRegistry(false); // get a live (writeable) reference
        
        // in all cases, prompt user to select the reference to modify
        prompts = [ await refPrompt(undefined, false) ];
        yield prompts;

        // TODO yield snippet to edit the request
        debugger;
    }

    async readyToExecute(){
        return this._in || this.currentOnly ? true : 'Output path must be provided';
    }

    async executeInteractive(){
        return await this.execute();
    }

    async execute(){

    }
}

module.exports = Modify;