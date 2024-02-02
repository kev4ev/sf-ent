const { ent } = require('./index.js');

(async()=>{
    const result = 
    await ent()
        .generate({ out: './' })
            .query({ query: 'SELECT Id FROM Case LIMIT 5' })
            // .query('another query')
            .done();

    debugger; 
})();