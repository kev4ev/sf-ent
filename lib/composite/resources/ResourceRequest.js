class ResourceRequestBuilder /** extends Prompt */{
    /**
     * 
     * @param  {...any} args positional arguments that correspond to the Prompts returned by *getPrompts()
     */
    constructor(...args){

    }
    
    /**
     * Return an array of Prompts
     * @returns {AsyncGenerator<Prompt>}
     */
    async *getPrompts(){ this.throwNotImplemented(); }
    getPath(){ this.throwNotImplemented(); }

    throwNotImplemented(){
        throw new Error(`Subclass ${Object.getPrototypeOf(this).name} must implement the method called.`);
    }
}

module.exports = ResourceRequestBuilder;

/**
 * Type definition copied from enquirer interface
 * @typedef {object} Question
 * @property {string | (() => string)} name
 * @property {string | (() => string)} type
 * @property {string | (() => string) | (() => Promise<string>)} message
 * @property {string} [prefix]
 * @property {any} [initial]
 * @property {boolean} [required=false]
 * @property {boolean | string} [enabled=true]
 * @property {boolean | string} [disabled=false]
 * @property {(value: string): string | Promise<string>} [format]
 * @property {(value: string): string | Promise<string>} [result]
 * @property {((state: object) => boolean | Promise<boolean>) | boolean} [skip]
 * @property {(value: string): boolean | string | Promise<boolean | string>} [validate]
 * @property {(name: string, value: any, prompt: Enquirer.Prompt): boolean | Promise<boolean>} [onSubmit]
 * @property {(name: string, value: any, prompt: Enquirer.Prompt): boolean | Promise<boolean>} [onCancel]
 */