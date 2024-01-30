const { ent } = require('./index.js');

(async()=>{
    const Ent = ent();
    Ent
        .generate()
        // .query('the query')
        // .query('another query')
        // .finish();

    const result = await Ent;

    debugger; 
})();