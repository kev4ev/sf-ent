const log = require('../logging/log').extend('PromptUtil');
/** @type {import('chalk').ChalkInstance} */
let chalk;

/** 
 * A factory for producing Enquirer prompts. Should be used rather than direct
 * interface implementation for better runtime stability. For example, factory method wraps validate() methods, **which
 * get called even when a prompt is skipped and not presented to user**, which can result in silent failures.
 * @module 
 */

/**
 * Type definition copied from enquirer interface
 * @typedef {object} Question
 * @property {string | (() => string)} name
 * @property {string | (() => string)} type any of: {@see https://www.npmjs.com/package/enquirer#built-in-prompts}
 * autocomplete | confirm | editable | form | input | invisible | list | list | multiselect | numeral | password | scale | select | snippet | sort | survey | text
 * @property {string | (() => string) | (() => Promise<string>)} message
 * @property {string | (() => string)} [footer] message to display at bottom of terminal
 * @property {Array<string | Choice>} [choices] valid only for types extending ArrayPrompt ('autocomplete', 'select', etc)
 * @property {string} [prefix]
 * @property {string|function():string} [initial]
 * @property {boolean} [required=false]
 * @property {((state: object) => boolean | Promise<boolean>) | boolean} [skip]
 * @property {boolean | string} [enabled=true]
 * @property {boolean | string} [disabled=false]
 * @property {function(string): string | Promise<string>} [format] Function to format user input in the terminal.
 * @property {function(string): boolean | string | Promise<boolean | string>} [validate] Function to validate the submitted value before it's returned. This function may return a boolean or a string. If a string is returned it will be used as the validation error message.
 * @property {function(string): string | Promise<string>} [result] 	Function to format the final submitted value before it's returned.
 * @property {function(string, any, Enquirer.Prompt ): boolean | Promise<boolean>} [onCancel] event handler when user hits keyboard ESC
 * @property {function(string, any, Enquirer.Prompt ): boolean | Promise<boolean>} [onSubmit] event handler when user hits keyboard return
 * @property {string} [template] valid only for type 'snippet'; ex: `{ "name": "\${name}" }`
 * @property {Array<SnippetField>} [fields] valid only for type 'snippet'
 */

/** @typedef {Question} FactoryQuestion */

// local symbol to tell if a passed-in question has already been wrapped
const factoried = Symbol('factoried');

/**
 * Factory function that takes 1-n Question objects, wraps them, and returns the same
 * @param  {...Question} questions one or more questions to build
 * @returns {Array<FactoryQuestion>}
 */
module.exports = (...questions) => {
    return questions.map(question => {
        if(!question[factoried]){
            question[factoried] = true;
            // wrap validate; else silent errors can occur here when one prompt is used within another and validation fails
            const { validate } = question;
            if(validate){
                // do not use arrow functions, such that runtime "this" can be maintained for wrapped functions
                question.validate = async function(input){
                    try{
                        const result = await validate.call(this, input);
    
                        if(result !== true){
                            if(!chalk) chalk = (await require('../logging/chalk-cjs')());
                            log(chalk.yellow(`input validation failed; question name ${this?.name ?? 'unkown'}`));
                        }
    
                        return result;
                    } catch(err){
                        throw err;
                    }
                }
            }
        }

        return question;
    });
}