// all top-level Commands
const Generate = require('./generate');

/**
 * 
 * @param {import('../types/Command')} cmdProto 
 * @returns {import('../types/Command')}
 */
function wrap(cmdProto){
    const initFn = async (connection, cmdArgs) => {
        const instance = new cmdProto(connection, cmdArgs);

        return await instance.run();
    };

    return initFn;
}

module.exports = {
    generate: wrap(Generate)
}