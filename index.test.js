const { ent } = require('./index.js');

(async()=>{
    const result = ent()
        .generate({ out: './' })
            .query({ query: 'SELECT Id FROM Case LIMIT 5' })
            // .query('another query')
            .done(); // returns root resolver

    await result;

    console.log('here');

    debugger;
})();