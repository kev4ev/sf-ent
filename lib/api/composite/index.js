/**
 * 
 * @param {string} [version] optional api version which must be in Salesforce format (vXX.X); defaults to most
 * current library version
 * @returns {Object.<string, { function(...args): string }>}
 */
module.exports = (version='v60.0') => {
        if(!version.includes(/^v\d\d\.\d$/)) throw new Error(`Version must be provided in format "vXX.X"`);

        return {
            request: require(`./${version}/request.js`),
            subrequests: require(`./${version}/subrequests/`)
        };
};