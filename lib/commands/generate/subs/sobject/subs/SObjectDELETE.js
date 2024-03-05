const SObjectSubrequest = require('./SObjectSubrequest');
const ignoreSymbol = Symbol('ignoreSymbol');

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
        this.#externalIdLookup = idLookupField !== ignoreSymbol;
    }

    /**
     * Overloaded initiator function supporting standard and external id lookup
     * @param {string} id id of the record to get
     * @param {string|Array<string>} externalIdField developerName of the externalId field to be used for lookup
     * @returns {SObjectDELETE}
     */
    static init(id, externalIdField){ 
        return new SObjectDELETE(id, externalIdField || ignoreSymbol);
    }
    static initExt(id, externalIdField){
        return new SObjectDELETE(id, externalIdField);
    }

    async preRun(){
        if(this.interactive){
            // get all query-able fields
            this.queryFields = await this.getFields([]);
            // get all standard id fields
            await this.getFields(this.#idLookupOptions, { idLookup: true, externalId: false }, false);
            // conditionally get externalId fields
            if(this.#externalIdLookup) await this.getFields(this.#idLookupOptions, { externalId: true });
        }
    }

    async *getPrompts(){
        /** @type {Array<import('../../../../../types/command/Diviner').Question>} */
        let prompts = [
            {
                name: 'idLookupField', 
                type: 'autocomplete',
                choices: this.#idLookupOptions,
                message: `Select the field to use for ${this.chalk.redBright('deletion')} lookup: `,
                required: this.#idLookupOptions.length > 1,
                skip: this.#idLookupOptions.length === 1,
                initial: this.#idLookupOptions[0]
        }];
        yield prompts;
        prompts = [    
            {
                name: 'id',
                message: `Enter ${this.sobject}.${this.idLookupField} to ${this.chalk.redBright('delete')}:`,
                type: 'input',
                required: this.id === undefined,
                skip: this.id !== undefined
            }
        ];
        yield prompts;
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

module.exports = SObjectDELETE;