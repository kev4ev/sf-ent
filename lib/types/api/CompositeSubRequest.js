const { ApiRequest } = require('./ApiRequest');

class CompositeSubrequest extends ApiRequest{
    constructor(referenceId, path, method, body){
        super(path, method, body);
        this.referenceId = referenceId;
    }

    // static basePath() MUST be implemented by subclasses; see ApiRequest
}

module.exports = CompositeSubrequest;