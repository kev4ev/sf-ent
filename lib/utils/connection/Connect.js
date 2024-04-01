const Diviner = require('../../types/command/Diviner');
const { Connection } = require('jsforce');
const { getAll, getCachedConnection, cacheConnection } = require('./cache');

// parse .env file for interested keys; preferencing those set directly in the shell
require('dotenv').config({ override: false });
const { SFSID, SFUNAME, SFPWD, SFURL } = process.env;
const AUTH_OPTS = {
    accessToken: 'accessToken', 
    session: 'sessionId', // functionally interchangeably with accessToken for auth purposes
    uname: 'username/password'
};

/** 
 * Module-level connection object; set only ONCE during transaction
 * @type {import('./cache').ConnectionInterface} 
 */
let CONN;

/**
 * A utility Diviner that can be used to divine credentials and/or establish an authorized JSForceConnection.
 * @class
 */
class Connect extends Diviner{
    /** 
     * returns a read-only Proxy of the currently-authorized connection
     * @returns {import('./cache').ConnectionInterface}
     */
    static get current(){ 
        return !CONN ? CONN : new Proxy(CONN, {
            set(){
                console.warn('Setting values on static connection not allowed. Initiate and run Connect instead');
            }
        });
    }

    /**
     * @param {import('./cache').ConnectionInterface} conn 
     */
    static set initial(conn){ CONN = conn; }

    static interactiveMeta(){
        return {
            name: 'Connection',
            hint: 'establish or modify the current org connection'
        }
    }

    async *getPrompts(){
        const established = () => CONN && CONN.accessToken ? true : false;
        // if CONN already set, no prompts required
        if(established()){
            yield this.promptFactory(
                {
                    message: `Currently connected to ${new URL(CONN.instanceUrl).hostname}\nSwitch orgs?`,
                    name: 'switch',
                    type: 'confirm',
                    required: true,
                    initial: false
                }
            );

            if(!this.switch) return;
        }
        // if multiple cached tokens, allow user to choose
        const cached = getAll() || {};
        const OTHER = '<enter other>';
        if(Object.keys(cached).length > 0){
            const choices = Object.values(cached).map(conn => {
                const alias = conn?.aliases?.[0];

                return {
                    name: alias ?? conn.instanceUrl,
                    value: conn,
                    hint: alias ? conn.instanceUrl : ''
                };
            });
            choices.push([ { name: OTHER } ]);
            yield this.promptFactory(
                {
                    name: 'selectedConn',
                    message: 'Which org would you like to connect to?',
                    type: 'autocomplete',
                    required: true,
                    choices,
                    limit: 5
                }
            ); 
            // conditionally set conn and exit
            if(this.selectedConn !== OTHER){
                const { instanceUrl, accessToken } = this.selectedConn;
                await this.#establishConnection(instanceUrl, AUTH_OPTS.accessToken, accessToken);

                if(established()) return;
            }
        }
        // first prompt to get/confirm login url and auth type
        yield this.promptFactory(
            {
                message: 'Enter org url',
                type: 'input',
                initial: SFURL,
                name: 'instanceUrl',
                required: true,
                result: async (url) => {
                    const cacheToken = getCachedConnection(url);
                    if(cacheToken){
                        console.log(this.chalk.gray('Cached token found. Attempting authorization...'));
                        await this.#establishConnection(url, AUTH_OPTS.session, cacheToken);
                        if(!established()){
                            console.log(this.chalk.yellow('Cache token expired; new auth required'));
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
        );

        // get credentials if no cached token or token expired
        if(!established()){
            const { authMethod } = this;
            yield this.promptFactory(
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
            );
    
            // yield confirmation prompt to connect to sf
            const { sessionId, uname, pwd, instanceUrl } = this;
            yield this.promptFactory(
                {
                    message: 'Connect now?',
                    type: 'confirm',
                    name: 'connectNow',
                    required: true,
                    initial: 'Y',
                    onSubmit: async(name, value) => {
                        if(!value) return undefined;
                        await this.#establishConnection(instanceUrl, authMethod, sessionId, uname, pwd);
                        if(!established()){
                            console.log(this.chalk.bgRed(`Could not authenticate with provided ${authMethod === AUTH_OPTS.session ? 'sessionId' : 'username/password'}`));
                        }
                    }
                }
            );
        }
    }

    async readyToExecute(){ 
        await this.#connect();

        return CONN?.accessToken ? 
            true : 
            { message: 'Unable to authenticate with provided credentials.', displayToUser: this.interactive };
    }

    async executeInteractive(){ return await this.#connect(); }
    async execute(){ return await this.#connect(); }
    async #connect(){ 
        return await (CONN ? CONN : this.#establishConnection());
    }

    /**
     * @returns {Promise<Connection>}
     */
    async #establishConnection(
        instanceUrl=SFURL, 
        authMethod=(SFSID ? AUTH_OPTS.session : AUTH_OPTS.uname), 
        sessionIdOrToken=SFSID, 
        uname=SFUNAME, 
        pwd=SFPWD)
    {
        // connect via jsforce
        let opts = { loginUrl: instanceUrl, instanceUrl, version: '60.0'/** todo? dynamic */ };
        const tokenAuth = [AUTH_OPTS.session, AUTH_OPTS.accessToken].includes(authMethod);
        if(tokenAuth){
            opts.sessionId = sessionIdOrToken;
            opts.accessToken = sessionIdOrToken;
        }
        const conn = new Connection(opts);
        try{
            if(tokenAuth){
                await conn.identity(); // throws error if sessionId/token is invalid or expired
            } else{
                await conn.loginBySoap(uname, pwd);
            }
            // cache the connection
            cacheConnection({ instanceUrl, accessToken: conn.accessToken });
            CONN = conn;
        } catch(err){
            console.error(`Could not authenticate to org with provided ${authMethod}.\nError: ${err.message}`);
        }

        // return the authorized connection or undefined
        return conn;
    }
}

module.exports = Connect;