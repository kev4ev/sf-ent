const CommandReturningSubrequest = require('../../SubRequest');
const assist = require('../../../../../utils/sf/schemaAssist');

class SObjectSubrequest extends CommandReturningSubrequest{
    #sobject;
    set sobject(val){ 
        this.#sobject = val;
        // also set prefix
        this.referenceIdPrefix = this.#sobject;
    }
    get sobject(){ return this.#sobject; }
    #connection;
    set connection(val){ this.#connection = val; }
    get connection(){ return this.#connection; }

    /**
     * Helper for subclasses to get sobject fields
     * @param {Array<string>} targetArray array that will be populated with matching fields
     * @param {Object.<string, any>} [filterHash] optional hash to filter the returned field; keys and values
     * must correspond to {@link https://developer.salesforce.com/docs/atlas.en-us.248.0.api.meta/api/sforce_api_calls_describesobjects_describesobjectresult.htm#field}
     * @param {boolean} [sort=true] when true (default) fields will be returned in alpha ordered ASC
     */
    async getFields(targetArray, filterHash, sort=true){
        const fields = await assist(this.connection).getFields(this.sobject, filterHash || {}, sort);
        fields.forEach(field => {
            if(!targetArray.includes(field)){
                targetArray.push(field)
            }
        });

        return targetArray;
    }
}

module.exports = SObjectSubrequest;