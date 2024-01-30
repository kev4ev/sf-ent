/** @module */

/** @typedef {import('./Diviner').Diviner} Diviner */

/**
 * Allows a parent Diviner to relay execution to a child which will resolve or reject it. By extending 
 * the returned promise it allows the additional methods to effectively be used as then() calls.
 * @class
 */
class DivinerPromise extends Promise {

    /**
     * @param {Function} executorFn the Promise's executor function provided by divine()
     * @param {Diviner} [parent] when a parent Diviner includes a subdiviner API, the host diviner's 
     * lifecycle handler will be called for each child Diviner's lifecycle events
     */
    constructor(executorFn, parent){
        super(executorFn);
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
                    const instance = fn(...args);
                    // all api extensions must also return a DivinerPromise
                    return DivinerPromise.divine(instance, this.parent);
                }
            }
        });

        return this;
    }

    /**
     * @param {Diviner} diviner Diviner instance that whose execution will be wrapped in DivinerPromise
     * @param {Diviner} [parent] when relaying, the parent Diviner that will be registered as a listener for events
     * emitted by the child Diviner
     * @returns {DivinerPromise}
    */
    static divine(diviner, parent){
        // add externalized promise resolution functions to diviner
        let resolver, rejecter;
        // construct the Diviner instance
        diviner.runResolver = resolver;
        diviner.runRejector = rejecter;
        diviner.parent = parent;
        const runner = new DivinerPromise(async (res, rej) => {
            resolver = res;
            rejecter = rej;

            await diviner.run();
        });
        // if the diviner defines a subDiviner API, extend the returned Promise with it
        const subDivinerHash = diviner.getsubDivinerHash();
        if(subDivinerHash){
            runner.extend(subDivinerHash);
        }

        return runner;
    }
    
}

module.exports = DivinerPromise.divine;