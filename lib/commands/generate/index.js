const Command = require('../../types/Command');

/**
 * @typedef {import('../../types/Diviner').DivinerArgs & { out: string }} Args
 */

class Generate extends Command{
    /**
     * 
     * @param {Args} args 
     * @param {import('jsforce').Connection} connection 
     */
    constructor(args){
        super(args);
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