const { Command } = require('../../../../types/command/');
const { getObjectPrompts } = require('../../../../utils/prompts/schemaPrompts');
const subs = require('./subs');

class SObject extends Command{

    #subs = [];

    /**
     * 
     * @param {string} sobject required; the api name of the sobjecttype for this request
     * @param {string} [referenceId] optional, custom reference id to use for the request; when ommitted
     * a referenceId is automatically generated based on request type
     */
    constructor(sobject, referenceId){
        super();
        this.sobject = sobject;
        this.referenceId = referenceId;
    }
    
    /**
     * 
     * @param {string} sobject api name of the sobject
     * @returns 
     */
    static init(sobject){
        return new SObject(sobject);
    }

    static interactiveMeta(){
        return{
            name: 'SObject',
            hint: 'create a subrequest for a given sobject type'
        }
    }

    getSubDiviners(){
        return subs;
    }

    async *getPrompts(){
        yield this.promptFactory(...(await getObjectPrompts()));
    }

    /**
     * overrides default so that only one subcommand is invoked per instance
     */
    async executeInteractive(){
        return await super.executeInteractive(1);
    }

    async readyToExecute(){ return this.sobject ? true : 'sobject must be provided'; }

    async handleSubDivinerEvent(evt, payload, diviner){
        if(diviner && evt === 'called') diviner.sobject = this.sobject;
        
        if(evt === 'done'){
            if(payload) this.#subs.push(payload);

            if(this.readyToResolve){
                this.doneResolver(this.#subs);
            }
        }
    }
}

module.exports = SObject;