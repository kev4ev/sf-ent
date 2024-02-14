const { ent } = require('./index.js');

(async()=>{
    const result0 = 
        await ent()
            .generate({ out: './' })
            .query({ query: 'SELECT Id FROM Case LIMIT 5' })
            // .query('another query')
            .done(); // returns root resolver

    debugger;

    const intermediate = ent().generate({ out: './' });
    const result1 = intermediate.query({ query: 'SELECT Id FROM Case LIMIT 5' }).done();

    const results = await Promise.all([ intermediate, result1 ]);

    debugger;
})();