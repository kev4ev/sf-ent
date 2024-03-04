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
            CREATE: wrap(subs.SObjectPOST.init).bind(this),
            READ: wrap(subs.SObjectGET.init).bind(this),
            // only practically relevant for interactive use; though is accessible via lib
            'READ (by external id)': wrap(subs.SObjectGET.initExt).bind(this), 
            UPDATE: wrap(subs.SObjectPATCH.init).bind(this),
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

module.exports = SObject.init;