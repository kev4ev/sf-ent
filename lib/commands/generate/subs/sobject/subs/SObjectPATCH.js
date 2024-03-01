const SObjectSubrequest = require('./SObjectSubrequest');
const { fieldSetterPrompts } = require('../util');

class SObjectPATCH extends SObjectSubrequest{

    #choices = [ 'done' ];

    /**
     * @constructor
     * @param {string} recordId 
     * @param {Object.<string, any>} patchHash 
     */
    constructor(recordId, patchHash){
        super();
        this.recordId = recordId;
        this.patchHash = patchHash;
    }

    static init(recordId){ return new SObjectPATCH(recordId); }

    async preRun(){
        if(this.interactive /** todo moves requiresConnection to Diviner ? */){
            await this.getFields(this.#choices, { updateable: true });
        }
    }

    async *getPrompts(){
        /** @type {Array<import('../../../types/command/Diviner').Question>} */
        const prompts = [{
            name: 'recordId',
            message: `Enter the ${this.sobject} Id to update`,
            type: 'input',
            required: !this.recordId,
            skip: this.recordId
        }];
        yield prompts;
        // delegate to reusable function
        fieldSetterPrompts.call(this, this.#choices, this.patchHash);
    }

    async readyToExecute(){
        return this.recordId ? true : 'recordId must be provided';
    }

    async finish(){
        return new this.subrequestTypes.sobject(this.referenceId, 'PATCH', this.sobject).patch(this.recordId, this.patchHash);
    }
}

module.exports = SObjectPATCH;