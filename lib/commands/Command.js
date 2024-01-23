const Enquirer = require('enquirer');

/** @typedef {import('jsforce').Connection} Connection */

/**
 * Base Command class
 * @argument {Connection} connection an authorized JSForce Connection object
 * @argument {...any} args command-specific arguments
 */
class Command extends Enquirer{
    constructor(connection, ...args){
        super(...args)
        this.connection = connection;
    }

    /**
     * shadow the Enquirer run() method
     */
    async run(){
        
    }
}

module.exports = Command;