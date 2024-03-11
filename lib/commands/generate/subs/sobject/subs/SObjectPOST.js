const SObjectSubrequest = require('./SObjectSubrequest');
const { getFieldPrompts, symbols  } = require('../../../../../utils/prompts/fieldSelect');

class SObjectPOST extends SObjectSubrequest{

    #valHash;
    #choices = [ 'done' ];

    constructor(valHash={}){
        super();
        this.#valHash = valHash;
    }

    static init(valHash){ return new SObjectPOST(valHash); }

    async *getPrompts(){
        const prompts = await getFieldPrompts(this.sobject, {
            enableAtReference: true,
            enableSetMode: true,
            filterHash: { createable: true },
            setHandler: (field, value) => {
                if(field !== symbols.done.description) this.#valHash[field] = value;
            },
            refIdExclusions: this.referenceId
        });

        while(this.field !== symbols.done.description){
            yield prompts;
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