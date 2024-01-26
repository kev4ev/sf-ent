const { prompt } = require('enquirer');

/**
 * @typedef {object} DivinerArgs args object that may be expanded by extending classes; each Diviner arg should
 * receive only the config properties relevant to it to avoid pollution; other information can 
 * be passed as additional constructor args
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
        // define private props
        Object.defineProperties(this, {
            _throwNotImplemented: {
                value: function(methodName){
                    throw new Error(`${methodName} has not been properly implemented by ${Object.getPrototypeOf(this).name}`);
                }
            },
            _args: {
                value: args,
                writable: true
            }
        });
    }

    /** Useful when args must be modified after super() call, e.g. Command class */
    set args(args){ this._args = args; }
    get args(){ return this._args; }

    /**
     * Runs a concrete Diviner instance's logic after validating/gathering all required inputs
     * @returns {Promise<any>}
     */
    async run(){
        // init chalk for all instances
        this.chalk = await require('../utils/chalk-cjs')();
        // prerun lifecycle
        await this.preRun();
        // conditionally execute
        let readyStatus = await this.readyToExecute();
        if(typeof readyStatus === 'string' || readyStatus === false){
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
    async preRun(){ /** subclasses MAY implement */ }
    
    /**
     * Returns true when all Diviner has all necessary data to execute() or an error string, when it does not
     * @returns {Promise<boolean|string>}
     */
    async readyToExecute(){ this._throwNotImplemented('readyToExecute()'); }

    /**
     * The prompts used by the Diviner when in interactive mode to get necessary data for run()
     * @yields {Array<Question>} GeneratorFunction that returns an Array<Question> 
     * when it needs more info from the user. Calls to next() yield a new array until all info is gathered.
     * All answers will be assigned as instance properties during run();
     */
    async *getPrompts(){ this._throwNotImplemented('*getPrompts()'); }
    
    /**
     * Execute logic after all data is ready. Must either immeditaley return the result of execution or delegate
     * relay execution to another Diviner. Execution may be relayed an unlimited number of times so long 
     * as the command completes as expected in interactive and non-interactive modes.
     * @returns {Promise<any>}
     * ```
     * // example of relaying execution
     * return await eagerDiviner(DivinerProto, this.args);
     * ```
     */
    async execute(){ this._throwNotImplemented('execute'); }

    /**
     * Allows execution relay between Diviners; the constructed diviner inherits all 
     * enumerable properties of the relaying instance
     * @param {Function} divinerProto class/prototype fn of the Diviner that will receive relay execution
     * @param {...any} args additional constructor args defined by relay receiver
     */
    async relay(divinerProto, ...args){
        const receiver = new divinerProto(this, ...args);

        return await receiver.run();
    }
}

/**
 * @event Diviner#done
 * @type {any} the expected payload
 */

/**
 * Wraps a Diviner in an async fn that constructs it and eagerly calls run(). Useful for Diviners that
 * run other Diviners.
 * @param {DivinerArgs} divinerProto
 */
function eagerDiviner(divinerProto){
    /**
     * 
     * @param {DivinerArgs} divinerArgs 
     * @param  {...any} args any additional args to pass to the Diviner instance's constructor
     * @returns {function: Promise<any>}
     */
    const initFn = async function(divinerArgs, ...args){
        const instance = new divinerProto(divinerArgs, ...args);

        return await instance.run();
    };

    return initFn;
}

module.exports = {
    Diviner,
    eagerDiviner
}