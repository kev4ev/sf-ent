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
        yield this.promptFactory(
            ...(await getObjectPrompts()),
            {
                message: 'Would you like to set a custom referenceId?',
                name: 'customId',
                type: 'autocomplete',
                choices: [
                    { name: 'No, automatically generate the referenceId', value: false },
                    { name: 'Yes, I would like to enter a custom referenceId', value: true }
                ],
                required: true
            }
        );

        if(this.customId){
            yield this.promptFactory(
                {
                    message: 'Enter custom referenceId',
                    name: 'referenceId',
                    type: 'input',
                    footer: 'Custom reference ids may not include underscores (_)',
                    required: false,
                    validate: (refId) => {
                        if(refId){
                            const invalid = refId.search(/[^a-zA-Z0–9]/g);
                            
                            return invalid > -1 ? 'custom referenceIds may include only letters and numbers' : true;
                        }

                        return true;
                    }
                }
            );
        }
    }

    /**
     * overrides default so that only one subcommand is invoked per instance
     */
    async executeInteractive(){
        return await super.executeInteractive(1);
    }

    async readyToExecute(){ return this.sobject ? true : 'sobject must be provided'; }

    async handleSubDivinerEvent(evt, payload, diviner){
        if(evt === 'called'){
            if(diviner){
                diviner.referenceId = this.referenceId;
                diviner.sobject = this.sobject;
            }
        }
        if(evt === 'done'){
            if(payload) this.#subs.push(payload);

            if(this.readyToResolve){
                this.doneResolver(this.#subs);
            }
        }
    }
}

module.exports = SObject;