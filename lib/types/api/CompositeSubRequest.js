/** @module */

const { ApiRequest } = require('./ApiRequest');

// register global Symbols so it will not be serialized as part of instance body
const responseAccessorParts = Symbol.for('responseAccessorParts');

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

    static get responseAccessorParts(){ return responseAccessorParts; }

    /**
     * Essentially equivalent to an enquirer Question object / Input prompt {@see https://www.npmjs.com/package/enquirer#prompt-options}
     * @typedef {import('../../utils/prompts/factory').Question} Field
     */

    /** 
     * subclasses MAY override 
     * @returns {Array<string | Field>} when the subrequest is used in a reference prompt, an Array of parts
     * that will be joined to the referenceId to complete a valid reference from another request. 
     * @example
     * A CompositeSubRequest of type Query, for example, would return: 
     * [ '.[', { name: 'item', validate: ... }, '].', { name: field, validate: ... } ]
     */
    get [responseAccessorParts]() { return undefined; }

    // static basePath() MUST be implemented by subclasses; {@see ApiRequest}
}

module.exports = CompositeSubrequest;