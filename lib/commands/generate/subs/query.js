const CommandReturningSubrequest = require('./SubRequest');
const { getFieldPrompts, symbols } = require('../../../utils/prompts/fieldSelect');
const assister = require('../../../utils/sf/schemaAssist');
const KeyBoundPrompt = require('../../../utils/prompts/KeyBoundPrompt');

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
        const result = async (value, state, item, index) => {
            return 'potato';
        }

        const boundPrompt = KeyBoundPrompt(
            {
                message: 'Enter your query',
                name: 'query',
                type: 'snippet',
                required: true,
                footer: () => this.chalk.yellow('Enter ! to select fields, @ to reference another request...'),
                template: `SELECT \${fields} FROM \${sobject} \${filters}`,
                fields: [
                    { name: 'sobject', result },
                    { name: 'fields', result },
                    { name: 'filters', result }
                ]
            },
            {
                '!': async function(prompt, keypress){

                    return 'potatoes';
                }
            }
        );

        /** @type {import("../../../types/command/Diviner").Question} */
        let prompts = [ boundPrompt ];
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