const { prompt } = require('enquirer');

/**
 * @typedef {object} DivinerArgs
 * @property {boolean} interactive whether the user is available to provide input (true) or not (false)
 */

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
 * @property {(name: string, value: any, prompt: Enquirer.Prompt): boolean | Promise<boolean>} [onSubmit] this will always be set to instances answerHandler() method
 * @property {(name: string, value: any, prompt: Enquirer.Prompt): boolean | Promise<boolean>} [onCancel]
 */
 
/**
 * Diviner is an eventful base class for all instances that must introspect the arguments
 * passed to their constructors and fire a payload to listeners after processing
 * @class
 */
class Diviner /** extends EventEmitter */{
    /**
     * @constructor
     * @argument {DivinerArgs} args the arguments expected by the instance, or none (interactive mode)
     */
    constructor(args={}){
        this.args = args;
        Object.defineProperties(this, {
            _throwNotImplemented: {
                value: function(methodName){
                    throw new Error(`${methodName} has not been properly implemented by ${Object.getPrototypeOf(this).name}`);
                }
            }
        });
        // Object.defineProperties(this, {
        //     _cbFn: {
        //         value: []
        //     },
        //     _handleCb: {
        //         value: function(payload){
        //             this._cbFn.forEach(fn => fn(payload));
        //         }
        //     }
        // })
        // this.addListener('done', this._handleCb);
    }

    /**
     * pass a callback to be invoked when `done` event is fired
     * @param {Function} cbFn callback function that will be called when the 'done' event is fired
     * @listens Diviner#done
     */
    // onDone(cbFn){
    //     this._cbFns.push(cbFn);
    // }

    /**
     * Runs a concrete Diviner instance's logic after validating/gathering all required inputs
     * @returns {Promise<any>}
     */
    async run(){
        await this.preRun();
        let readyStatus = await this.readyToExecute();
        if(typeof readyStatus === 'string'){
            if(!this?.args?.interactive){
                throw new Error(`Missing required data: ${readyStatus}`);
            }

            // if interactive, prompt user for required data
            const generator = this.getPrompts(); 
            let prompts = await generator.next();
            while(!prompts.done){
                const answers = await prompt(prompts.value);
                Object.assign(this, answers);
                prompts = await generator.next();
            }
        }

        // check again and run
        readyStatus = await this.readyToExecute()
        if(typeof readyStatus === 'string'){
            throw new Error(`Unable to execute due to following error: ${readyStatus}`);
        }

        return await this.execute();
    }

    /**
     * Called before run() to allow commands to perform setup as necessary
     */
    async preRun(){  }
    
    /**
     * Returns true when all Diviner has all necessary data to execute() or an error string, when it does not
     * @returns {Promise<boolean|string>}
     */
    async readyToExecute(){ this._throwNotImplemented('readyToExecute()'); }

    /**
     * The prompts used by the Diviner when in interactive mode to get necessary data for run()
     * @returns {AsyncGenerator<Array<Question>>} GeneratorFunction that returns an Array<Question> 
     * when it needs more info from the user. Calls to next() yield a new array until all info is gathered.
     * All answers will be assigned as instance properties during run();
     */
    async *getPrompts(){ this._throwNotImplemented('*getPrompts()'); }
    
    /**
     * Execute logic after all data is ready; should be called only by run()
     * @returns {Promise<any>}
     */
    async execute(){ this._throwNotImplemented('execute'); }
}

/**
 * @event Diviner#done
 * @type {any} the expected payload
 */

module.exports = Diviner;