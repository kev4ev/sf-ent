const CommandReturningSubrequest = require('./SubRequest');
const { getFieldPrompts, symbols } = require('../../../utils/prompts/fieldSelect');
const refPrompt = require('../../../utils/prompts/reference');
const KeyBoundPrompt = require('../../../utils/prompts/KeyBoundPrompt');
const enquirer = require('enquirer');

class Query extends CommandReturningSubrequest{

    /**
     * @constructor
     * @param  {string} query
     */
    constructor(query){
        super();
        this.query = query;
    }

    static interactiveMeta(){
        return {
            name: 'Query',
            hint: 'create a query subrequest'
        };
    }

    async *getPrompts(){

        /** @type {import("../../../types/command/Diviner").Question} */
        let prompts = [
            {
                message: 'Enter SObject',
                name: 'sobject',
                type: 'input',
                required: true,
                footer: () => this.chalk.yellow('Enter ! to view list')
            }
        ];
        yield prompts;
        prompts = [
            KeyBoundPrompt({
                message: 'Enter your query',
                name: 'query',
                type: 'snippet',
                required: true,
                footer: () => this.chalk.yellow('include symbols ! , @ for schema and referenceId assist, respectively'),
                template: `SELECT \${fields} FROM ${this.sobject} \${filters}`,
                fields: [ { name: 'sobject' }, { name: 'fields' }, { name: 'filters' } ]
            },
            {
                '@': async (state, input) => {
                    const { referenceId } = await enquirer.prompt(refPrompt(this.referenceId));

                    return referenceId;
                },
                '!': async (state, input) => {
                    input = '';
                    let done;
                    const fieldPrompt = await getFieldPrompts(
                        this.sobject, 
                        { 
                            removeSelected: true,
                            getHandler: async (field) => {
                                field === symbols.done.description ? 
                                    done = true : 
                                    input += `${input.length > 0 ? ', ' : ''}${field}`;
                            }
                        }
                    );
                    
                    while(!done){
                        await enquirer.prompt(fieldPrompt);
                    }

                    return input;
                }
            })
        ];
        yield prompts;
    }

    async readyToExecute(){
        return this.query ? true : 'Need query to execute';
    }
    
    async finish(){
        return new this.subrequestTypes.query(this.referenceId, this.query.result);
    }
}

/**
 * 
 * @param {string} query 
 * @returns 
 */
module.exports = Query;