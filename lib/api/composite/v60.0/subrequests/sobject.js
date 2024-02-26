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
     * @param {string} recordId 
     */
    get(recordId){
        return this.path(`/${this.#sobject}/${recordId}`);
    }

    static basePath(){
        return '/sobjects/';
    }
}

module.exports = SObject;