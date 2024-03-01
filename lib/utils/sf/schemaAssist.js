/** 
 * simple in-memory cache that is maintained for a given JSForce.Connectio org
 * @type {Object.<string, { fields?: Array<string> }} 
 */
const schemaCache = {};

/** @type {import('jsforce').Connection} */
let conn;

async function axios(){
    const axios = (await import('axios')).Axios;

    return new axios({ 
        baseURL: conn._baseUrl(),
        headers: {
            Authorization: `Bearer ${conn.accessToken}`
        }
    });
}

async function getObjects(){
    if(Object.keys(schemaCache).length === 0){
        const client = await axios(),
            res = await client.get('/sobjects/'),
            data = JSON.parse(res?.data);
    
        Object.assign(schemaCache, data?.sobjects.reduce((prev, curr) => {
            if(curr){
                const { name } = curr;
                prev[name] = { fields: [] };
            }
    
            return prev;
        }, {}));
    }
    
    return Object.keys(schemaCache);
}

/**
 * Returns all accessible fields for the provided sobjecttype
 * @param {string} sobject case-insensitive sobjecttype name
 * @param {Object.<string, any>} [filterHash] optional hash to filter the returned field; keys and values
 * must correspond to {@link https://developer.salesforce.com/docs/atlas.en-us.248.0.api.meta/api/sforce_api_calls_describesobjects_describesobjectresult.htm#field}
 * @param {boolean} [sort=true] when true (default) fields will be returned in alpha ordered ASC
 * @returns {Array<string>} fields for the given sobjecttype
 */
async function getFields(sobject, filterHash, sort=true){
    if(Object.keys(schemaCache).length === 0) await getObjects();

    if(!schemaCache[sobject]) throw new Error(`Could not find sobjecttype ${sobject} in the connection org`);

    if(!schemaCache[sobject]?.fields?.length){
        const client = await axios(),
            res = await client.get(`/sobjects/${sobject}/describe`),
            data = JSON.parse(res.data);

        schemaCache[sobject].fields.push(...data.fields);
    }

    // return filtered and mapped result
    filterHash = filterHash && typeof filterHash === 'object' ? filterHash : {};
    const filtered = schemaCache[sobject].fields.filter(field => {
        for(const key in filterHash){
            const val = filterHash[key];
            if(field[key] !== val) return false;
        }

        return true;
    }).map(field => field.name);
    if(sort) filtered.sort();

    return filtered;
}

/**
 * Provides utility functions for schema completion
 * @param {import('jsforce').Connection} connection 
 * @returns 
 */
module.exports = (connection) => {
    conn = connection;
    return {
        getObjects,
        getFields
    }
}
