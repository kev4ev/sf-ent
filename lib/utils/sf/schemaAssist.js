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
            res = await client.get('/sobjects/')
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
 * @returns {Array<string>} fields for the given sobjecttype
 */
async function getFields(sobject){
    if(Object.keys(schemaCache).length === 0) await getObjects();

    if(!schemaCache[sobject]) throw new Error(`Could not find sobjecttype ${sobject} in the connection org`);

    if(!schemaCache[sobject].fields){
        const client = await axios(),
            res = (await client.get(`/sobjects/${sobject}/describe`)).data;

        schemaCache[sobject].fields.push(...res.fields.map(fieldMeta => fieldMeta.name));
    }

    return schemaCache[sobject].fields;
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
