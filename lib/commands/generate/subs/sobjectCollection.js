const { Command } = require('../../../types/command/');
const CommandReturningSubrequest = require('./SubRequest');

class SObjectCollection extends Command{

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
            GET: wrap(SObjectCollectionGET.init).bind(this)
        };
    }

    async *getPrompts(){
        const prompts = [{
            name: 'sobject',
            message: 'Enter name of SObject', // todo enable assist mode
            required: true,
            type: 'input'
        }];
        yield prompts;
    }

    async readyToExecute(){ return this.sobject ? true : 'SObject must be provided'; }

    async handleSubDivinerEvent(evt, payload, diviner){
        if(evt === 'done'){
            if(payload) this.#sub = payload;

            if(this.readyToResolve){
                this.doneResolver(this.#sub);
            }
        }
    }
}

class SObjectCollectionSubrequest extends CommandReturningSubrequest{
    #sobject;
    set sobject(val){ this.#sobject = val; }
    get sobject(){ return this.#sobject; }
}

class SObjectCollectionGET extends SObjectCollectionSubrequest{

    constructor(recordIds=[]){
        super();
        this.recordIds = [ ...(typeof recordIds === 'string' ? this.#splitIdString(recordIds) : recordIds) ];
    }

    static init(recordIds){ return new SObjectCollectionGET(recordIds); }

    async *getPrompts(){
        /** @type {Array<import('../../../types/command/Diviner').Question>} */
        const prompts = [{
            name: 'recordId',
            message: 'Enter one or more recordIds separated by comma (,)',
            type: 'input',
            required: true,
            validate: (value) => {
                if(value !== 'done'){
                    this.recordIds.push(...this.#splitIdString(value));
                }

                return true;
            }
        }];
        // recursive until 'done'
        while(this.recordId !== 'done'){
            yield prompts;
        }
    }

    /** 
     * @param {string} idString comma-separated list of recordIds 
     * @returns {Array<string>}
     */
    #splitIdString(idString){
        return idString.replace(/\s/g, '').split(',');
    }

    async readyToExecute(){
        return this.recordIds?.length;
    }

    async finish(){
        return new this.subrequestTypes.sobject(this.referenceId, 'GET', this.sobject).get(this.recordIds);
    }
}

module.exports = SObjectCollection.init;