const { CompositeSubRequest } = require("../../../../types");

class Query extends CompositeSubRequest{
    constructor(referenceId, query){
        super(referenceId, `/q=${query}`, 'GET');
    }

    static basePath(){
        return '/query/';
    }
}

module.exports = Query;