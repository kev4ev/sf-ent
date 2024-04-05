const Query = require('./query');

class QueryAll extends Query{
    constructor(referenceId, query){
        super(referenceId, `/?q=${query}`);
    }

    static basePath(){
        return '/queryAll/';
    }
}

module.exports = QueryAll;