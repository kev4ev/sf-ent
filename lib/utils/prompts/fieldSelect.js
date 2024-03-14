const assister = require('../sf/schemaAssist');
const connect = require('../diviners/Connect');
let { done, allFields, atReference } = require('./symbols');
const { prompt } = require('enquirer');
const referencePrompt = require('./reference');
const KeyBoundPrompt = require('./KeyBoundPrompt');
// shorten
const DONE = done.description;
const ALL_FIELDS = allFields.description;
const AT_REFERENCE = atReference.description;

/**
 * @typedef {object} Options
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
 * @returns {Promise<Array<import('../../types/command/Diviner').Question>>}
 */
async function getFieldPrompts(sobject, options={ }){
    let { enableAtReference, enableSelectAll, enableSetMode, removeSelected, refIdExclusions, filterHash, getHandler, setHandler } = options;
    refIdExclusions = !refIdExclusions ? 
        undefined : 
        (Array.isArray(refIdExclusions) ? refIdExclusions : [ refIdExclusions ]);
    // get connection
    const conn = await connect.init().run();
    // get fields
    const api = assister(conn);
    /** @type {Array<import('../../types/command/Diviner').Choice>} */
    const fieldChoices = await api.getFields(sobject, filterHash);
    if(enableSelectAll) fieldChoices.splice(0, 0, { name: ALL_FIELDS, value: ALL_FIELDS, hint: 'Select all fields' });
    fieldChoices.splice(0, 0, { name: DONE, value: DONE, hint: 'select to complete field selection' });
    // store all selections and lastSelected value
    let lastSelected, allSelected = [];
    /** @type {Array<import('../../types/command/Diviner').Question>} */
    const prompts = [
        {
            name: 'field',
            message: `Select ${sobject} field ${enableSetMode ? 'to set' : ''}`,
            type: 'autocomplete',
            required: true,
            choices: ()=> removeSelected ? fieldChoices.filter(field => allSelected.includes(field) !== true) : fieldChoices,
            limit: 5,
            suggest: autocompleteMatcher,
            result: async (field) => {
                if(field !== DONE){
                    lastSelected = field;
                    allSelected.push(field);
                }

                if(getHandler) await getHandler(field);

                return field;
            }
        }
    ];
    if(enableSetMode){
        prompts.push({
            name: 'fieldVal',
            message: `Enter value for ${sobject}.${lastSelected}`,
            type: 'input',
            footer: enableAtReference ? `Type ${AT_REFERENCE} to reference another request` : '',
            required: () => lastSelected !== DONE,
            skip: () => lastSelected === DONE,
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
    symbols: { done, allFields } 
};