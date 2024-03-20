const { getRegistry } = require('../request/referenceRegistry');
const factory = require('../prompts/factory');

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
            .map(registry => registry.items)
            .reduce((prev, curr) => {
                if(curr){
                    prev.push(...Object.keys(curr).filter(key => !excludeIds.includes(key)));
                }

                return prev;
            }, []);
    };
                    
    // exit to avoid enquirer error on empty choices
    if(items().length === 0){
        return console.error('No available requests to reference');
    }

    let normalized;
    /** @type {Array<import('../../types/command/Diviner').Question>} */
    const prompts = [
        {
            message: 'Select a request to reference',
            name: 'referenceId',
            type: 'autocomplete',
            required: true,
            choices: async () => items(),
            result: (value) => {
                if(includeSetter) value = `@{${value}`;
                
                return value;
            }
        }
    ];
    if(includeSetter){
        prompts.push(
            {
                message: 'Complete the remainder of the reference using dot and/or array notations',
                name: 'referenceId',
                type: 'snippet',
                required: true,
                template: () => `${normalized}\${remainder}`,
                fields: [
                    {
                        name: 'remainder',
                        message: 'Reference notation'
                    }
                ],
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