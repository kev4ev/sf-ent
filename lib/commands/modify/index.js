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

    get requiresConnection(){ return false; }
    
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
            const absPath = resolve(process.cwd(), path);
            this._in = absPath;

            return absPath;
        } catch(err){
            const msg = `Could not resolve input path: ${path}`;
            console.error(this.chalk.bgRed(msg));
    
            if(!this.interactive) process.exit(1);

            return new Error(msg);
        }
    }

    async *getPrompts(){
        /** @type {import('../../types/command/Diviner').Question} */
        let prompts = [
            {
                name: 'in',
                message: 'Enter path to existing request JSON file',
                type: 'input',
                initial: this._in,
                skip: this.currentOnly,
                validate: (value) => {
                    if(value){
                        const result = this.#resolvePath(value);
                        
                        return result instanceof Error ? result.message : true;
                    }

                    return false;
                }
            }
        ];
        yield prompts;
        // parse the input file if necessary
        if(!this.currentOnly) parse(require(this._in));

        // get a live (writeable) reference, omitting top-level keys
        this.#parsedRegistry = Object.values(getRegistry(false)).reduce((prev, curr) => {
            if(curr){
                const { items } = curr;
                Object.entries(items).forEach(entry => {
                    if(entry){
                        const [ refId, body ] = entry;
                        prev[refId] = body;
                    }
                });
            }

            return prev;
        }, {});
        
        // in all cases, prompt user to select the reference to modify
        prompts = await refPrompt(undefined, false);
        yield prompts;

        // create snippet template based on selected referenceId
        const toModify = this.#parsedRegistry[this.referenceId],
            fields = [ ],
            aggregator = (target, depthKey) => {
                return Object.entries(target).reduce((prev, curr) => {
                    if(curr){
                        const [ key, value ] = curr;
                        if(key === 'referenceId'){
                            prev[key] = value; // not editable
                        } else if(value){
                            if(typeof value === 'object'){
                                prev[key] = aggregator(value, key);
                            } else{
                                const aggKey = depthKey ? `${depthKey}.${key}` : key;
                                prev[key] = `\${${aggKey}}`;
                                fields.push({ 
                                    name: aggKey, 
                                    message: value, 
                                    initial: value 
                                });
                            }
                        }
                    }
    
                    return prev;
                }, {});
            },
            templateObj = aggregator(toModify),
            template = JSON.stringify(templateObj, undefined, 2);
        prompts = [
            {
                name: 'modified',
                message: 'Make modifications and hit <enter>',
                required: false,
                type: 'snippet',
                template,
                fields,
                result(state){
                    if(state?.values){
                        // if any values changed in template, update back to the live request
                        Object.entries(state.values).forEach(entry => {
                            if(entry){
                                const [ key, value ] = entry;
                                const { initial } = fields.filter(({ name }) => name === key)[0];
                                if(initial !== value){
                                    const propPath = key.split('.');
                                    let target = toModify;
                                    while(propPath.length > 1){ // get to the last property in path
                                        target = target[propPath.shift()];
                                    }
                                    // finally, set the field
                                    target[propPath.shift()] = value;
                                }
                            }
                        });
                    }
                }
            }
        ];
        yield prompts;
    }

    async readyToExecute(){
        return this._in || this.currentOnly ? true : 'Output path must be provided';
    }

    async executeInteractive(){
        return await this.execute();
    }

    async execute(){
        this.done();
        this.doneResolver(undefined);
    }
}

module.exports = Modify;