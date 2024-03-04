const { ent } = require('./index.js');

(async()=>{
    // chain style
    const result0 = 
        await ent()
            .generate({ out: './.generated' })
                .query('SELECT Id FROM Case LIMIT 5')
                .query('another query')
                .sobject('Contact')
                    .CREATE({ FirstName: 'Jim', LastName: 'Bob', Custom_Bool__c: true })
                    .done()
                .sobject('Account')
                    .READ('1234567')
                    .done()
                .sobject('Case')
                    .UPDATE({ Subject: 'Updated Subject' })
                    .done()
                .query('subsequent query')
            .done(); // returns root resolver

    debugger;

    // intermediate style
    const intermediate0 = ent().generate({ out: './.generated' }),
        intermediate1 = intermediate0.query('SELECT Id FROM Case LIMIT 5'),
        intermediate2 = intermediate1.query('another query'),
        intermediate3 = intermediate2.sobject('Account').GET('1234567').done(),
        intermediate4 = intermediate3.query('subsequent query'),
        result1 = intermediate4.done();


    const results = await Promise.all([ 
        intermediate0,
        intermediate1,
        intermediate2,
        intermediate3,
        intermediate4,
        result1 
    ]);

    debugger;
})();