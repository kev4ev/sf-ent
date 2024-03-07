const { getRegistry } = require('../request/referenceRegistry');

/**
 * Returns a prompt that provides referenceId selection
 * @param {string|Array<string>} excludeIds 
 */
module.exports = (excludeIds) => {
    excludeIds = Array.isArray(excludeIds) ? excludeIds : [ excludeIds || '' ];
    let normalized;
    /** @type {Array<import('../../types/command/Diviner').Question>} */
    const prompts = [
        {
            message: 'Select a request to reference',
            name: 'referenceId',
            type: 'autocomplete',
            required: true,
            choices: () => {
                const items = Object.values(getRegistry())
                    .map(registry => registry.items)
                    .reduce((prev, curr) => {
                        if(curr){
                            prev.push(...Object.keys(curr).filter(key => !excludeIds.includes(key)));
                        }

                        return prev;
                    }, []);

                return items;
            },
            result: (value) => {
                normalized = `@{${value}`;
                
                return normalized;
            }
        },
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
    ];

    return prompts;
}