const Command = require('../../types/command/Command');
const { dirname, basename, resolve, join } = require('node:path');
const subcommands = require('./subs');
const { request } = require('../../api/composite')();
const { writeFile } = require('node:fs/promises');
const { getRegistryArray  } = require('../../utils/request/referenceRegistry');

/**
 * @typedef {import('../../types/command/Command').CommandArgs & { out?: string }} GenerateArgs
 */

class Generate extends Command{

    /**
     * @constructor
     * @param {GenerateArgs} args
     */
    constructor(args){
        super(args);
        if(this.out) this.#resolvePath(this.out);
    }
    
    /** @returns {import('../../types/command/CommandFlagConfig').FlagConfig} */
    static get flagConfig(){
        return {
            allOrNone: {
                description: 'allOrNone for the generated request; defaults to true',
                initial: true,
                bool: true
            },
            collateSubrequests: {
                description: 'collateSubrequests for the generated request; defaults to false',
                initial: false,
                bool: true
            },
            out: {
                char: 'f',
                description: 'relative path of output directory or file; if file must include .json file suffix',
            },
            'no-out': {
                char: 'O',
                description: 'no file will be generated and generated request will be written to stdout'
            },
            suffix: {
                description: 'suffix for generated files that will be used in place of datestamp'
            }
        }
    }

    static interactiveMeta(){
        return {
            name: 'Generate',
            hint: 'create a new composite API request'
        };
    }

    get #subrequests(){
        // always rely on registry for request bodies rather than storing local
        return getRegistryArray();
    }

    /**
     * 
     * @param {string} out relative path to a directory or file to which generated request will be written
     * @returns {boolean} returns true if path is valid; false if not
     */
    #resolvePath(out){
        const base = basename(out),
            fname = base.endsWith('.json'),
            dir =  fname ? dirname(out) : base,
            joined = join(process.cwd(), dir);
        
        try{
            resolve(joined);
            this._out = join(joined, fname ? base : `compositeRequest.${this.suffix || Date.now()}.json`);

            return true;
        } catch(err){
            console.error(this.chalk.bgRed(`Could not resolve directory: ${joined}`));
    
            if(this.interactive) return false; 
            
            process.exit(1); // exit when non-interactive
        }
    }

    async *getPrompts(){
        yield this.promptFactory(
            {
                name: 'out',
                message: 'Enter directory path for generated file(s)',
                type: 'input',
                initial: this._out,
                required: !this['no-out'],
                skip: this['no-out'],
                validate: (value) => {
                    return value ? this.#resolvePath(value) : false;
                }
            }
        );
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
        const divinerName = diviner?.name?.toLowerCase();
        if(evt === 'called'){
            switch(divinerName){
                case 'preview':
                    diviner.generateState = request(this.#subrequests, this.allOrNone, this.collateSubrequests);
                    break;
                case 'modify':
                    diviner.currentOnly = true;
                    break;
                default:
                    break;
            }
        }
        // handle resolution
        if(evt === 'done'){
            if(this.readyToResolve){
                return await this.#finalize();
            }
        }
    }

    async #finalize(){
        const result = request(this.#subrequests, this.allOrNone, this.collateSubrequests),
            resultStr = JSON.stringify(result, undefined, 4);
        // write file if outpath
        if(this._out){
            await writeFile(this._out, resultStr, 'utf-8');
            console.log(this.chalk.yellow(`Composite request generated:\n${this._out}`));
        } else{
            console.log(this.chalk.cyan(resultStr));
        }
        
        this.doneResolver(result);
    }
}

module.exports = Generate;