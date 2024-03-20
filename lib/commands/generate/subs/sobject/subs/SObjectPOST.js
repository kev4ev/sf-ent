const SObjectSubrequest = require('./SObjectSubrequest');
const { getFieldPrompts, symbols  } = require('../../../../../utils/prompts/schemaPrompts');

class SObjectPOST extends SObjectSubrequest{

    #valHash;

    constructor(valHash={}){
        super();
        this.#valHash = valHash;
    }

    static interactiveMeta(){
        return {
            name: 'create',
            hint: 'insert an sobject of the given type'
        };
    }
    
    static init(valHash){ return new SObjectPOST(valHash); }

    async *getPrompts(){
        const recursivePrompts = this.promptFactory(
            ...(await getFieldPrompts(
                    this.sobject, 
                    {
                        enableAtReference: true,
                        enableSetMode: true,
                        filterHash: { createable: true },
                        setHandler: (field, value) => {
                            if(field !== symbols.done.description) this.#valHash[field] = value;
                        },
                        refIdExclusions: this.referenceId
                    }
                )
            )
        );

        while(this.field !== symbols.done.description){
            yield recursivePrompts;
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