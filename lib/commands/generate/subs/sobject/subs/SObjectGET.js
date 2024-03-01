const SObjectSubrequest = require('./SObjectSubrequest');
const ignoreSymbol = Symbol('ignoreSymbol');

class SObjectGET extends SObjectSubrequest{

    #idLookupOptions = [];
    #externalIdLookup = false;
    #queryFields = [];

    constructor(id, idLookupField){
        super();
        this.id = id;
        this.idLookupField = idLookupField;
        this.#externalIdLookup = idLookupField !== ignoreSymbol;
    }

    static init(recordId){ return new SObjectGET(recordId, ignoreSymbol); }
    static initExt(id, externalIdField){ return new SObjectGET(id, externalIdField); }

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
        /** @type {Array<import('../../../types/command/Diviner').Question>} */
        let prompts = [
            {
                name: 'idLookupField', 
                type: 'autocomplete',
                choices: this.#idLookupOptions,
                message: 'Select the field to be used for retrieval: ',
                required: this.#idLookupOptions.length > 1,
                skip: this.#idLookupOptions.length === 1,
                initial: this.#idLookupOptions[0]
        }];
        yield prompts;
        prompts = [    
            {
                name: 'id',
                message: `Enter ${this.sobject}.${this.idLookupField} to retrieve:`,
                type: 'input',
                required: this.id === undefined,
                skip: this.id !== undefined
            }
        ];
        yield prompts;
        const allFields = '* (all fields)',
            doneChoice = '<done>',
            doneSym = Symbol('done');
        this.queryFields.splice(0, 0, allFields);
        const getChoices = () => this.queryFields.filter(field => !this.#queryFields.includes(field));

        let latest;
        prompts = [
            {
                name: 'queryField',
                message: () => `Select fields to return in response. Select <done> when finished:\n(currently selected: ${this.#queryFields?.join(', ') || 'none'})`,
                type: 'autocomplete',
                choices: getChoices,
                limit: 5, 
                validate: (value) => {
                    if(value !== allFields && value !== doneChoice){
                        this.queryFields.splice(this.queryFields.indexOf(value), 1);
                        this.#queryFields.push(value);
                        if(this.queryFields.includes(allFields)){
                            this.queryFields.splice(this.queryFields.indexOf(allFields), 1);
                            this.queryFields.splice(0, 0, doneChoice);
                        }
                    } else{
                        latest = doneSym;
                    }
                    
                    return true;
                },
                required: true
            }
        ]; 
        while(latest !== doneSym){
            yield prompts;
        }
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
                this.idLookupField === ignoreSymbol ? undefined : this.idLookupField,
                this.#queryFields
            );
    }
}

module.exports = SObjectGET;