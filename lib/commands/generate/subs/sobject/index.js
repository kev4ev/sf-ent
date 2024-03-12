const { Command } = require('../../../../types/command/');
const assist = require('../../../../utils/sf/schemaAssist');
const { prompt } = require('enquirer');
const subs = require('./subs');
const { autocompleteMatcher } = require('./util');

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