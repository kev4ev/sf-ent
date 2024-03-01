const { Command } = require('../../../types/command/');
const CommandReturningSubrequest = require('./SubRequest');
const assist = require('../../../utils/sf/schemaAssist');
const { prompt } = require('enquirer');

function autocompleteMatcher(input, choices=[]){
    // if any item matches input exactly, move it to the top of choices
    input = input.toLowerCase();
    choices = choices.filter(choice => String.prototype.includes.call(choice.value.toLowerCase(), input));
    const exact = choices.map(({ value }) => value.toLowerCase()).findIndex(value => (value === input));
    if(exact > -1){
        const match = choices[exact];
        choices.splice(exact, 1);
        choices.splice(0, 0, match);
    }

    return choices;
}

/**
 * Reusable function for interactive field setting prompts; MUST
 * be bound to a this by caller (i.e. sobjectFieldSetter.call(this, ...args))
 * @param {Array<string>} fieldChoices autocomplete options
 * @param {Object.<string, any>} valHash mapping of field names to values
 */
function* fieldSetterPrompts(fieldChoices, valHash){
    while(this.field !== 'done'){
        /** @type {Array<import('../../../types/command/Diviner').Question>} */
        let prompts = [
            {
                name: 'field',
                message: `Enter the ${this.sobject} field to set`,
                type: 'autocomplete',
                required: true,
                choices: fieldChoices,
                limit: 5,
                suggest: autocompleteMatcher
            }
        ];
        yield prompts;
        if(this.field !== 'done'){
            prompts = [
                {
                    name: 'val',
                    message: `Enter value for ${this.field}`,
                    type: 'input',
                    required: this.field !== 'done',
                    skip: this.field === 'done',
                }
            ];
            yield prompts;

            valHash[this.field] = this.val;
        }
    }
}

class SObject extends Command{

    #subs = [];

    constructor(sobject){
        super();
        this.sobject = sobject;
    }
    
    static init(sobject){
        return new SObject(sobject);
    }

    getSubDiviners(){
        const wrap = function(initFn){
            return function(...args){
                const sobjectRequest = initFn(...args);
                sobjectRequest.sobject = this.sobject;
                sobjectRequest.connection = this.connection;

                return sobjectRequest;
            }
        };

        return {
            CREATE: wrap(SObjectPOST.init).bind(this),
            READ: wrap(SObjectGET.init).bind(this),
            'READ (by external id)': wrap(SObjectGET.initExt).bind(this),
            UPDATE: wrap(SObjectPATCH.init).bind(this),
        };
    }

    async *getPrompts(){
        await this.connection;

        /** @type {Array<import('../../../types/command/Diviner').Question>} */
        const prompts = [{
            name: 'sobject',
            message: 'Enter name of SObject',
            required: true,
            type: 'autocomplete',
            choices: this.requiresConnection ? assist(this.connection).getObjects() : [],
            limit: 5,
            suggest: autocompleteMatcher
        }];
        yield prompts;
    }

    /** overrides default so that only one subcommand is invoked per instance */
    async executeInteractive(){
        const { cmd } = await prompt([
            {
                name: 'cmd',
                choices: Object.keys(this.getSubDiviners()),
                message: `Select ${this.sobject} action: `,
                type: 'autocomplete',
                required: true
            }
        ]);

        this.done();
        await this.relay(this.getSubDiviners()[cmd]);

        return await this._donePromise;
    }

    async readyToExecute(){ return this.sobject ? true : 'sobject must be provided'; }

    async handleSubDivinerEvent(evt, payload, diviner){
        if(evt === 'done'){
            if(payload) this.#subs.push(payload);

            if(this.readyToResolve){
                this.doneResolver(this.#subs);
            }
        }
    }
}

class SObjectSubrequest extends CommandReturningSubrequest{
    #sobject;
    set sobject(val){ this.#sobject = val; }
    get sobject(){ return this.#sobject; }
    #connection;
    set connection(val){ this.#connection = val; }
    get connection(){ return this.#connection; }

    /**
     * Helper for subclasses to get sobject fields
     * @param {Array<string>} targetArray array that will be populated with matching fields
     * @param {Object.<string, any>} [filterHash] optional hash to filter the returned field; keys and values
     * must correspond to {@link https://developer.salesforce.com/docs/atlas.en-us.248.0.api.meta/api/sforce_api_calls_describesobjects_describesobjectresult.htm#field}
     * @param {boolean} [sort=true] when true (default) fields will be returned in alpha ordered ASC
     */
    async getFields(targetArray, filterHash, sort=true){
        const fields = await assist(this.connection).getFields(this.sobject, filterHash || {}, sort);
        fields.forEach(field => {
            if(!targetArray.includes(field)){
                targetArray.push(field)
            }
        });

        return targetArray;
    }
}

class SObjectPOST extends SObjectSubrequest{

    #valHash;
    #choices = [ 'done' ];

    constructor(valHash={}){
        super();
        this.#valHash = valHash;
    }

    static init(valHash){ return new SObjectPOST(valHash); }

    async preRun(){
        if(this.interactive /** todo moves requiresConnection to Diviner ? */){
            await this.getFields(this.#choices, { createable: true });
        }
    }

    async *getPrompts(){
        const iter = fieldSetterPrompts.call(this, this.#choices, this.#valHash);
        let prompts = iter.next();
        while(!prompts.done){
            yield prompts.value;

            prompts = iter.next();
        }
    }

    async readyToExecute(){
        return this.#valHash && Object.entries(this.#valHash).length > 0 ? true : 'Must provided value hash as a non-empty object';
    }

    async finish(){
        return new this.subrequestTypes.sobject(this.referenceId, 'POST', this.sobject).post(this.#valHash);
    }
}

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

module.exports = SObject.init;