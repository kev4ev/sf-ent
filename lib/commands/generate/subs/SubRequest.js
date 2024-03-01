const subrequests = require('../../../api/composite')().subrequests;
const SubCommand = require("../../../types/command/SubCommand");

/** @type {Object.<string, KeyRegister>} */
const REF_ID_REGISTER = { };

class KeyRegister{

    #prefix;

    constructor(prefix){
        this.currentItem = -1;
        this.items = [];
        this.#prefix = prefix;
    }

    register(){
        this.currentItem += 1;
        const item = `${this.#prefix}_${this.currentItem}`;
        this.items.push(item);

        return item;
    }

    static register(prefix){
        if(!REF_ID_REGISTER[prefix]) REF_ID_REGISTER[prefix] = new KeyRegister(prefix);
        const prefixRegistry = REF_ID_REGISTER[prefix];
        
        return prefixRegistry.register();
    }
}


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
        const key = `${prefix ? `${prefix}-` : ''}${Object.getPrototypeOf(this).constructor.name}`;
        this.#_referenceId = KeyRegister.register(key);
    }

    set referenceId(prefix){
        this.#generateReferenceId(prefix);
    }
    get referenceId(){ return this.#_referenceId; }
}

module.exports = CommandReturningSubrequest;