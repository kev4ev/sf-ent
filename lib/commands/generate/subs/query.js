const CommandReturningSubrequest = require('./CommandReturningSubrequest');
const { getFieldPrompts, getObjectPrompts, symbols } = require('../../../utils/prompts/schemaPrompts');
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
        // get sobject for query
        yield this.promptFactory(...(await getObjectPrompts()));
        // add selected sobject as the referenceId prefix
        this.referenceIdPrefix = this.sobject;
        // template query
        const OPTIONAL = 'filters (optional)';
        yield this.promptFactory(
            KeyBoundPrompt({
                message: 'Enter your query',
                name: 'query',
                type: 'snippet',
                required: true,
                footer: () => this.chalk.yellow('include symbols ! , @ for schema and referenceId assist, respectively'),
                template: `SELECT \${fields} FROM ${this.sobject} \${filters}`,
                fields: [ 
                    { name: 'sobject' }, 
                    { name: 'fields' }, 
                    { name: 'filters', initial: OPTIONAL} 
                ],
                format(val){
                    if(val?.values?.filters === OPTIONAL){
                        val.values.filters = '';
                        val.result = val.result.replace(OPTIONAL, '').trim();
                    }

                    return val;
                }
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
                            forceConnection: true,
                            removeSelected: true,
                            getHandler: async (field) => {
                                field === Symbol.keyFor(symbols.done) ? 
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
        );
        // reset this.query in event it was set to an object
        if(typeof this.query === 'object' && this.query?.result) this.query = this.query.result;
    }

    async readyToExecute(){
        return this.query ? true : 'Need query to execute';
    }
    
    async finish(){
        return new this.subrequestTypes.query(this.referenceId, this.query);
    }
}

/**
 * 
 * @param {string} query 
 * @returns 
 */
module.exports = Query;