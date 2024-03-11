const SObjectSubrequest = require('./SObjectSubrequest');
const { getFieldPrompts, symbols  } = require('../../../../../utils/prompts/fieldSelect');

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

    static init(recordId){ return new SObjectPATCH(recordId); }

    async *getPrompts(){
        /** @type {Array<import('../../../types/command/Diviner').Question>} */
        let prompts = [{
            name: 'recordId',
            message: `Enter the ${this.sobject} Id to update`,
            type: 'input',
            required: !this.recordId,
            skip: this.recordId
        }];
        yield prompts;
        // delegate to reusable function
        prompts = await getFieldPrompts(this.sobject, { 
            enableAtReference: true, 
            enableSetMode: true,
            refIdExclusions: this.referenceId,
            filterHash: { updateable: true },
            setHandler: (field, value) => {
                if(field && value) this.patchHash[field] = value;
            }
        });

        while(this.field !== symbols.done.description){
            yield prompts;
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