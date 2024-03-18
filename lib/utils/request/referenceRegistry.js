/** @type {Object.<string, ReferenceIdRegister>} */
const REF_ID_REGISTER = { };

class ReferenceIdRegister{

    #currentItem = -1;
    #prefix;
    /** @type {Object.<string, undefined | object>} */
    items = { };

    constructor(prefix){
        this.#prefix = prefix;
    }

    /**
     * 
     * @param {import('../../types/command/Diviner')|object} divinerOrPayload either the Diviner instance that is registering
     * the referenceId, or a plain object that is the payload for the given referenceId
     * @returns {string} the registered referenceId
     */
    register(divinerOrPayload){
        this.#currentItem += 1;
        const item = `${this.#prefix}_${this.#currentItem}`;
        this.items[item] = undefined;
        // treat plain object as payload
        if(Object.getPrototypeOf(divinerOrPayload) === 'object'){
            this.items[item] = divinerOrPayload;
        } else{
            // add a listener to set the payload once Diviner fires 'done' event
            divinerOrPayload.addListener('done', payload => {
                // conditionally set the payload, if item has not been replaced
                if(Object.keys(this.items).includes(item)){
                    this.items[item] = payload;
                }
            });
        }

        return item;
    }

    /**
     * 
     * @param {string} prefix 
     * @param {import('../../types/command/Diviner')} diviner the diviner that is registering the referenceId
     * @param {string} [replacingKey] when present, the key being replaced will be deleted from the registry if it exists
     * @returns 
     */
    static register(prefix, diviner, replacingKey){
        if(!REF_ID_REGISTER[prefix]) REF_ID_REGISTER[prefix] = new ReferenceIdRegister(prefix);
        const prefixRegistry = REF_ID_REGISTER[prefix];

        // handle replacement
        if(replacingKey){
            const topKey = replacingKey.split('_')[0];
            if(Object.keys(REF_ID_REGISTER[topKey]?.items || {}).includes(replacingKey)){
                delete REF_ID_REGISTER[topKey].items[replacingKey];
            }
            // TODO any recursion required to check for references?
        }
        
        return prefixRegistry.register(diviner);
    }

    /**
     * Parses request string to a navigable registry where first level is request type ns
     * and second level are hashes of referenceIds to their payloads
     * @param {string} request The JSON string a complete composite request
     * @returns {Object.<string, Object.<string, Object>>}
     */
    static parse(request){
        request = typeof request === 'object' ? request : JSON.parse(request);
        const parsed = {};
        for(const subRequest in request.compositeRequest){
            const { referenceId } = subRequest;
            const [ prefix ] = referenceId.split(/_\d{1,}$/);
            if(!parsed[prefix]) parsed[prefix] = {};
            parsed[prefix] = subRequest;
        }
    }
}

module.exports = {
    register: ReferenceIdRegister.register,
    parse: ReferenceIdRegister.parse,
    /**
     * Get the current registry hash
     * @param {boolean} [sealed=true] by default, returns a sealed copy of the current registry hash
     * @returns 
     */
    getRegistry: (sealed=true) => {
        return sealed ? Object.seal(Object.assign({}, REF_ID_REGISTER)) : REF_ID_REGISTER
    }
};