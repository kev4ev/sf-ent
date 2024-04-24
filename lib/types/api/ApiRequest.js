const { repository } = require('../../../package.json');

/**
 * Base class for all requests to Salesforce APIs, which are always bound to a specific version.
 * @class
 */
class ApiRequest {

    /**
     * @constructor
     * @param {string} method http method
     * @param {string} [path] complete path AFTER the version number and basePath (static) to complete uri
     * @param {object} [body] optional body 
     */
    constructor(method, path, body){
        this.method = method.toUpperCase();
        this.#setUrl(path);
        this.body = body;
    }

    #setUrl(path){
        const proto = Object.getPrototypeOf(this).constructor,
            name = proto.name;
        // hash included so that requests read from file can have their prototype inferred without relying on 
        // referenceId; hashes are not sent-to / read-by the server and thus don't affect the callout
        this.url = `/services/data/${proto.version}/${proto.basePath()}/${path}#${name}_${repository}#urlTypeInfo`.replace(/\/{2,}/g, '/');
    }

    /**
     * amend path after construction
     * @param {string} path 
     * @returns {ApiRequest} this, for chaining
     */    
    setPath(path){
        this.#setUrl(path);

        return this;
    }

    /**
     * amend body after construction
     * @param {object} body 
     * @returns {ApiRequest} this, for chaining
     */
    setBody(body){
        this.body = body;

        return this;
    }

    /** MUST be implemented by subclasses; everything after uri host but before version number */
    static get basePath(){
        throw new Error(`${this.name} has not properly shadowed static property basePath.`);
    }
    /** MAY be set by subclass or (ideally) injected by factory() fn below */
    static version;

    /**
     * Factory function that binds a version to an ApiRequest so the class itself doesn't need to set it
     * @param {string} version the version that subRequestFn will be called with
     * @param { { function(...args): ApiRequest } } apiRequestProto class/prototype of an object that extends ApiRequest
     * @returns {ApiRequest}
     */
    static factory(version, apiRequestProto){
        apiRequestProto.version = version;

        return apiRequestProto;
    }
}

module.exports = { 
    ApiRequest, 
    factory: ApiRequest.factory 
};
