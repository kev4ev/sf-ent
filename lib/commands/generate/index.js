const Command = require('../../types/command/Command');
const { resolve } = require('node:path');
const subcommands = require('./subs');
const { request } = require('../../api/composite')();
const { writeFile } = require('node:fs/promises');
const { join } = require('path');
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
        if(this.out){
            this ._out = this._resolvePath(this?.out);
        }
    }
    
    /** @returns {import('../../types/command/CommandFlagConfig').FlagConfig} */
    static get flagConfig(){
        return {
            allOrNone: {
                description: 'allOrNone for the generated request; defaults to true',
                initial: true
            },
            collateSubrequests: {
                description: 'collateSubrequests for the generated request; defaults to false',
                initial: false
            },
            out: {
                alias: 'd',
                description: 'output directory for the generated file; required unless no-out is passed',
            },
            'no-out': {
                alias: 'O',
                description: 'no file will be generated and generated request will be written to stdout'
            },
            suffix: {
                description: 'suffix for generated files that will be used in place of datestamp'
            },
            teardown: {
                alias: 't',
                description: 'when true, a teardown file will be created in the same directory as the import file',
                bool: true
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

    async *getPrompts(){
        yield this.promptFactory(
            {
                name: 'out',
                message: 'Enter directory path for generated file(s)',
                type: 'input',
                initial: this._out,
                required: !this['no-out'],
                skip: this['no-out'],
                onSubmit: (name, value) => {
                    this._out = this._resolvePath(value);
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
            const outpath = join(this._out, `compositeRequest.${this.suffix || Date.now()}.json`);
            await writeFile(outpath, resultStr, 'utf-8');
            console.log(this.chalk.yellow(`Composite request generated:\n${outpath}`));
        } else{
            console.log(this.chalk.cyan(resultStr));
        }
        
        this.doneResolver(result);
    }
}

module.exports = Generate;