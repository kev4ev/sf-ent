const Command = require('../../types/command/Command');
const { resolve } = require('node:path');
const { writeFile } = require('node:fs/promises');
const { getRegistry, getRegistryArray, parse } = require('../../utils/request/referenceRegistry');
const refPrompts = require('../../utils/prompts/reference');
const { done } = require('../../utils/prompts/symbols');
const { prompt } = require('enquirer');

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
        if(!this.currentOnly){
            yield this.promptFactory(
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
            );
            // parse the input file into registry so it is available via getRegistry()
            this.writeTarget = require(this._in);
            parse(this.writeTarget);
        }

        // get a live (writeable) reference, omitting top-level keys
        this.#parsedRegistry = Object.values(getRegistry(false)).reduce((prev, curr) => {
            if(curr){
                const { itemHash } = curr;
                Object.entries(itemHash).forEach(entry => {
                    if(entry){
                        const [ refId, body ] = entry;
                        prev[refId] = body;
                    }
                });
            }

            return prev;
        }, {});

        // recursively prompt until user is done modifying
        const getRefId = await refPrompts(undefined, false);
        while(this.nextAction !== Symbol.keyFor(done)){
            // in all cases, prompt user to select the reference to modify
            yield this.promptFactory(...getRefId);;
    
            // create snippet template based on selected referenceId
            const toModify = this.#parsedRegistry[this.referenceId],
                /** @type {import('../../utils/prompts/factory').Question[]} */
                fields = [ ],
                aggregator = (target, depthKey) => {
                    return Object.entries(target).reduce((prev, curr) => {
                        if(curr){
                            const [ key, value ] = curr;
                            if(['method', 'referenceid'].includes(key?.toLowerCase?.())){ // not editable
                                prev[key] = value; 
                            } else if(value){
                                if(typeof value === 'object'){
                                    prev[key] = aggregator(value, key);
                                } else{
                                    const aggKey = depthKey ? `${depthKey}.${key}` : key;
                                    prev[key] = `\${${aggKey}}`;
                                    fields.push({ 
                                        name: aggKey, 
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
            // prompt for modification
            const EDIT = '*';
            yield this.promptFactory(
                {
                    name: 'modified',
                    message: `Set any field to ${EDIT} and hit <Enter> to modify it`,
                    required: false,
                    type: 'snippet',
                    template,
                    fields,
                    result: async (state) => {
                        if(state?.values){
                            // if any values changed in template, update back to the live request
                            for(let entry of Object.entries(state.values)){
                                if(entry){
                                    let [ key, value ] = entry;
                                    const { initial } = fields.filter(({ name }) => name === key)[0];
                                    // interactive modify
                                    if(value === EDIT){
                                        const answers = await prompt(
                                            this.promptFactory({
                                                name: 'mod',
                                                type: 'input',
                                                initial,
                                                message: 'Edit the field and hit <Enter> to save',
                                                onCancel: () => initial
                                            })
                                        );
                                        value = answers.mod;
                                        // update it
                                        const propPath = key.split('.');
                                        let target = toModify;
                                        while(propPath.length > 1){ // get to the last property in path
                                            target = target[propPath.shift()];
                                        }
                                        // finally, set the field
                                        target[propPath.shift()] = value;
                                    }
                                }
                            }
                        }
                    }
                }
            );
            // ask user what next
            yield this.promptFactory(
                {
                    name: 'nextAction',
                    message: 'What now?',
                    type: 'autocomplete',
                    choices: [ Symbol.keyFor(done), 'Modify another' ],
                    required: true
                }
            );
        }

        if(!this.currentOnly){
            const WRITE_NOW = 'Yes, write immediately',
                WAIT = 'No, do not write yet', 
                choices = [ WRITE_NOW, WAIT ];
            yield this.promptFactory(
                {
                    name: 'writeToFile',
                    message: `Ready to update ${this._in}?`,
                    type: 'autocomplete',
                    choices
                }
            );
            if(this.writeToFile === WRITE_NOW){
                this.writeTarget.compositeRequest = getRegistryArray();
                await writeFile(this._in, JSON.stringify(this.writeTarget, undefined, 4), 'utf-8');
            }
        }
    }

    async readyToExecute(){
        return this._in || this.currentOnly ? true : 'Input path must be provided';
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