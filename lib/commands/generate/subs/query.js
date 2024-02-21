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

    get assistMode(){
        return ASSIST_MODE || this.#_assistMode;
    }

    async *getPrompts(){
        const assistEnum = ['always', 'yes - for this query', 'no - for this query', 'never' ]
        /** @type {import("../../../types/command/Diviner").Question} */
        let prompts = [
            {
                message: 'Enable assist mode?',
                name: 'assistModeSelection',
                type: 'select',
                // skip if global or query assist mode already selected
                skip: (ASSIST_MODE !== undefined) || (this.#_assistMode !== undefined),
                choices: [ 'yes - for this query', 'no - for this query', 'always', 'never' ],
                onSubmit: ({ value }) => {
                    if(value === assistEnum[2]) return ASSIST_MODE = true;
                    if(value === assistEnum[3]) return ASSIST_MODE = false;
                    this.#_assistMode = value === assistEnum[0] ? true : false;
                }
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
        return this.query || this.query ? true : 'Need query to execute';
    }

    async executeInteractive(){
        return await this.execute();
    }
    
    async execute(){
        return new this.subrequestTypes.query(this.referenceId, this.query);
    }
}

/**
 * 
 * @param {QueryArgs} argObj 
 * @returns 
 */
module.exports = (argObj) => {
    return new Query(argObj);
}