const { getRegistry } = require('../request/referenceRegistry');
const factory = require('../prompts/factory');
const { responseAccessorParts } = require('../../types/api/CompositeSubRequest');

/**
 * Returns a prompt that provides referenceId selection
 * @param {string|Array<string>} excludeIds 
 * @param {boolean} [includeSetter=true] optional; when false, setter prompt will not be included 
 * @returns {Array<import('../prompts/factory').FactoryQuestion>}
 */
module.exports = (excludeIds=[], includeSetter=true) => {
    excludeIds = Array.isArray(excludeIds) ? excludeIds : [ excludeIds || '' ];
    const items = () => {
        return Object.values(getRegistry())
            .map(registry => registry.itemHash)
            .reduce((prev, curr) => {
                if(curr){
                    prev.push(...Object.values(curr)
                        .filter(val => !excludeIds.includes(val?.referenceId))
                        .map(val => {
                            return {
                                name: val.referenceId,
                                value: val
                            };
                        }));
                }

                return prev;
            }, []);
    };
                    
    // exit to avoid enquirer error on empty choices
    if(items().length === 0){
        return console.error('No available requests to reference');
    }

    // closure variables needed for setter
    let normalized, externalized;
    /** @type {Array<import('../../types/command/Diviner').Question>} */
    const prompts = [
        {
            message: 'Select a request to reference',
            name: 'referenceId',
            type: 'autocomplete',
            required: true,
            choices: async () => items(),
            result: (value) => {
                if(includeSetter){
                    externalized = value;
                    normalized = `@{${value?.referenceId}.`;
                }

                return value?.referenceId;
            }
        }
    ];
    if(includeSetter){
        const externalizedFields = [];
        prompts.push(
            {
                message: 'Complete the remainder of the reference',
                name: 'referenceId',
                type: 'snippet',
                required: true,
                template: () => {
                    const templateParts = externalized[responseAccessorParts];
                    if(!templateParts){
                        externalizedFields.push({ name: 'remainder', message: 'Complete reference notation' });

                        return `${normalized}\${remainder}`;
                    }
                    // build from templateParts
                    let tmpl = normalized;
                    while(templateParts.length > 0){
                        const part = templateParts.shift();
                        if(typeof part === 'string'){
                            tmpl += part;
                            
                            continue;
                        }
                        // part is a field, process as such
                        const { name } = part;
                        tmpl += '\${' + name + '}';
                        externalizedFields.push(part);
                    }

                    return tmpl;
                },
                fields: externalizedFields,
                result: ({ result }) => {
                    result = result?.trim();
                    normalized = result.endsWith('}') ? result : result + '}';
    
                    return normalized;
                }
            }
        );
    }

    return factory(...prompts);
}