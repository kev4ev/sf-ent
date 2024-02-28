const { Command } = require('../../../types/command/');
const CommandReturningSubrequest = require('./SubRequest');
const assist = require('../../../utils/sf/schemaAssist');

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

                return sobjectRequest;
            }
        };

        return {
            GET: wrap(SObjectGET.init).bind(this)
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
            suggest: (input, choices=[]) => {
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

module.exports = SObject.init;