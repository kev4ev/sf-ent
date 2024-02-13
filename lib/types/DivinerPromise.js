/** @module */

/** @typedef {import('./Diviner').Diviner} Diviner */

const { merge } = require('merge');
const Diviner = require('./Diviner');
const log = require('../utils/logging/log').extend('DivinerPromise');

let rootDivinerPromise;

/**
 * Allows a parent Diviner to relay execution to a child which will resolve or reject it. By extending 
 * the returned promise it allows the additional methods to effectively be used as then() calls.
 * @class
 */
class DivinerPromise extends Promise {

    /**
     * @param {Function} executorFn the Promise's executor function provided by divine()
     * @param {Diviner} diviner the newly-constructed Diviner whose run() method this Promise wraps
     * @param {Diviner} [parent] when a parent Diviner includes a subdiviner API, the host diviner's 
     * lifecycle handler will be called for each child Diviner's lifecycle events
     */
    constructor(executorFn, diviner, parent){
        super(executorFn);
        this.diviner = diviner;
        this.parent = parent;
    }

    /**
     * Extends the returned Promise with a synchronous API to enable method chaining
     * @param {Object.<string, function(DivinerArgs, ...any): Diviner>} subDivinerHash
     */
    extend(subDivinerHash){
        Object.entries(subDivinerHash).forEach(subDiviner => {
            if(subDiviner){
                const [ key, fn ] = subDiviner;
                this[key] = (...args) => {
                    // first constructor arg must always be DivinerArgs or a derivative and 
                    // will be merged with the args of the parent
                    const argObj = merge(this.diviner.args, args.length > 0 ? args.shift() : {});
                    // instantiate child Diviner
                    const instance = fn(argObj, ...args);
                    // if instance is not a Diviner, break relay chain and return the root promise
                    if(!instance || !(instance instanceof Diviner)){
                        log('Function call did not not return a Diviner.');
                        log('Terminating relay and returning rootDivinerPromise');

                        return rootDivinerPromise;
                    }
                    // all api extensions must also return a DivinerPromise
                    return DivinerPromise.eagerRelay(instance, this.diviner);
                }
            }
        });

        return this;
    }

    /**
     * Wraps a Diviner's execution in a DivinerPromise, which is decorated with a custom api via diviner.getSubDiviners().
     * In this way the caller can call all subdiviners along the chain as if they were synchronous, and await only
     * the top level (rootDivinerPromise) or any of the Promises returned along the way.
     * 
     * Relay continues recursively until a decorated function is called that does not return a Diviner instance, such
     * as the Command class's done() method, at which point the rootDivinerPromise is retruned.
     * ```js
     * await topLevel().sub1().sub2().sub3().done();
     * ```
     * @param {Diviner} diviner Diviner instance that whose execution will be wrapped in DivinerPromise
     * @param {Diviner} [parent] when relaying, the parent Diviner that will be registered as a listener for events
     * emitted by the child Diviner; should only be set internally
     * @returns {DivinerPromise}
    */
    static eagerRelay(diviner, parent){
        const divinerName = diviner.constructor.name;
        log(`Starting eagerRelay for ${divinerName} ${parent ? `, parent is ${parent.constructor.name}` : ''}`);
        const relay = new DivinerPromise(async (res, rej) => {
            // add parent and delegate/externalize promise fulfillment functions to diviner
            diviner.parent = parent;
            diviner.runResolver = res;
            diviner.runRejector = rej;
            // resolver = res;
            // rejecter = rej;

            await diviner.run();
        }, diviner, parent);
        // if the diviner defines a subDiviner API, extend the returned Promise with it
        const subDivinerHash = diviner.getSubDiviners();
        if(subDivinerHash){
            relay.extend(subDivinerHash);
        }

        // set as root exactly 1 time
        if(!rootDivinerPromise){
            log(`Setting rootDivinerPromise to resolve execution of ${divinerName}`);
            rootDivinerPromise = relay;
        }

        return relay;
    }
    
}

module.exports = DivinerPromise.eagerRelay;