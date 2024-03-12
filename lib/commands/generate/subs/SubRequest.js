const subrequests = require('../../../api/composite')().subrequests;
const SubCommand = require("../../../types/command/SubCommand");
const { register } = require('../../../utils/request/referenceRegistry');


class CommandReturningSubrequest extends SubCommand{
    
    #_referenceId;

    /**
     * @constructor
     * @param {string} [prefix] optional prefix to append to this instance's referenceId
     */
    constructor(prefix){
        super();
        this.#generateReferenceId(prefix);
        this.subrequestTypes = subrequests;
    }

    #generateReferenceId(prefix){
        const key = `${Object.getPrototypeOf(this).constructor.name}${prefix ? `_${prefix}` : ''}`;
        this.#_referenceId = register(key, this);
    }

    set referenceId(prefix){
        this.#generateReferenceId(prefix);
    }
    get referenceId(){ return this.#_referenceId; }
}

module.exports = CommandReturningSubrequest;