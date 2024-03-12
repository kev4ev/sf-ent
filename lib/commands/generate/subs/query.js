const CommandReturningSubrequest = require('./SubRequest');

let ASSIST_MODE;

class Query extends CommandReturningSubrequest{

    #_assistMode;

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

    get assistMode(){
        return ASSIST_MODE || this.#_assistMode;
    }

    async *getPrompts(){
        const choices = ['yes - for this query', 'no - for this query', 'always', 'never' ]
        /** @type {import("../../../types/command/Diviner").Question} */
        let prompts = [
            {
                message: 'Enable assist mode?',
                name: 'assistModeSelection',
                type: 'autocomplete',
                // skip if global or query assist mode already selected
                skip: (ASSIST_MODE !== undefined) || (this.#_assistMode !== undefined),
                choices,
                result: (value) => {
                    switch (value) {
                        case choices[0].value:
                            this.#_assistMode = true;
                            break;
                        case choices[1].value:
                            this.#_assistMode = false;
                            break;
                        case choices[2].value:
                            ASSIST_MODE = true;
                            break;
                        case choices[3].value:
                            ASSIST_MODE = false;
                            break;
                        default:
                            break;
                    }
                    
                    return value;
                },
            }
        ];
        yield prompts;
        if(this.assistMode){
            // todo
        } else{
            prompts = [{
                message: 'Enter your query',
                name: 'query',
                type: 'input',
                skip: this.assistMode,
                required: !this.assistMode
            }];
            yield prompts;
        }
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