const { CompositeSubRequest } = require("../../../../types");

class QueryAll extends CompositeSubRequest{
    constructor(referenceId, query){
        super(referenceId, 'GET', `/?q=${query}`);
    }

    static basePath(){
        return '/queryAll/';
    }
}

module.exports = QueryAll;