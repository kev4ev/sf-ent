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

    /**
     * Shadows superclass such that a custom reference id can be set without passing via constructor
     */
    getSubDiviners(){
        return Object.assign(
            {
                /**
                 * allows a custom reference id to be set on the request when in non-interactive (lib) mode
                 * @param {string} referenceId custom referenceId to set for the subrequest
                 * @returns {DivinerPromise}
                 */
                refId: (referenceId) => {
                    this.referenceId = referenceId;
                    // return super's DivinerPromise which will already be decorated with the appropriate api
                    return this.parent.runPromise;
                }
            },
            super.getSubDiviners()
        );
    }

    async execute(){
        this.#referenceId = 
            this.#customRefId ? 
            registerCustom(this, this.#customRefId) :
            register(this, this.#prefix);

        return await super.execute();
    }
}

module.exports = CommandReturningSubrequest;