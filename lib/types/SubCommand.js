const { Diviner } = require('./Diviner');

/**
 * A SubCommand fires the a 'ready' event when request string is ready, `prompt` event when
 * information is required from the user, and an 'error' event when an error is encountered
 * @class
 * @fires ready 
 * @fires prompt
 * @fires error
 */
class SubCommand extends Diviner{
    /**
     * 
     * @param  {object} args positional arguments that correspond to the Prompts returned by *getPrompts()
     */
    constructor(args){
        super(args);
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

module.exports = SubCommand;