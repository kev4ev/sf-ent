const cache = require('flat-cache');
const { join } = require('node:path');

const CACHE_PATH = process.env.XDG_CACHE_HOME || join(process.env.HOME || process.cwd(), '.cache'),
    CACHE = cache.load('sf-entish', CACHE_PATH);

function getCachedToken(orgUrl){
    return CACHE.getKey(orgUrl);
}

function setCachedToken(orgUrl, token){
    CACHE.setKey(orgUrl, token);
    CACHE.save();
}

module.exports = {
    getCachedToken,
    setCachedToken
}
