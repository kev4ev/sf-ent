const Diviner = require('../../types/command/Diviner');
const { Connection } = require('jsforce');
const { getCachedToken, setCachedToken } = require('../cache');

// parse .env file for interested keys; preferencing those set directly in the shell
require('dotenv').config({ override: false });
const { SFSID, SFUNAME, SFPWD, SFURL } = process.env;
const AUTH_OPTS = {
    session: 'sessionId',
    uname: 'username/password',
    token: 'token'
};

/**
 * @returns {Promise<Connection>}
 */
async function getConnection(
    instanceUrl=SFURL, 
    authMethod=(SFSID ? AUTH_OPTS.session : AUTH_OPTS.uname), 
    sessionIdOrToken=SFSID, 
    uname=SFUNAME, 
    pwd=SFPWD)
{
    // connect via jsforce
    let opts = { loginUrl: instanceUrl, instanceUrl, version: '60.0'/** todo? dynamic */ };
    if(authMethod === AUTH_OPTS.session){
        opts.sessionId = sessionIdOrToken;
        opts.accessToken = sessionIdOrToken;
    } else if (authMethod === AUTH_OPTS.token){
        opts.accessToken = sessionIdOrToken;
    }
    const conn = new Connection(opts);
    try{
        if([AUTH_OPTS.session, AUTH_OPTS.token].includes(authMethod)){
            await conn.identity(); // throws error if sessionId is invalid
        } else{
            await conn.loginBySoap(uname, pwd);
        }
        setCachedToken(instanceUrl, conn.accessToken);
    } catch(err){
        return undefined;
    }

    // return the authorized connection
    return conn;
}

/** 
 * Module-level connection object; set only ONCE during transaction
 * @type {import('jsforce').Connection} 
 */
let CONN;

/**
 * A utility Diviner that can be used to divine credentials and/or establish an authorized JSForceConnection.
 * @class
 */
class Connect extends Diviner{

    async *getPrompts(){
        const established = () => CONN && CONN.accessToken ? true : false;
        // if CONN already set, no prompts required
        if(established()) return [];
        // first prompt to get/confirm login url and auth type
        /** @type {Array<import('./lib/types/Diviner').Question>} */
        let prompts = [
            {
                message: 'Enter org url',
                type: 'input',
                initial: SFURL,
                name: 'instanceUrl',
                required: true,
                result: async (url) => {
                    const cacheToken = getCachedToken(url);
                    if(cacheToken){
                        console.log(this.chalk.gray('Cached token found. Attempting authorization...'));
                        CONN = await getConnection(url, AUTH_OPTS.token, cacheToken);
                        if(!CONN){
                            this.log(this.chalk.yellow('Cache token expired; new auth required'));
                        }
                    }

                    return url;
                }
            },
            {
                message: 'Connect with sessionId or username/password?',
                choices: Object.values(AUTH_OPTS),
                type: 'autocomplete',
                name: 'authMethod',
                required: () => !established(),
                skip: () => established(),
                initial: SFSID ? AUTH_OPTS.session : AUTH_OPTS.uname
            }
        ];
        yield prompts;

        // get credentials if no cached token or token expired
        if(!established()){
            const { authMethod } = this;
            prompts = [
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
            yield prompts;
    
            // yield confirmation prompt to connect to sf
            const { sessionId, uname, pwd, instanceUrl } = this;
            prompts = [
                {
                    message: 'Connect now?',
                    type: 'confirm',
                    name: 'connectNow',
                    required: true,
                    initial: 'Y',
                    onSubmit: async(name, value) => {
                        if(!value) return undefined;
                        const conn = await getConnection(instanceUrl, authMethod, sessionId, uname, pwd);
                        if(!conn){
                            console.log(this.chalk.bgRed(`Could not authenticate with provided ${authMethod === AUTH_OPTS.session ? 'sessionId' : 'username/password'}`));
                        }
    
                        CONN = conn;
                    }
                }
            ];
            yield prompts;
        }
    }

    async readyToExecute(){ 
        CONN = await this.#connect();

        return CONN?.accessToken ? 
            true : 
            { message: 'Unable to authenticate with provided credentials.', displayToUser: this.interactive };
    }

    async executeInteractive(){ return await this.#connect(); }
    async execute(){ return await this.#connect(); }
    async #connect(){ 
        return await (CONN ? CONN : getConnection());
    }
}

module.exports = Connect;