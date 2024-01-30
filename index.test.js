const { ent } = require('./index.js');

(async()=>{
    const ent = ent();
    ent
        .generate()
            .query('the query')
            .query('another query')
            .finish();

    await ent;
})();