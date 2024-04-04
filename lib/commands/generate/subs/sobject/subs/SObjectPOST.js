const SObjectSubrequest = require('./SObjectSubrequest');

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
        const DONE = Symbol.keyFor(this.promptSymbols.done),
            CANCEL = Symbol.keyFor(this.promptSymbols.cancel),
            inputFinished = (input) => [ DONE, CANCEL ].includes(input);
        const recursivePrompts = this.promptFactory(
            ...(await this.getFieldPrompts(
                    this.sobject, 
                    {
                        enableAtReference: true,
                        enableSetMode: true,
                        filterHash: { createable: true },
                        setHandler: (field, value) => {
                            if(!inputFinished(field)) this.#valHash[field] = value;
                        },
                        refIdExclusions: this.referenceId
                    }
                )
            )
        );

        while(!inputFinished(this.field)){
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