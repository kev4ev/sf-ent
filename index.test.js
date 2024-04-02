const assert = require('node:assert');
const lib = require('./index.js');

/**
 * yields command array for consistent testing of styles; Array[0] is the method (cmd/subcmd)
 * to invoke and remaining items are args to that method
 */
function* commands(){
    yield [ 'ent' ];
        yield [ 'generate', { out: './.generated' } ];
            yield [ 'query', 'SELECT Id FROM Case LIMIT 5' ];
                yield [ 'refId', 'customQuery0' ];
            yield [ 'query', 'another query' ];
                yield [ 'refId', 'customQuery1' ];
            yield [ 'sobject', 'Contact' ];
                yield [ 'create', { FirstName: 'Jim', LastName: 'Bob', Custom_Bool__c: true } ];
                yield [ 'refId', 'contact0' ];
                yield [ 'done' ]; // TODO can eliminate by calling from sub?
            yield [ 'sobject', 'Account' ];
                yield [ 'read', '1234567' ];
                yield [ 'done' ]; // TODO can eliminate by calling from sub?
            yield [ 'sobject', 'Case' ];
                yield [ 'update', '12345', { Subject: 'Updated Subject' } ];
                yield [ 'done' ]; // TODO can eliminate by calling from sub?
            yield [ 'query', 'subsequent query' ];
        yield [ 'done' ];
    yield [ 'done' ]; // closes ent() and returns root resolver
}

(async()=>{

    /*********************
     * chained test
     *********************/

    // get the iterator
    const cmdIter = commands();
    let cmdAry = cmdIter.next();

    // initialize chained variable and chain until done
    let chainedDivinerPromise = lib;
    while(cmdAry.done !== true){
        const { value } = cmdAry;
        if(value){
            const cmd = value.shift();
            chainedDivinerPromise = chainedDivinerPromise[cmd](...value);
        }
        cmdAry = cmdIter.next();
    } 

    const chainedResult = await chainedDivinerPromise;
    
    const expected = JSON.stringify(require('./test/lib/expected.json'));
    const actual = JSON.stringify(chainedResult);
    assert.equal(expected, actual);
    /**
     * chained style is more conveniently written with top-level await, as such...
     * 
     *   const result0 = await lib.ent()
     *           .generate({ out: './.generated' })
     *               // ...etc
     *       .done(); // closes ent, returns root resolver
     * 
     * ...but cmd generator is used to ensure test consistency/parity between chained and intermediate styles
     */

    /*********************
     * intermediate test
     *********************/

    // TODO refactor to use generator

    const inter0 = lib.ent().generate({ out: './.generated' }),
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