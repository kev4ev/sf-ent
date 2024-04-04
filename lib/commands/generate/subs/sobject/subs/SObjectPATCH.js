const SObjectSubrequest = require('./SObjectSubrequest');
const { getFieldPrompts, symbols  } = require('../../../../../utils/prompts/schemaPrompts');

class SObjectPATCH extends SObjectSubrequest{

    /**
     * @constructor
     * @param {string} recordId 
     * @param {Object.<string, any>} patchHash 
     */
    constructor(recordId, patchHash={}){
        super();
        this.recordId = recordId;
        this.patchHash = patchHash || {};
    }

    static interactiveMeta(){
        return {
            name: 'update',
            hint: 'update an sobject using Salesforce id'
        };
    }

    static init(recordId, patchHash){ return new SObjectPATCH(recordId, patchHash); }

    async *getPrompts(){
        const SYM_DONE = Symbol.keyFor(symbols.done),
            SYM_CANCEL = Symbol.keyFor(symbols.cancel),
            sigTerm = (input) => [ SYM_DONE, SYM_CANCEL ].includes(input)

        yield this.promptFactory(
            {
                name: 'recordId',
                message: `Enter the ${this.sobject} Id to update`,
                type: 'input',
                required: !this.recordId,
                skip: this.recordId
            }
        );
        // delegate to reusable function
        const fieldPrompts = await this.getFieldPrompts(this.sobject, 
            { 
                enableAtReference: true, 
                enableSetMode: true,
                refIdExclusions: this.referenceId,
                filterHash: { updateable: true },
                setHandler: (field, value) => {
                    if(value && !sigTerm(field)) this.patchHash[field] = value;
                }
            }
        );
        const recursivePrompts = this.promptFactory(...fieldPrompts);

        while(!sigTerm(this.field)){
            yield recursivePrompts;
        }
    }

    async readyToExecute(){
        return this.recordId && Object.keys(this.patchHash).length > 0 ? 
            true : 
            'recordId and update fields must be provided';
    }

    async finish(){
        return new this.subrequestTypes.sobject(this.referenceId, 'PATCH', this.sobject).patch(this.recordId, this.patchHash);
    }
}

module.exports = SObjectPATCH;