const Diviner = require('../../types/command/Diviner');

/** @type {Object.<string, ReferenceIdRegister>} */
let REF_ID_REGISTER = { };

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
     * @param {string} [customKey] optional; when provided, the internal item counter and prefixing will not be used; in 
     * this case the caller is resposible for ensuring uniqueness of the key within the instance's items
     * @returns {string} the registered referenceId
     */
    register(divinerOrPayload, customKey){
        this.#currentItem += 1;
        const item = customKey ? customKey : `${this.#prefix}_${this.#currentItem}`;
        this.items[item] = undefined;
        // add a listener to set the payload once Diviner fires 'done' event
        if(divinerOrPayload instanceof Diviner){
            divinerOrPayload.addListener('done', payload => {
                // conditionally set the payload, in the event item key has been replaced
                if(Object.keys(this.items).includes(item)){
                    this.items[item] = payload;
                }
            });
        } else{
            // treat any other type as payload itself
            this.items[item] = divinerOrPayload;
        }

        return item;
    }

    /**
     * Registers a new key using the provided Diviner's prototype name and optional prefix
     * @param {import('../../types/command/Diviner')} diviner the Diviner that will emit the request payload in its 'done' event
     * @param {string} [prefix] an optional string that will be appended to the diviner's name and prepend the item counter 
     * @param {string} [replacingKey] when present, the key being replaced will be deleted from the registry if it exists
     * @returns {string} the unique referenceId in format <protoName>[_prefix]<_protoNameCtr>
     */
    static register(diviner, prefix, replacingKey){
        return ReferenceIdRegister._register(
            diviner,
            `${diviner?.name}${prefix ? `_${prefix}` : ''}`,
            replacingKey,
            false
        );
    }

    /**
     * Registers a new custom key that will be appended to the registry's custom referenceId hash as-is 
     * @param {import('../../types/command/Diviner')} diviner the Diviner that will emit the request payload in its 'done' event
     * @param {string} key a key that will be appended to the registry's custom referenceId hash as-is
     * @param {string} [replacingKey] when present, the key being replaced will be deleted from the registry if it exists
     * @returns {string} the same key passed into the function
     */
    static registerCustom(diviner, key, replacingKey){
        return ReferenceIdRegister._register(
            diviner, 
            key,
            replacingKey,
            true
        );
    }

    /**
     * Note that a custom key can only replace a custom key, not a standard one, and vice versa.
     * @returns 
     */
    static _register(diviner, key, replacingKey, custom=false){
        // conditionally establish a new registry using top-level prefix
        const prefix = custom ? 'custom' : key;
        const prefixRegistry = REF_ID_REGISTER[prefix] = REF_ID_REGISTER[prefix] ?? new ReferenceIdRegister(prefix);

        // handle replacement
        if(replacingKey){
            const topKey = custom ? 'custom' : replacingKey.split('_')[0];
            if(Object.keys(REF_ID_REGISTER[topKey]?.items || {}).includes(replacingKey)){
                delete REF_ID_REGISTER[topKey].items[replacingKey];
            }
            // TODO any recursion required to check for references?
        }
        
        // disallow underscores (_) in custom keys as they will break parse()
        if(custom && key.includes('_')) throw new Error(`Custom key ${key} includes an underscore. Please remove and try again.`);

        return custom ? prefixRegistry.register(diviner, key) : prefixRegistry.register(diviner);
    }

    /**
     * Parses request string to a navigable registry where first level is request type ns
     * and second level are hashes of referenceIds to their payloads
     * @param {string} request The JSON string a complete composite request
     * @returns {Object.<string, Object.<string, Object>>}
     */
    static parse(request, readOnly = true){
        // reset ref registry every time parse is called
        REF_ID_REGISTER = { };
        request = typeof request === 'object' ? request : JSON.parse(request);
        for(const subRequest of request.compositeRequest){
            const { referenceId } = subRequest;
            const underCnt = referenceId.match(/_/g),
                isCustom = underCnt.length === 0;
            if(!isCustom){
                Object.defineProperty(subRequest, 'name', {
                    get(){
                        return referenceId.split('_')[0];
                    }
                })
            }
            isCustom ? 
                ReferenceIdRegister.registerCustom(subRequest, referenceId) :
                ReferenceIdRegister.register(subRequest, underCnt < 2 ? undefined : referenceId.split('_')[1]); // prefix is always second
        }

        return getRegistry()
    }
}

/**
 * Get the current registry hash
 * @param {boolean} [readOnly=true] by default, returns a read-only copy of the current registry hash
 * @returns {Object.<string, ReferenceIdRegister>}
 */
function getRegistry(readOnly=true){
    return readOnly ? structuredClone(REF_ID_REGISTER) : REF_ID_REGISTER;
}

module.exports = {
    register: ReferenceIdRegister.register,
    registerCustom: ReferenceIdRegister.registerCustom,
    parse: ReferenceIdRegister.parse,
    getRegistry
};