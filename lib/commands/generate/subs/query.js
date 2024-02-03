const SubCommand = require("../../../types/SubCommand");
const composite = require('../../../api/composite');

/**
 * @typedef {import('../../../types/Diviner').DivinerArgs & { query: string }} QueryArgs
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

    async readyToExecute(){
        return this.args.query || this.query ? true : 'Need query to execute';
    }

    async *getPrompts(){
        /** @type {import("../../../types/Diviner").Question} */
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

    async executeInteractive(){
        return this.query;
    }
    
    async execute(){
        return this.query;
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