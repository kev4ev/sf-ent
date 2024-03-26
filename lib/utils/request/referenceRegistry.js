const Diviner = require('../../types/command/Diviner');

/** @type {Object.<string, ReferenceIdRegister>} */
let REF_ID_REGISTER = { };

/** 
 * tracks order that items were registered, e.g. order of composite subrequests 
 * @type {Array<string>}
 */
const orderedItems = [];

class ReferenceIdRegister{

    #currentItem = -1;
    #prefix;
    /** @type {Object.<string, undefined | object>} */
    itemHash = { };

    constructor(prefix){
        this.#prefix = prefix;
    }

    static allowUnderscoreInCustom = false;

    /**
     * 
     * @param {import('../../types/command/Diviner')|object} divinerOrPayload either the Diviner instance that is registering
     * the referenceId, or a plain object that is the payload for the given referenceId
     * @param {string} [customKey] optional; when provided, the internal item counter and prefixing will not be used; in 
     * this case the caller is resposible for ensuring uniqueness of the key within the instance's itemHash
     * @returns {string} the registered referenceId
     */
    register(divinerOrPayload, customKey){
        this.#currentItem += 1;
        const item = customKey ? customKey : `${this.#prefix}_${this.#currentItem}`;
        this.itemHash[item] = undefined;
        orderedItems.push(item);
        /** @typedef {import('../../types/api/CompositeSubRequest')} EvtPayload */
        // add a listener to set the payload once Diviner fires 'done' event
        // it is expected that all divinerOrPayload be either a Diviner that fires
        // a CompositeSubRequest in done, or an object that adheres to the same (serializable) interface
        if(divinerOrPayload instanceof Diviner){

            divinerOrPayload.addListener('done', payload => {
                // conditionally set the payload, in the event item key has been replaced
                if(Object.keys(this.itemHash).includes(item)){
                    this.itemHash[item] = payload;
                }
            });
        } else{
            // treat any other type as payload itself
            this.itemHash[item] = divinerOrPayload;
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
        // disallow underscores (_) in custom keys as they will break parse()
        if(!ReferenceIdRegister.allowUnderscoreInCustom && custom && key.includes('_')){
            throw new Error('Custom keys may not include underscores (_). Please remove and try again.');
        }
        
        // conditionally establish a new registry using top-level prefix
        const prefix = custom ? 'custom' : key;
        const prefixRegistry = REF_ID_REGISTER[prefix] = REF_ID_REGISTER[prefix] ?? new ReferenceIdRegister(prefix);
        
        // register and get the refId
        const refId = custom ? prefixRegistry.register(diviner, key) : prefixRegistry.register(diviner);
        
        // handle referenceId replacement
        if(replacingKey){
            const topKey = custom ? 'custom' : replacingKey.split('_')[0];
            if(Object.keys(REF_ID_REGISTER[topKey]?.itemHash || {}).includes(replacingKey)){
                // delete the itemHash key
                delete REF_ID_REGISTER[topKey].itemHash[replacingKey];
                // if the prefix is empty, remove it entirely
                if(Object.entries(REF_ID_REGISTER[topKey].itemHash).length === 0){
                    delete REF_ID_REGISTER[topKey];
                }
                // ensure request maintains sequential integrity
                const origPos = orderedItems.indexOf(replacingKey), 
                    newPos = orderedItems.indexOf(refId);
                if(origPos){
                    orderedItems.splice(origPos, 1, refId);
                    orderedItems.splice(newPos, 1);
                } 
            }
            // replace any existing @ references to the old refId with the new refId
            const regex = new RegExp(`(\@\{)(${replacingKey})(\})`, 'g');
            for(let payload of getRegistryArray()){
                if(payload && typeof payload === 'object'){ // remember payload may not yet have been fired yet
                    Object.values(payload).forEach(value => {
                        if(value && typeof value === 'string'){
                            value.replace(regex, refId);
                        }
                    });
                }
            }
        }
        
        return refId;
    }

    /**
     * Parses request string to a navigable registry
     * @param {string} request The JSON string a complete composite request
     * @returns {Object.<string, ReferenceIdRegister>}
     */
    static parse(request){
        // reset ref registry every time parse is called
        REF_ID_REGISTER = { };
        request = typeof request === 'object' ? request : JSON.parse(request);
        // register all as custom, otherwise standard refIds may get changed
        ReferenceIdRegister.allowUnderscoreInCustom = true;
        for(const subRequest of request.compositeRequest){
            const { referenceId } = subRequest;
            ReferenceIdRegister.registerCustom(subRequest, referenceId);
        }

        return getRegistry();
    }
}

/**
 * Get the current registry hash
 * @param {boolean} [readOnly=true] by default, returns a read-only copy of the current registry hash
 * @returns {Object.<string, ReferenceIdRegister>}
 */
function getRegistry(readOnly=true){
    return /** readOnly ? structuredClone(REF_ID_REGISTER) : */ REF_ID_REGISTER;
}

/**
 * Returns Array of composite subrequest bodies in the order in which they were registered
 * @returns {Array<object>}
 */
function getRegistryArray(){
    // flatten all itemHashes to a single hash
    const flatHash = Object.values(getRegistry())
        .map(registry => registry.itemHash)
        .reduce((prev, curr) => {
            if(curr){
                Object.entries(curr).forEach(entry => {
                    const [ refId, payload ] = entry;
                    prev[refId] = payload;
                });
            }

            return prev;
        }, {});
    // order the array by index in orderedItems
    const ordered = Object.entries(flatHash).sort((a, b) => {
        const aRefId = a[0], bRefId = b[0];

        return orderedItems.indexOf(aRefId) - orderedItems.indexOf(bRefId);
    }).map(entry => entry[1]);

    return ordered;
}

module.exports = {
    register: ReferenceIdRegister.register,
    registerCustom: ReferenceIdRegister.registerCustom,
    parse: ReferenceIdRegister.parse,
    getRegistry,
    getRegistryArray
};