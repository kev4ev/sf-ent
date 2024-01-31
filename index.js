const commands = require('./lib/commands');
const Command = require('./lib/types/Command');
const { Connection } = require('jsforce');
const divine = require('./lib/types/DivinerPromise');

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

class Ent extends Command{
    /**
     * @param {import('./lib/types/Command').CommandArgs} args
     * @param {string} [topCmd] should only provided when invoked from command line
     */
    constructor(args, topCmd){
        super(args);
        this.topCmd = topCmd;
    }

    /** @returns {import('./lib/types/CommandFlagConfig').FlagConfig} */
    static get flagConfig(){ return Command.flagConfig; }

    /** Establishes connection in non-interactive mode when env vars are present */
    async preRun(){
        // check connection
        if(!this?.connection?.accessToken && !this?.args?.interactive){
            this.log('No active JSForceConnection, attempting connection with available env vars');
            this.connection = await getConnection();
        }
    }

    async readyToExecute(){
        return this.connection && this?.connection?.accessToken ? true : 'Authorized JSForce Connection required';
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
                        console.error(this.chalk.bgRed(`Could not authenticate with provided ${authMethod === AUTH_OPTS.session ? 'sessionId' : 'username/password'}`));

                        process.exit(1);
                    }

                    this.connection = conn;
                }
            }
        ];
        yield prompts;

        if(!this.topCmd){
            prompts = [
                {
                    name: 'topCmd',
                    type: 'select',
                    required: true,
                    skip: this.topCmd,
                    choices: Object.keys(this.getSubDiviners()),
                    message: 'Select command to execute'
                }
            ];
            yield prompts;
        }
    }

    /**
     * 
     * @returns {Promise<any>}
     */
    async execute(){
        const { topCmd } = this;
        if(topCmd){
            // interactive mode; relay control to top-level Command and pass connection
            const relay = commands[topCmd](this.args, this.connection);

            return await relay.run();
        }

        // non-interactive, Ent itself does not resolve a value
        return 'entDone';
    }

    getSubDiviners(){
        return commands;
    }

    async handleSubDivinerEvent(evt, payload){
        debugger;
    }
}

/**
 * 
 * @param {import('./lib/types/Command').CommandArgs} args 
 * @param {string} topCmd if provided, the top-level command to run
 * @returns {DivinerPromise}
 */
function initEnt(args={}, topCmd){
    const ent = new Ent(args, undefined, topCmd);

    return divine(ent);
}

module.exports = {
    ent: initEnt,
    flagConfig: Ent.flagConfig
}