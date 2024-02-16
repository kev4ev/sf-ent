/** @module */

/**
 * @typedef { { function(string:version, ...args:any[]): ApiRequest }} ApiRequestFn
 */

const refIds = new Set();

/**
 * An API Request to the Salesforce Composite API, which is always bound to a specific version.
 * @class
 */
class ApiRequest {
    /**
     * @constructor
     * @param {string} version api version of the request
     * @param {string} url 
     * @param {string} method http method
     * @param {string} referenceId a unique id for the subrequest within the transaction
     * @param {string} [body] optional body 
     */
    constructor(version, url, method, referenceId, body){
        this.version = version;
        this.url = url;
        this.method = method;
        if(refIds.has(referenceId)) throw new Error(`referenceIds must be unique; duplicate: ${referenceId} `);
        this.referenceId = referenceId; 
        if(body) this.body = body;
    }

    /**
     * Factory function that wraps a function returning a ApiRequest
     * @param {string} version the version that subRequestFn will be called with
     * @param {ApiRequestFn} subRequestFn the function that builds the subrequest, with version as its first arg
     * @returns { { function(version, ...args): ApiRequest } }
     */
    static factory(version, subRequestFn){
        return subRequestFn.bind(/** no this */ undefined, version);
    }
}

module.exports = { 
    ApiRequest, 
    factory: ApiRequest.factory 
};
