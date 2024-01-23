const { generate } = require('./lib/commands');
const { Connection } = require('jsforce');

class Ent {
    /**
     * @param {EntOptions} opts 
     * @param {Connection} connection 
     */
    constructor(opts, connection){
        this.opts = opts;
        this.connection = connection;
        // add all commands as instance methods
        this.generate = generate;
    }

    /** @returns {Array<string>} */
    get commands(){
        return Object.values(this).filter(prop => typeof prop === 'function').map(fn => fn.name);
    }
}

/**
 * 
 * @param {EntOptions} opts 
 * @param {Connection} connection 
 * @returns {Ent}
 */
async function init(opts, connection){
    if(!connection || !connection.accessToken){
        if(!opts.interactive){
            throw new Error('An authorized JSForce Connection must be provided');
        }
        // prompt user for auth info
        const { prompt } = require('enquirer');
        const authOpts = {
            s: 'sessionId',
            u: 'username/password'
        };
        const { s, u } = authOpts;

        // use shell variables for defaults
        const { SFSID, SFUNAME, SFPWD, SFURL } = process.env;

        const { auth, instanceUrl } = await prompt([
            {
                message: 'What is the login url?',
                type: 'input',
                initial: SFURL,
                name: 'instanceUrl',
                required: true
            },
            {
                message: 'Connect with sessionId or username/password?',
                choices: Object.values(authOpts),
                type: 'select',
                name: 'auth',
                required: true,
                initial: s
            }
        ]); 
        const { sid, uname, pwd } = await prompt([
            {
                message: 'Enter session id',
                type: 'password',
                name: 'sid',
                skip: auth === u,
                required: auth === s,
                initial: SFSID
            },
            {
                message: 'Enter username',
                type: 'password',
                name: 'uname',
                skip: auth === s,
                required: auth === u,
                initial: SFUNAME
            },
            {
                message: 'Enter password',
                type: 'password',
                name: 'pwd',
                skip: auth === s,
                required: auth === u,
                initial: SFPWD
            }
        ]);

        // connect via jsforce
        
    }

    return new Ent(opts, connection);
}

/** mappings used when Ent is invoked via command-line (interactively) */
init.flagConfig = {
    'i': {
        name: 'interactive',
        default: false
    }
}

module.exports = init;

/** @typedef {import('jsforce').Connection} Connection */

/**
 * @typedef {object} EntOptions 
 * @property {boolean} interactive when true, Ent will await user input for each node
 */