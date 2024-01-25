const commands = require('./lib/commands');
const Command = require('./lib/types/Command');
const { Connection } = require('jsforce');

// parse .env file for interested keys; preferencing those set directly in the shell
require('dotenv').config({ override: false });
const { SFSID, SFUNAME, SFPWD, SFURL } = process.env;

const AUTH_OPTS = {
    session: 'sessionId',
    uname: 'username/password'
};

/**
 * @returns {Promise<Connection>}
 */
async function getConnection(
    instanceUrl=SFURL, 
    authMethod=(SFSID ? AUTH_OPTS.session : AUTH_OPTS.uname), 
    sessionId=SFSID, 
    uname=SFUNAME, 
    pwd=SFPWD)
{
    // connect via jsforce
    let opts = { loginUrl: instanceUrl, instanceUrl };
    if(authMethod === AUTH_OPTS.session){
        opts.sessionId = sessionId;
        opts.accessToken = sessionId;
    }
    const conn = new Connection(opts);
    try{
        if(authMethod === AUTH_OPTS.session){
            await conn.identity(); // throws error if sessionId is invalid
        } else{
            await conn.loginBySoap(uname, pwd);
        }
    } catch(err){
        console.error('Could not authenticate using provided auth info');

        return undefined;
    }

    // return the authorized connection
    return conn;
}

class Ent extends Command{
    /**
     * @param {Connection} connection 
     * @param {import('./lib/types/Diviner').DivinerArgs} args 
     */
    constructor(connection, args){
        super(connection, args);
        // wrap all commands as instance methods that ensure auth first
        Object.entries(commands).forEach(entry => {
            if(entry){
                const [ key, fn ] = entry;
                this[key] = async (args) => {
                    await this.run();
                    await fn(this.connection, Object.assign(this.args, args));
                }
            }
        });
    }

    /** @returns {import('./lib/types/Command').CommandFlagConfig} */
    static get flagConfig(){
        return {
            interactive: {
                alias: 'i'
            }
        }
    }

    /** Establishes connection in non-interactive mode when env vars are present */
    async preRun(){
        if(!this?.connection?.accessToken && !this?.args?.interactive){
            this.connection = await getConnection();
        }
    }

    async readyToExecute(){
        return this.connection && this?.connection?.accessToken ? true : 'Authorized JSForce Connection required';
    }

    async *getPrompts(){
        // first prompt to get/confirm login url and auth type
        yield [
            {
                message: 'What is the login url?',
                type: 'input',
                initial: SFURL,
                name: 'instanceUrl',
                required: true,
            },
            {
                message: 'Connect with sessionId or username/password?',
                choices: Object.values(AUTH_OPTS),
                type: 'select',
                name: 'authMethod',
                required: true,
                initial: SFSID ? AUTH_OPTS.session : AUTH_OPTS.uname
            }
        ];

        // get credentials
        const { authMethod } = this;
        yield [
            {
                message: 'Enter session id',
                type: 'input',
                name: 'sessionId',
                skip: authMethod === AUTH_OPTS.uname,
                required: authMethod === AUTH_OPTS.session,
                initial: SFSID
            },
            {
                message: 'Enter username',
                type: 'input',
                name: 'uname',
                skip: authMethod === AUTH_OPTS.session,
                required: authMethod === AUTH_OPTS.uname,
                initial: SFUNAME
            },
            {
                message: 'Enter password',
                type: 'password',
                name: 'pwd',
                skip: authMethod === AUTH_OPTS.session,
                required: authMethod === AUTH_OPTS.uname,
                initial: SFPWD
            }
        ];

        // yield confirmation prompt to connect to sf
        const { sessionId, uname, pwd, instanceUrl } = this;
        yield [
            {
                message: 'Connect now?',
                type: 'confirm',
                name: 'connectNow',
                required: true,
                initial: 'Y',
                onSubmit: async(name, value) => {
                    if(!value) return undefined;
                    this.connection = await getConnection(instanceUrl, authMethod, sessionId, uname, pwd);
                }
            }
        ]
    }

    async execute(){ /** empty for Ent */ }
}

module.exports = Ent;