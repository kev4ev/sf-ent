const Enquirer = require('enquirer');

class Command extends Enquirer{
    constructor(...args){
        super(...args);
    }

    /**
     * shadow the Enquirer run() method
     */
    async run(){
        
    }
}

module.exports = Command;