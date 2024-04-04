const SObjectSubrequest = require('./SObjectSubrequest');

const IGNORE = 'IGNORE';

class SObjectDELETE extends SObjectSubrequest{

    #idLookupOptions = [];
    #externalIdLookup = false;

    /**
     * @constructor
     * @param {string} id value of the id to lookup
     * @param {string|Symbol} [idLookupField] optional; external id field name to use for lookup     
     */
    constructor(id, idLookupField){
        super();
        this.id = id;
        this.idLookupField = idLookupField;
        this.#externalIdLookup = idLookupField !== IGNORE;
    }

    static interactiveMeta(){
        return {
            name: 'delete',
            hint: 'delete an sobject using Salesforce id'
        };
    }

    /**
     * Overloaded initiator function supporting standard and external id lookup
     * @param {string} id id of the record to get
     * @param {string|Array<string>} externalIdField developerName of the externalId field to be used for lookup
     * @returns {SObjectDELETE}
     */
    static init(id, externalIdField){ 
        return new SObjectDELETE(id, externalIdField || IGNORE);
    }

    async *getPrompts(){
        const idPrompts = await this.getFieldPrompts(this.sobject, 
            { 
                filterHash: { idLookup: true, externalId: this.#externalIdLookup },
                getHandler: (field) => this.idLookupField = field
            },
            { name: 'idLookupField', message: 'Select the field to use for deletion' })

        yield idPrompts;
        
        yield this.promptFactory(
            {
                name: 'id',
                message: `Enter ${this.sobject}.${this.idLookupField} to delete:`,
                type: 'input',
                required: this.id === undefined,
                skip: this.id !== undefined
            }
        );
    }

    async readyToExecute(){
        return this.id && 
        (this.idLookupField || !this.#externalIdLookup) ? 
        true : 
        `${this.id ? 'idLookupField' : 'id'} is required`;
    }

    async finish(){
        return new this.subrequestTypes
            .sobject(this.referenceId, 'DELETE', this.sobject)
            .delete(
                this.id, 
                this.idLookupField
            );
    }
}

SObjectDELETE.byExternalId = class SObjectDELETEbyExtId extends SObjectDELETE{
    static interactiveMeta(){
        return {
            name: 'delete by externalId',
            hint: 'delete an sobject using an externalId field'
        };
    }

    static init(id, externalIdField){
        return new SObjectDELETE(id, externalIdField);
    }
}

module.exports = SObjectDELETE;