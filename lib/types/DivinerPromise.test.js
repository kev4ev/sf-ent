const DivinerPromise = require('./DivinerPromise');

(async()=>{
    const extension = {
        one(...args){
            return new Promise((res, rej) => {
                res(1);
            });
        }, 
        two(...args){
            return 2;
        }
    };
    const prom = new DivinerPromise((res, rej) => {
        setTimeout(()=>{
            res(42);
        }, 3000);
    });
    prom.extend(extension);
    // prom.extend(extension);

    const result1 = await prom.one('arg1', 1, {});
    const result2 = await prom.two('arg2', 2, []);

    debugger;
})();