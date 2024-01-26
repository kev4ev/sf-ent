const Ent = require('./index.js');

(async()=>{
    const ent = new Ent()
    await ent
            .generate({ out: './output.json' })
        
        
})();