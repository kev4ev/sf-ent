const { factory } = require('../../types/api/ApiRequest');

/** @typedef {import('../../types/api/ApiRequest').ApiRequest} ApiRequest */

/** 
 * @typedef {object} ReturnVal 
 * @property {function(...args): ApiRequest} request
 * @property {Object.<string, function(...args): ApiRequest>} subrequests
 */

/**
 * 
 * @param {string} [version] optional api version which must be in Salesforce format (vXX.X); defaults to most
 * current library version
 * @returns {ReturnVal} a constructor function for an ApiRequest
 */
module.exports = (version='v60.0') => {
        if(version.search(/^v\d\d\.\d$/) < 0) throw new Error(`Version must be provided in format "vXX.X"`);

        return {
            request: factory(version, require(`./${version}/request.js`)),
            subrequests: Object.entries(require(`./${version}/subrequests/`)).reduce((prev, curr) => {
                if(curr){
                    const [ key, proto ] = curr;
                    prev[key] = factory(version, proto);
                }

                return prev;
            }, {})
        };
};