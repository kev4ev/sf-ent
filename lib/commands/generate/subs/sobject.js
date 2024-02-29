const { Command } = require('../../../types/command/');
const CommandReturningSubrequest = require('./SubRequest');
const assist = require('../../../utils/sf/schemaAssist');

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
     * @param {string} [filterField] 
     * @param {any} [filterValue] 
     */
    async getFields(targetArray, filterField, filterValue){
        const fields = await assist(this.connection).getFields(this.sobject, filterField, filterValue);
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
            await this.getFields(this.#choices, 'createable', true);
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

    #eidChoices = [];
    #externalIdLookup = false;
    #queryFields = [];

    constructor(id, externalFieldApiName){
        super();
        this.id = id;
        this.externalFieldApiName = externalFieldApiName;
        this.#externalIdLookup = externalFieldApiName !== ignoreSymbol;
    }

    static init(recordId){ return new SObjectGET(recordId, ignoreSymbol); }
    static initExt(id, externalIdField){ return new SObjectGET(id, externalIdField); }

    async preRun(){
        this.queryFields = await this.getFields([]);
        if(this.interactive && this.#externalIdLookup){
            await this.getFields(this.#eidChoices, 'externalId', true);
            // also add std id fields in case of no external ids
            await this.getFields(this.#eidChoices, 'idLookup', true);
        }
    }

    async *getPrompts(){
        /** @type {Array<import('../../../types/command/Diviner').Question>} */
        let prompts = [
            {
                name: 'externalFieldApiName', 
                type: 'autocomplete',
                choices: this.#externalIdLookup ? this.#eidChoices : [ 'dummy' ], // necessary to avoid silent enquirer error
                message: 'Select the externalId field to be used for retrieval: ',
                required: this.#externalIdLookup,
                skip: !this.#externalIdLookup
        }];
        yield prompts;
        prompts = [    
            {
                name: 'id',
                message: `Enter ${this.sobject}.${this.#externalIdLookup ? this.externalFieldApiName : 'Id'}:`,
                type: 'input',
                required: this.id === undefined,
                skip: this.id !== undefined
            }
        ];
        yield prompts;
        const allFields = '* (all fields)',
            doneSym = Symbol('done');
        this.queryFields.splice(0, 0, allFields);
        const getChoices = () => this.queryFields;
        prompts = [
            {
                name: 'queryField',
                message: () => `Select fields to return in response. Hit ESC when done:\n(currently selected: ${this.#queryFields?.join(', ') || 'none'})`,
                type: 'autocomplete',
                choices: getChoices,
                limit: 5, 
                onCancel: () => {
                    this.queryField = doneSym;

                    return true; // so processing continues
                },
                validate: (value) => {
                    if(value !== allFields){
                        this.queryFields.splice(this.queryFields.indexOf(value), 1);
                        this.#queryFields.push(value);
                    } else{
                        this.queryField = doneSym;
                    }
                    
                    return true;
                }
            }
        ]; 
        while(this.queryField !== doneSym){
            yield prompts;
        }
    }

    async readyToExecute(){
        return this.id && 
        (this.externalFieldApiName || !this.#externalIdLookup) ? 
        true : 
        `${this.id ? 'externalFieldApiName' : 'id'} is required`;
    }

    async finish(){
        return new this.subrequestTypes
            .sobject(this.referenceId, 'GET', this.sobject)
            .get(
                this.id, 
                this.externalFieldApiName === ignoreSymbol ? undefined : this.externalFieldApiName,
                this.queryFields
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
            await this.getFields(this.#choices, 'updateable', true);
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