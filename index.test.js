const { ent } = require('./index.js');

(async()=>{
    (await ent())
        .generate()
})();