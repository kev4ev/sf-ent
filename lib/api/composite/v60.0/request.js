/**
 * Generates the composite request
 * @param {Array<import('../../../types/api/ApiRequest')>} subrequests 
 * @param {boolean} [allOrNone=true] {@see https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/requests_composite.htm}
 * @param {boolean} [collateSubrequests=false] {@see https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/requests_composite.htm}
 * @returns 
 */
module.exports = (subrequests, allOrNone = true, collateSubrequests = false) => {
    return {
        allOrNone,
        collateSubrequests,
        compositeRequest: subrequests
    };
}