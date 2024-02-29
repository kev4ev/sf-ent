const { CompositeSubRequest } = require("../../../../types");

class SObject extends CompositeSubRequest{
    #sobject;

    constructor(referenceId, method, sobject){
        super(referenceId, method);
        // set sobject non-enumerable so it does not get serialized
        this.#sobject = sobject;
        // validate each method invocation relative to the constructed method
        [ this.get ].forEach(fn => {
            const { name } = fn;
            fn = (...args)=>{
                if(this.method !== name){
                    throw new Error(`${name}() method is not valid when HTTP method is ${this.method}`);
                }
                // call fn and ensure this context is bound
                return fn.call(this, ...args);
            }
        })
    }

    /**
     * Only valid for 'GET' method
     * @param {string} id recordId or externalIdField value
     * @param {string} [externalIdFieldName] optional; when provided, used as external id field for get
     * @param {Array<string>} [fields] optional; when provided, an array of fields to be included in response
     * @returns {SObject}
     */
    get(id, externalIdFieldName, fields){
        return this.setPath(
            `/${this.#sobject}/${externalIdFieldName ? `${externalIdFieldName}/` : ''}${id}${fields && fields.length > 0 ? '?fields=' + fields.join(',') : ''}`
        );
    }

    /**
     * Only valid for 'PATCH' method
     * @param {string} recordId 
     * @param {Object.<string, any>} body 
     * @returns {SObject}
     */
    patch(recordId, body){
        return this.setPath(`/${this.#sobject}/${recordId}`).setBody(body);
    }

    /**
     * Create a record of the given sobjecttype; valid only for 'POST' method
     * @param {Object.<string, any>} valueHash 
     */
    post(valueHash){
        return this.setPath(`/${this.#sobject}/Id`).setBody(valueHash);
    }

    static basePath(){
        return '/sobjects/';
    }
}

module.exports = SObject;