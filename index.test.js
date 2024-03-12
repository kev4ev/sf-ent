const { ent } = require('./index.js');

(async()=>{
    // chain style
    const result0 = 
        await ent()
            .generate({ out: './.generated' })
                .query('SELECT Id FROM Case LIMIT 5')
                .query('another query')
                .sobject('Contact')
                    .create({ FirstName: 'Jim', LastName: 'Bob', Custom_Bool__c: true })
                    .done()
                .sobject('Account')
                    .read('1234567')
                    .done()
                .sobject('Case')
                    .update('12345', { Subject: 'Updated Subject' })
                    .done()
                .query('subsequent query')
            .done(); // returns root resolver

    debugger;

    // intermediate style
    const inter0 = ent().generate({ out: './.generated' }),
        inter1 = inter0.query('SELECT Id FROM Case LIMIT 5'),
        inter2 = inter1.query('another query'),
        inter3 = inter2.sobject('Contact')
            .create({ FirstName: 'Jim', LastName: 'Bob', Custom_Bool__c: true })
            .done(),
        inter4 = inter3.sobject('Account')
            .read('1234567')
            .done(),
        inter5 = inter4.sobject('Case')
            .update('12345', { Subject: 'Updated Subject' })
            .done(),
        inter6 = inter5.query('subsequent query'),
        result1 = inter6.done();


    const results = await Promise.all([ 
        inter0,
        inter1,
        inter2,
        inter3,
        inter4,
        inter5, 
        inter6,
        result1 
    ]);

    debugger;
})();