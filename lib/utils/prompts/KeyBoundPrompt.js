/** @module */

const { prompt } = require('enquirer');
const log = require('../logging/log').extend('KeyBoundPrompt');

/**
 * Returns a decorated Enquirer question object that sets a custom result() function on the prompt
 * interface to intercept the result and pass to appropriate handler(s) defined in bindings
 * @param {Question} options enquirer Question object options
 * @param {Bindings} bindings 
 * @returns {Question}
 */
function bind(options, bindings){
    // do not use arrow function to ensure 'this' will be the Prompt instance when called
    options.result = async function(input){
        /** @type {string} */
        let result = input.result;
        const handlerSearch = [];
        Object.keys(bindings).forEach(key => { 
            // get all positions of bound keys within input
            const iter = result.matchAll(key);
            let iterNext;
            while(!iterNext?.done){
                const { value } = iterNext = iter.next();
                if(value){
                    handlerSearch.push({
                        key,
                        pos: value.index,
                        handler: bindings[key]
                    });
                }
            }
        });
        if(handlerSearch.length > 0) handlerSearch.sort((a, b) => a.pos - b.pos);
        for(const searchRes of handlerSearch){
            const { key, pos, handler } = searchRes;
            if(pos > -1){
                log(`Bound key handler found for '${key}'. Invoking...`);
                const handlerRes = await handler(this, key),
                    transform = input.result.replace(key, handlerRes);
                console.log(`Input changed:\nOLD: ${input.result}\nNEW: ${transform ?? ''}`)
                input.result = transform;
            }
        }

        return input;
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