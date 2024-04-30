/** 
 * Including this tag enables typedefs and top-level vars to be "exported" as type info
 * @module 
 */

/**
 * @typedef {object} Flag
 * @property {string} description description of the flag effects and inputs
 * @property {string} [char] a single-character alias for this flag
 * @property {boolean} [bool] when true the flag is treated as a boolean with no input; else it is a string flag
 * @property {boolean} [required] when true, flag value must be passed upon invocation
 * @property {any} [initial] default value; when present, required cannot be true
 */

/**
 * @typedef {Object.<string, Flag>} FlagConfig
 */

/**
 * Merges a command's static flags and arguments at runtime; implements "merge down" where
 * last hash provided overwrites any existing keys from earlier hashes. Arguments MUST be two arrays
 * containing items of the indicated types
 * @param {Array<FlagConfig>} flagConfigs
 * @param {Array<Object.<string, any>>} argHashes
 */
function mergeArgs(flagConfigs=[], argHashes=[]){
    const merged = {};
    flagConfigs.forEach(config => {
        Object.entries(config).forEach(entry => {
            if(entry){
                const [ key, val ] = entry;
                if(val.initial !== undefined) merged[key] = val.initial;
            }
        });
    });

    return Object.assign(merged, ...argHashes);
}

module.exports = {
    mergeArgs
}