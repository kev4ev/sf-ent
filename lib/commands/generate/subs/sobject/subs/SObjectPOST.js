const SObjectSubrequest = require('./SObjectSubrequest');
const { fieldSetterPrompts } = require('../util');

class SObjectPOST extends SObjectSubrequest{

    #valHash;
    #choices = [ 'done' ];

    constructor(valHash={}){
        super();
        this.#valHash = valHash;
    }

    static init(valHash){ return new SObjectPOST(valHash); }

    async preRun(){
        if(this.interactive /** todo moves requiresConnection to Diviner ? */){
            await this.getFields(this.#choices, { createable: true });
        }
    }

    async *getPrompts(){
        const iter = fieldSetterPrompts.call(this, this.#choices, this.#valHash);
        let prompts = iter.next();
        while(!prompts.done){
            yield prompts.value;

            prompts = iter.next();
        }
    }

    async readyToExecute(){
        return this.#valHash && Object.entries(this.#valHash).length > 0 ? true : 'Must provided value hash as a non-empty object';
    }

    async finish(){
        return new this.subrequestTypes.sobject(this.referenceId, 'POST', this.sobject).post(this.#valHash);
    }
}

module.exports = SObjectPOST;