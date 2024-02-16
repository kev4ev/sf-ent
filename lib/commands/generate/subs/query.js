const SubCommand = require("../../../types/command/SubCommand");
const { query } = require('../../../api/composite')().subrequests;

/**
 * @typedef {import('../../../types/command/Diviner').DivinerArgs & { query: string }} QueryArgs
 */

class Query extends SubCommand{
    /**
     * @constructor
     * @param  {QueryArgs} argObj
     */
    constructor(argObj){
        super(argObj);
        this.query = argObj.query;
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
        return this.args.query || this.query ? true : 'Need query to execute';
    }

    async executeInteractive(){
        return new query('refId', this.args.query); // TODO implement real refid
    }
    
    async execute(){
        return new query('refId', this.args.query); // TODO implement real refid
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