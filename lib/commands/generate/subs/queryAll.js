const Query = require('./query');

class QueryAll extends Query{

    static interactiveMeta(){
        return {
            name: 'Query All',
            hint: 'create a queryAll subrequest (includes soft-deleted records)'
        };
    }
    
    async finish(){
        return new this.subrequestTypes.queryAll(this.referenceId, this.query.result);
    }
}

/**
 * 
 * @param {string} query
 * @returns 
 */
module.exports = QueryAll;