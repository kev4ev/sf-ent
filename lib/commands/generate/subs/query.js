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
    }

    async readyToExecute(){
        return this.args.query;
    }

    async *getPrompts(){
        /** @type {import("../../../types/Diviner").Question} */
        let prompts = [
            {
                message: 'Enter your query',
                name: query,
                type: 'input',
                required: true
            }
        ];
        yield prompts;
    }
    
    async execute(){
        
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