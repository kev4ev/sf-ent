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

class SObject extends Command{

    #sub;

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
            GET: wrap(SObjectGET.init).bind(this),
            POST: wrap(SObjectPOST.init).bind(this)
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
            if(payload) this.#sub = payload;

            if(this.readyToResolve){
                this.doneResolver(this.#sub);
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
}

class SObjectGET extends SObjectSubrequest{

    constructor(recordId){
        super();
        this.recordId = recordId;
    }

    static init(recordId){ return new SObjectGET(recordId); }

    async *getPrompts(){
        /** @type {Array<import('../../../types/command/Diviner').Question>} */
        const prompts = [{
            name: 'recordId',
            message: `Enter the ${this.sobject} Id to retrieve`,
            type: 'input',
            required: true
        }];
        yield prompts;
    }

    async readyToExecute(){
        return this.recordId ? true : 'recordId must be provided';
    }

    async finish(){
        return new this.subrequestTypes.sobject(this.referenceId, 'GET', this.sobject).get(this.recordId);
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
        const fields = await assist(this.connection).getFields(this.sobject, 'createable', true);
        if(fields && fields.length > 0) this.#choices.push(...fields);
    }

    async *getPrompts(){
        while(this.field !== 'done'){
            /** @type {Array<import('../../../types/command/Diviner').Question>} */
            let prompts = [
                {
                    name: 'field',
                    message: `Enter the ${this.sobject} field to set`,
                    type: 'autocomplete',
                    required: true,
                    choices: this.#choices,
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

                this.#valHash[this.field] = this.val;
            }
        }
    }

    async readyToExecute(){
        return this.#valHash && Object.entries(this.#valHash).length > 0 ? true : 'Must provided value hash as a non-empty object';
    }

    async finish(){
        return new this.subrequestTypes.sobject(this.referenceId, 'POST', this.sobject).post(this.#valHash);
    }
}

module.exports = SObject.init;