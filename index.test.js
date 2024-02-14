const { ent } = require('./index.js');

(async()=>{
    // chain style
    const result0 = 
        await ent()
            .generate({ out: './' })
            .query({ query: 'SELECT Id FROM Case LIMIT 5' })
            .query({ query: 'another query' })
            .done(); // returns root resolver

    debugger;

    // intermediate style
    const intermediate0 = ent().generate({ out: './' }),
        intermediate1 = intermediate0.query({ query: 'SELECT Id FROM Case LIMIT 5' }),
        intermediate2 = intermediate1.query({ query: 'another query' }),
        result1 = intermediate2.done();


    const results = await Promise.all([ intermediate0, intermediate1, intermediate2, result1 ]);

    debugger;
})();