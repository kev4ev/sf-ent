const Diviner = require('../../types/Diviner');
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
        return undefined;
    }

    // return the authorized connection
    return conn;
}

/**
 * A utility Diviner that can be used to divine credentials and/or establish an authorized JSForceConnection.
 * @class
 */
class Connect extends Diviner{
    constructor(argObj){
        super(argObj);
    }

    async *getPrompts(){
        // first prompt to get/confirm login url and auth type
        /** @type {Array<import('./lib/types/Diviner').Question>} */
        let prompts = [
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
        yield prompts;

        // get credentials
        const { authMethod } = this.args;
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
        const { sessionId, uname, pwd, instanceUrl } = this.args;
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
                        this.log(this.chalk.bgRed(`Could not authenticate with provided ${authMethod === AUTH_OPTS.session ? 'sessionId' : 'username/password'}`));
                    }

                    this.connection = conn;
                }
            }
        ];
        yield prompts;
    }

    async readyToExecute(){ 
        this.connection = await this.connect();

        return this.connection?.accessToken ? true : 'Unable to authenticate with provided credentials.';
    }

    async executeInteractive(){ return await this.connect(); }
    async execute(){ return await this.connect(); }
    async connect(){ 
        return await (this.connection ? this.connection : getConnection());
    }
}

module.exports = (argObj) => {
    return new Connect(argObj);
}