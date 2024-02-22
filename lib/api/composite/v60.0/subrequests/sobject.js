const { CompositeSubRequest } = require("../../../../types");

class SObject extends CompositeSubRequest{
    constructor(referenceId, method, sobject){
        super(referenceId, method);
        this.sobject = sobject;
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
     * @param {Array<string>} recordIds 
     */
    get(recordIds){
        return this.path(`/${this.sobject}/?ids=${recordIds.join(',')}`);
    }

    static basePath(){
        return '/sobjects/';
    }
}

module.exports = SObject;