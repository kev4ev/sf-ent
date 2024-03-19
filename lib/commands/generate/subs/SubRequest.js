const subrequests = require('../../../api/composite')().subrequests;
const SubCommand = require("../../../types/command/SubCommand");
const { register, registerCustom } = require('../../../utils/request/referenceRegistry');


class CommandReturningSubrequest extends SubCommand{
    
    #customRefId;
    #prefix;
    #referenceId;

    /**
     * @constructor
     */
    constructor(){
        super();
        this.subrequestTypes = subrequests;
    }

    set referenceId(refId){
        this.#customRefId = refId;
    }

    set referenceIdPrefix(prefix){
        this.#prefix = prefix;
    }

    get referenceId(){ return this.#referenceId; }

    async execute(){
        this.#referenceId = 
            this.#customRefId ? 
            registerCustom(this, this.#customRefId) :
            register(this, this.#prefix);

        return await super.execute();
    }
}

module.exports = CommandReturningSubrequest;