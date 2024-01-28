class DivinerPromise extends Promise {

    // res = () => undefined;
    // rej = () => undefined;

    /**
     * 
     * @param {Object.<string, function>} thenableHash 
     */
    constructor(executorFn){
        super(executorFn);
    }

    extend(thenableHash){
        Object.entries(thenableHash).forEach(thenable => {
            if(thenable){
                const [ key, fn ] = thenable;
                const self = this;
                this[key] = new Proxy(fn, {
                    apply: (target, thisArg, ...args) => {
                        // const selfResult = await self; 

                        return target(...args);
                    }
                })
            }
        });

        return this;
    }
    
}

module.exports = DivinerPromise;