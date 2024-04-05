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

    get [CompositeSubRequest.responseAccessorParts](){
        const parts = [ ];
        switch (this.method.toLowerCase()) {
            case 'get':
            case 'patch':
                parts.push({
                    name: 'properField',
                    message: 'Proper-cased field',
                    validate(input){
                        if(input){
                            return input.search(/^[A-Z]/) === 0 ? true : 'field name start with an uppercase letter';
                        }

                        return true;
                    }
                });
                break;

            case 'post':
                parts.push('id');
                break;

            case 'delete':
                parts.push('SObject DELETE has no response body');
                break;
        
            default:
                break;
        }

        return parts;
    }

    /**
     * 
     * @param {string} id recordId or externalIdField value
     * @param {string} [externalIdFieldName] optional; when provided, used as external id field for get
     */
    delete(id, externalIdFieldName){
        // same url format as GET but with delete http request type
        return this.get(id, externalIdFieldName);
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