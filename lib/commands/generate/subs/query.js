const SubCommand = require("../../../types/command/SubCommand");
const { query } = require('../../../api/composite')().subrequests;

class Query extends SubCommand{
    /**
     * @constructor
     * @param  {string} query
     */
    constructor(query){
        super();
        this.query = query;
    }

    async *getPrompts(){
        /** @type {import("../../../types/command/Diviner").Question} */
        let prompts = [
            {
                message: 'Enter your query',
                name: 'query',
                type: 'input',
                required: true
            }
        ];
        yield prompts;
    }

    async readyToExecute(){
        return this.query || this.query ? true : 'Need query to execute';
    }

    async executeInteractive(){
        return new query('refId', this.query); // TODO implement real refid
    }
    
    async execute(){
        return new query('refId', this.query); // TODO implement real refid
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