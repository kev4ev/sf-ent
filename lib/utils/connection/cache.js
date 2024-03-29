/** @module */

const cache = require('flat-cache');
const { join } = require('node:path');

const CACHE_PATH = process.env.XDG_CACHE_HOME || join(process.env.HOME || process.cwd(), '.cache'),
    CACHE = cache.load('sf-entish', CACHE_PATH);

/**
 * Get all cached connections
 * @returns {Object.<string, ConnectionInterface>}
 */
function getAll(){
    return CACHE.all();
}

/**
 * Cache multiple org connections at once, i.e. for usage with sf cli
 * @param {Array<ConnectionInterface>} connections 
 */
function setAll(connections){
    // defer save until all changes made
    cacheConnection._deferSave = true;
    connections.forEach(conn => cacheConnection(conn));
    CACHE.save();
    cacheConnection._deferSave = false;
}

/**
 * Get a cached connection if one exists for the given instanceUrl
 * @param {string} instanceUrl 
 * @returns {ConnectionInterface | null}
 */
function getCachedConnection(instanceUrl){
    return CACHE.getKey(instanceUrl);
}

/**
 * Cache an authorized org connection
 * @param {string} instanceUrl 
 * @param {ConnectionInterface} conn 
 */
function cacheConnection(conn){
    if(!conn?.aliases?.length) conn.aliases = [ new URL(conn.instanceUrl).hostname ];
    CACHE.setKey(conn.instanceUrl, conn);
    if(!cacheConnection._deferSave) CACHE.save();
}
cacheConnection._deferSave = false; // pseudo-private property

module.exports = {
    getAll,
    getCachedConnection,
    cacheConnection,
    setAll
}

/**
 * an interface that conforms to necessary keys for JSForce or OrgAuthorization type from 
 * \@salesforce/core {@see https://forcedotcom.github.io/sfdx-core/types/org_authInfo.OrgAuthorization.html}
 * @typedef {object} ConnectionInterface 
 * @property {string} accessToken
 * @property {string} instanceUrl
 * @property {Array<string>} [aliases]
 */
