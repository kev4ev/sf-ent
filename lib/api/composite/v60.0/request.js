/**
 * 
 * @param {Array<import('../../../types/api/ApiRequest')>} subrequests 
 * @returns 
 */
module.exports = (subrequests) => {
    return {
        compositeRequest: subrequests
    };
}