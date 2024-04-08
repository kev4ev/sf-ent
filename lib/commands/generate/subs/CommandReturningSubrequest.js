const subrequests = require('../../../api/composite')().subrequests;
const SubCommand = require("../../../types/command/SubCommand");
const { register, registerCustom } = require('../../../utils/request/referenceRegistry');
const { prompt } = require('enquirer');

// module variable that controls whether user is prompted to select refId type
let ALWAYS_STD = false;

class CommandReturningSubrequest extends SubCommand{
    
    #customRefId;
    #prefix;
    #referenceId;

    /**
     * @constructor
     */
    constructor(){
        super();
        this.subrequestTypes = subrequests;
    }

    set referenceId(refId){
        this.#customRefId = refId;
    }

    set referenceIdPrefix(prefix){
        this.#prefix = prefix;
    }

    get referenceId(){ return this.#referenceId; }

    async preRun(){
        if(this.interactive && !ALWAYS_STD){
            // surface customId prompt here
            const { idType } = await prompt(this.promptFactory(
                {
                    message: 'Select auto-generated or custom referenceId',
                    name: 'idType',
                    type: 'autocomplete',
                    choices: [
                        { name: 'Auto-generate reference id', value: 'std' },
                        { name: 'Enter custom id', value: 'custom', hint: 'enter a unique custom id for the request' },
                        { name: 'Do not ask again', value: 'dna', hint: 'use auto-generated ids for remainder of cli session' }
                    ],
                    required: true
                }
            ));

            if(idType === 'dna') return ALWAYS_STD = true;

            if(idType === 'custom'){
                const { custom } = await prompt(this.promptFactory(
                    {
                        message: 'Enter custom referenceId',
                        name: 'custom',
                        type: 'input',
                        footer: 'custom ids must be unique and may not include underscores (_)',
                        required: true,
                        validate: (refId) => {
                            if(refId){
                                const invalid = refId.search(/[^a-zA-Z0–9]/g);
                                
                                return invalid > -1 ? 'custom referenceIds may include only letters and numbers' : true;
                            }
    
                            return true;
                        },
                        onCancel: () => this.#referenceId
                    }
                ));

                if(custom && custom !== this.#referenceId) this.#customRefId = custom;
            }
        }
    }

    /**
     * Shadows superclass such that a custom reference id can be set without passing via constructor
     */
    getSubDiviners(){
        return Object.assign(
            {
                /**
                 * allows a custom reference id to be set on the request when in non-interactive (lib) mode
                 * @param {string} referenceId custom referenceId to set for the subrequest
                 * @returns {DivinerPromise}
                 */
                refId: (referenceId) => {
                    this.referenceId = referenceId;
                    // return super's DivinerPromise which will already be decorated with the appropriate api
                    return this.parent.runPromise;
                }
            },
            super.getSubDiviners()
        );
    }

    async execute(){
        this.#referenceId = 
            this.#customRefId ? 
            registerCustom(this, this.#customRefId) :
            register(this, this.#prefix);

        return await super.execute();
    }
}

module.exports = CommandReturningSubrequest;