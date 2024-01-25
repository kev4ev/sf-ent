const Command = require('../../types/Command');

/**
 * @typedef {import('../../types/Diviner').DivinerArgs & { out: string }} Args
 */

class Generate extends Command{
    /**
     * 
     * @param {import('jsforce').Connection} connection 
     * @param {Args} args 
     */
    constructor(connection, args){
        super(connection, args);
    }
    
    /** @returns {import('../../types/Command').CommandFlagConfig} */
    static get flagConfig(){
        return {
            out: {
                alias: 'o',
                required: true
            },
            teardown: {
                alias: 't'
            }
        }
    }

    async readyToExecute(){
        return this.args.out ? true : 'Missing output path for generated file';
    }


}

module.exports = Generate;

/**
 * 
 */