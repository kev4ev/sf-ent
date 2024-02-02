// provides CJS interop with the chalk ESM module

let chalk;

/**
 * 
 * @returns {Promise<import('chalk').ChalkInstance>}
 */
module.exports = async ()=> {
    if(!chalk){
        chalk = (await import('chalk')).default;
    }

    return chalk;
}