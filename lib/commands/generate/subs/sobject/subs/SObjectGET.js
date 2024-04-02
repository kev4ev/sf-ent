const SObjectSubrequest = require('./SObjectSubrequest');
const promptSymbols = require('../../../../../utils/prompts/symbols');
const { getFieldPrompts } = require('../../../../../utils/prompts/schemaPrompts');

const IGNORE = 'IGNORE';

class SObjectGET extends SObjectSubrequest{

    #idLookupOptions = [];
    #externalIdLookup = false;
    #queryFields = [];

    /**
     * @constructor
     * @param {string} id value of the id to lookup
     * @param {string} [idLookupField] optional; external id field name to use for lookup     
     * @param {Array<string>} [fields] optional; Array of field names to return in response
     */
    constructor(id, idLookupField, fields=[]){
        super();
        this.id = id;
        this.idLookupField = idLookupField;
        this.#externalIdLookup = idLookupField !== IGNORE;
        this.#queryFields = fields;
    }

    static interactiveMeta(){
        return {
            name: 'read',
            hint: 'retrieve an sobject using Salesforce id'
        };
    }

    /**
     * Overloaded initiator function supporting standard and external id lookup
     * @param {string} recordId id of the record to get
     * @param {string|Array<string>} externalIdOrFields developerName of the externalId field to be used for lookup
     * @param {Array<string>} [fields] optional Array of fields to return in response; when provided, externalIdOrFields
     * MUST be a string
     * @returns {SObjectGET}
     */
    static init(recordId, externalIdOrFields, fields=[]){ 
        if(!externalIdOrFields || Array.isArray(externalIdOrFields)){
            return new SObjectGET(recordId, IGNORE, fields); 
        }

        return new SObjectGET(recordId, externalIdOrFields, fields);
    }

    async *getPrompts(){
        const idPrompts = await getFieldPrompts(this.sobject, 
            { 
                filterHash: { idLookup: true, externalId: this.#externalIdLookup },
                getHandler: (field) => this.idLookupField = field
            },
            { name: 'idLookupField', message: 'Select the field to use for retrieval' })

        yield idPrompts;
        
        yield this.promptFactory(
            {
                name: 'id',
                message: `Enter ${this.sobject}.${this.idLookupField} to retrieve:`,
                type: 'input',
                required: this.id === undefined,
                skip: this.id !== undefined
            }
        );

        const ALL_SYM = Symbol.keyFor(promptSymbols.allFields),
            DONE_SYM = Symbol.keyFor(promptSymbols.done),
            ASSIST_SYM = Symbol.keyFor(promptSymbols.assist);

        let latest;
        const queryFieldsPrompt = await getFieldPrompts(
            this.sobject, 
            {
                enableSelectAll: true,
                removeSelected: true,
                getHandler: (field, prompt) => {
                    latest = field;
                    if(field && ![ALL_SYM, DONE_SYM].includes(field)){
                        field.trim().replace(/\s/g, '').split(',').forEach(f => {
                            if(this.#queryFields.includes(f)) return; 

                            this.#queryFields.push(f);
                        });
                    }
                }
            }, 
            {
                name: 'queryField',
                message: 'Enter fields to return in response.',
                footer(){ return this.type() === 'input' ? 
                    `Enter\n(1) comma-separted fields,\n(2) ${ALL_SYM} for all fields, or\n(3) ${ASSIST_SYM} for schema assistance (requires org connection)` :
                    'Select fields to include in query'
                }
            });

        do{
            yield queryFieldsPrompt; // do only once if prompt type remains input (no schema assist)
        } while(![ALL_SYM, DONE_SYM].includes(latest) && queryFieldsPrompt[0].type() !== 'input')
    }

    async readyToExecute(){
        return this.id && 
        (this.idLookupField || !this.#externalIdLookup) ? 
        true : 
        `${this.id ? 'idLookupField' : 'id'} is required`;
    }

    async finish(){
        return new this.subrequestTypes
            .sobject(this.referenceId, 'GET', this.sobject)
            .get(
                this.id, 
                this.idLookupField === IGNORE ? undefined : this.idLookupField,
                this.#queryFields
            );
    }
}

SObjectGET.byExternalId = class SObjectGETbyExternalId extends SObjectGET{

    static interactiveMeta(){
        return {
            name: 'read by external id',
            hint: 'retrieve an sobject using an external id field'
        }
    }

    static init(recordId, externalId, fields){
        return new SObjectGET(recordId, externalId, fields);
    }

}

module.exports = SObjectGET;