const assister = require('../schema/assist');
const connect = require('../connection/Connect');
const symbols = require('./symbols');
const { prompt } = require('enquirer');
const referencePrompt = require('./reference');
const factory = require('../prompts/factory');
// shorten
const CANCEL = Symbol.keyFor(symbols.cancel);
const DONE = Symbol.keyFor(symbols.done);
const ALL_FIELDS = Symbol.keyFor(symbols.allFields);
const AT_REFERENCE = Symbol.keyFor(symbols.atReference);
const ASSIST = Symbol.keyFor(symbols.assist);

/** @type {import('../connection/cache').ConnectionInterface} */
let conn;
let api;
let chalk;

/**
 * 
 * @param {object} conn placeholder object (a local var) to be conditionally set to Connection
 * @param {object} api placeholder object (a local var) to be conditionally set to assist api
 * @param {Boolean} [initConnection=false] force establishing an authorized org connection 
 */
async function initModuleVars(initConnection = false){
    conn = connect.current ?? (initConnection ? await connect.init().run() : undefined);
    api = conn ? assister(conn) : undefined;
}

async function getObjectPrompts(){

    if(!chalk) chalk = await require('../logging/chalk-cjs')();

    let objects;
    const setClosureVars = async (initConnection = false) => {
        await initModuleVars(initConnection);
        objects = api ? await api.getObjects() : undefined;
    };
    await setClosureVars();
    // encapsulate prompt as may need to use it twice
    const getPrompt = () => {
        return {
            message: 'Enter SObject type',
            name: 'sobject',
            type: () => objects ? 'autocomplete' : 'input',
            choices: () => objects,
            limit: 5,
            required: true,
            footer: () => {
                return objects ? '' : 
                    chalk.yellow(
                        'Enter ! for schema assist (requires org connection)' + 
                        (typeof this.onCancel === 'function' ? '\nESC to cancel' : '')
                    );
            },
            suggest: autocompleteMatcher
        };
    }

    return factory(
        Object.assign(
            getPrompt(),
            {
                result: async function(input){
                    if(input === ASSIST){
                        // establish connection and reset vars
                        await setClosureVars(true);
                        // surface inner prompt
                        const inner = factory(getPrompt());
                        const { sobject } = await prompt(inner);

                        return sobject;
                    }

                    return input;
                }
            }
        )
    );
}

/**
 * @typedef {object} Options
 * @property {boolean} [forceConnection=false] optiona; when true, the user will be forced to authorize an org before prompts are initialized
 * @property {boolean} [enableSelectAll=false] optional; when true, user will be able to select all fields
 * @property {boolean} [enableAtReference=false] optional; when true, user will be able to reference any of the available
 * requests from the referenceRegistry
 * @property {boolean} [enableSetMode=false] optional; when true, user will be prompted to set the field value after selection
 * @property {boolean} [removeSelected=false] optional; when true, previously selected fields will be filtered out the next time the prompt is run
 * @property {string|Array<string>} [refIdExclusions] optional; when enableAtReference is true, id(s) provided
 * here will be excluded from the selectable options presented to the user; typically used to exclude the caller's own refId
 * @property {Object.<string, any>} [filterHash] optional; hash of field metadata properties and values to filter selectable fields
 * @property {function(field<string>): Promise<any>} [getHandler] function that will be called when field is selected
 * @property {function(field<string>, value<any>): Promis<any>} [setHandler] function that will be called when value is set for a selected field
 */

/**
 * 
 * @param {string} sobject the sobject name of the fields to be provided in prompt
 * @param {Options} [options]
 * @param {import('../prompts/factory').Question} [getterOverride] optional override to the returned getter (first) prompt
 * @returns {Promise<Array<import('../../types/command/Diviner').Question>>}
 */
async function getFieldPrompts(sobject, options={}, getterOverride={}){
    let { 
        forceConnection,
        enableAtReference, enableSelectAll, enableSetMode, 
        removeSelected, refIdExclusions, filterHash, 
        getHandler, setHandler 
    } = options;
    // handle ids to exclude
    refIdExclusions = !refIdExclusions ? 
        undefined : 
        (Array.isArray(refIdExclusions) ? refIdExclusions : [ refIdExclusions ]);
    // set connection-conditional vars
    /** @type {Array<import('../../types/command/Diviner').Choice>} */
    let fieldChoices;
    const setClosureVars = async (forceConnection=false) => {
        // get connection and fields if there is authorized connection
        await initModuleVars(forceConnection);
        fieldChoices = api ? await api.getFields(sobject, filterHash) : undefined;
        if(fieldChoices){
          if(enableSelectAll) fieldChoices.splice(0, 0, { name: ALL_FIELDS, value: ALL_FIELDS, hint: 'Select all fields' });
          fieldChoices.splice(0, 0, { name: DONE, value: DONE, hint: 'select to complete field selection' });
        }
    }
    await setClosureVars(forceConnection);
    // encapsulate prompt creation logic for getter to allow assist mode
    /**
     * @param {object} decoration unique keys to be assigned to getter prompt
     * @returns 
     */
    const getterPrompt = (decoration) => {
        return Object.assign(
            {
                name: 'field', 
                message: `${fieldChoices ? 'Select' : 'Enter'} ${sobject} field ${enableSetMode ? 'to set' : ''}`,
                required: true,
                limit: 5,
                footer(){ 
                    return fieldChoices ? 
                        '' : 
                        chalk.yellow(
                            '! for schema assist (requires org connection)' + 
                            (typeof decoration?.onCancel === 'function' ? '\nESC to exit field entry' : '')
                        ); 
                }
            },
            getterOverride, /** allow override of superficial attributes */
            {
                type: () => fieldChoices ? 'autocomplete' : 'input',
                choices: ()=> fieldChoices && removeSelected ? fieldChoices.filter(field => allSelected.includes(field) !== true) : fieldChoices,
                suggest: autocompleteMatcher,
                onSubmit(fieldName, value){
                    // if any value includes the dot (.) operator, add it as a choice
                    if(this.type?.() === 'autocomplete' && value.includes('.')) this.addChoice(value, 0);
                    
                    return true; 
                }
            },
            decoration);
    }
    // store all selections and lastSelected value
    let lastSelected, allSelected = [];
    const resultFn = async function(field){ // non-arrow to get context "this"
        if(field === ASSIST){
            await setClosureVars(true);

            const assistedGetter = getterPrompt();
            const answers = await prompt(assistedGetter);

            field = answers[assistedGetter.name];
        }

        lastSelected = field;
        if(field !== DONE && field !== CANCEL) allSelected.push(field);
        if(getHandler) await getHandler(field, this);

        return field;
    };
    const prompts = factory(
        getterPrompt({
            result: resultFn,
            onCancel: async function(){ return await resultFn(CANCEL); }, // getter in canceleable
            validate(value){
                if(this.type?.() === 'autocomplete'){
                    if([ ASSIST, DONE, CANCEL ].includes(value)) return true;
                    if(value?.length > 0){
                        const ranges = '[a-zA-Z0-9_.*]';
                        const regex = new RegExp(`^${ranges}+$`);
                        return value.search(regex) === -1 ?
                            `Fields must be entered individually and may only include the characters:\n${ranges}` :
                            true;
                    }
                }

                return true;
            }
        })
    );

    if(enableSetMode){
        prompts.push({
            name: 'fieldVal',
            message: () => `Enter value for ${sobject}.${lastSelected}`,
            type: 'input',
            footer: enableAtReference ? `Type ${AT_REFERENCE} to reference another request` : '',
            required: () => ![ DONE, CANCEL ].includes(lastSelected),
            skip: () => [ DONE, CANCEL ].includes(lastSelected),
            result: async (value) => {
                if(enableAtReference && value === AT_REFERENCE){
                    const { referenceId } = await prompt(referencePrompt(refIdExclusions));
                    value = referenceId;
                }
                if(setHandler) await setHandler(lastSelected, value);

                return value;
            }
        });
    }

    return prompts;
}

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

module.exports = { 
    getFieldPrompts,
    getObjectPrompts,
    symbols // export symbols used herein
};