const { Command } = require('../../../../types/command/');
const { getObjectPrompt } = require('../../../../utils/prompts/schemaPrompts');
const subs = require('./subs');

class SObject extends Command{

    #subs = [];

    constructor(sobject){
        super();
        this.sobject = sobject;
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
        await this.connection;

        /** @type {Array<import('../../../types/command/Diviner').Question>} */
        const prompts = [ await getObjectPrompt() ];
        if(!this.requiresConnection){
            Object.assign(
                prompts[0], 
                {
                    type: 'input',
                    choices: undefined,
                    footer: undefined
                }
            );
        }
        yield prompts;
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
                diviner.connection = this.connection;
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