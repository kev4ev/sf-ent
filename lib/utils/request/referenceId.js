/** @type {Object.<string, ReferenceIdRegister>} */
const REF_ID_REGISTER = { };

class ReferenceIdRegister{

    #prefix;
    #items = { };

    constructor(prefix){
        this.currentItem = -1;
        this.#prefix = prefix;
    }

    /**
     * 
     * @param {import('../../types/command/Diviner')} diviner the diviner that is registering the referenceId
     * @returns {string} the registered referenceId
     */
    register(diviner){
        this.currentItem += 1;
        const item = `${this.#prefix}_${this.currentItem}`;
        this.#items[item] = undefined;
        // use arrow fn evt handler to retain lexical this
        diviner.addListener('done', payload => {
            // set the payload
            this.#items[item] = payload;
        });

        return item;
    }

    /**
     * 
     * @param {string} prefix 
     * @param {import('../../types/command/Diviner')} diviner the diviner that is registering the referenceId
     * @returns 
     */
    static register(prefix, diviner){
        if(!REF_ID_REGISTER[prefix]) REF_ID_REGISTER[prefix] = new ReferenceIdRegister(prefix);
        const prefixRegistry = REF_ID_REGISTER[prefix];
        
        return prefixRegistry.register(diviner);
    }
}

module.exports = {
    register: ReferenceIdRegister.register
};