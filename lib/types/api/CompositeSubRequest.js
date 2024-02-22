const { ApiRequest } = require('./ApiRequest');

class CompositeSubrequest extends ApiRequest{
    /**
     * 
     * @param {string} referenceId 
     * @param {string} method 
     * @param {string} [path] may be set during construction or via path()
     * @param {object} [body] may be set during construction or via body()
     */
    constructor(referenceId, method, path, body){
        super(method, path, body);
        this.referenceId = referenceId;
    }

    // static basePath() MUST be implemented by subclasses; {@see ApiRequest}
}

module.exports = CompositeSubrequest;