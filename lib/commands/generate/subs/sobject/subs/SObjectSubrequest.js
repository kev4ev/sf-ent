const CommandReturningSubrequest = require('../../SubRequest');
const assist = require('../../../../../utils/schema/assist');

class SObjectSubrequest extends CommandReturningSubrequest{
    #sobject;
    set sobject(val){ 
        this.#sobject = val;
        // also set prefix
        this.referenceIdPrefix = this.#sobject;
    }
    get sobject(){ return this.#sobject; }
}

module.exports = SObjectSubrequest;