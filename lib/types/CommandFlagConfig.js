/** 
 * Including this tag enables typedefs and top-level vars to be "exported" as type info
 * @module 
 */

/**
 * @typedef {object} Flag
 * @property {string} alias an allowable alias for this flag
 * @property {string} description description of the flag effects and inputs
 * @property {boolean} [bool] when true the flag is treated as a boolean with no input; else it is a string flag
 * @property {boolean} [required] when true, flag value must be passed upon invocation
 * @property {any} [initial] default value; when present, required cannot be true
 */

/**
 * @typedef {Object.<string, Flag>} FlagConfig
 */

/**
 * Merges a command's static flags with arguments provided at runtime
 * @param {FlagConfig} flagConfig the Command's static flag config
 * @param {Object.<string, any>} args arguments provided at runtime
 */
function mergeArgs(flagConfig, args){
    let merged = Object.entries(flagConfig).reduce((prev, curr) => {
        if(curr){
            const [ flag, config ] = curr;
            if(config.initial !== undefined){
                prev[flag] = config.initial;
            }
        }

        return prev;
    }, {});
    Object.assign(merged, args);

    return merged;
}

module.exports = {
    mergeArgs
}