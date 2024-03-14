/** @module */

const { Prompt } = require('enquirer');

/**
 * Returns a decorated Enquirer question object that intercepts keypress events and calls the
 * provided handler functions when the bound key is pressed; 
 * @param {Question} options enquirer Question object options
 * @param {Bindings} bindings 
 * @returns {Question & { keypress<function>}}
 */
function bind(options, bindings){
    // do not use arrow function to ensure 'this' will be the Prompt instance when called
    options.keypress = async function(input, event = {}){
        const handler = bindings[input];
        if(handler){
            input = await handler(this, input);
            this.state.value = `${this.state.input}${input}`;
            this.moveCursor(input.length - 1); // keypress will move the additional space
        }
        
        await Prompt.prototype.keypress.call(this, input, event);
    };

    return options;
}

/**
 * @typedef {import('../../types/command/Diviner').Question} Question
 */

/**
 * @typedef {Object.<string, function(prompt<Prompt>, keypress<string>, event<object>): string | Promise<string>>} Bindings
 */

module.exports = bind;