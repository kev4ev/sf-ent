const { CompositeSubRequest } = require("../../../../types");

class Query extends CompositeSubRequest{
    constructor(referenceId, query){
        super(referenceId, 'GET', `/?q=${query}`);
    }

    static basePath(){
        return '/query/';
    }
}

module.exports = Query;