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

/**
 * Reusable function for interactive field setting prompts; MUST
 * be bound to a this by caller (i.e. sobjectFieldSetter.call(this, ...args))
 * @param {Array<string>} fieldChoices autocomplete options
 * @param {Object.<string, any>} valHash mapping of field names to values
 */
function* fieldSetterPrompts(fieldChoices, valHash){
    while(this.field !== 'done'){
        /** @type {Array<import('../../../types/command/Diviner').Question>} */
        let prompts = [
            {
                name: 'field',
                message: `Enter the ${this.sobject} field to set`,
                type: 'autocomplete',
                required: true,
                choices: fieldChoices,
                limit: 5,
                suggest: autocompleteMatcher
            }
        ];
        yield prompts;
        if(this.field !== 'done'){
            prompts = [
                {
                    name: 'val',
                    message: `Enter value for ${this.field}`,
                    type: 'input',
                    required: this.field !== 'done',
                    skip: this.field === 'done',
                }
            ];
            yield prompts;

            valHash[this.field] = this.val;
        }
    }
}

module.exports = {
    autocompleteMatcher,
    fieldSetterPrompts
}