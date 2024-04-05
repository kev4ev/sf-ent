const CommandReturningSubrequest = require('../../CommandReturningSubrequest');
const { getFieldPrompts } = require('../../../../../utils/prompts/schemaPrompts');

class SObjectSubrequest extends CommandReturningSubrequest{
    #sobject;

    constructor(){
        super();
        // convenience attributes for subclasses
        this.getFieldPrompts = getFieldPrompts;
    }


    set sobject(val){ 
        this.#sobject = val;
        // also set prefix
        this.referenceIdPrefix = this.#sobject;
    }
    get sobject(){ return this.#sobject; }
}

module.exports = SObjectSubrequest;