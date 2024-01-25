const commands = require('./lib/commands');
const Command = require('./lib/types/Command');
const { Connection } = require('jsforce');

// parse .env file for interested keys; preferencing those set directly in the shell
require('dotenv').config({ override: false });
const { SFSID, SFUNAME, SFPWD, SFURL } = process.env;

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
                    await this[key](this.connection, Object.assign(this.args, args));
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

    async readyToExecute(){
        return this.connection && this?.connection?.accessToken ? true : 'Authorized JSForce Connection required';
    }

    async *getPrompts(){
        // prompt user for auth info when missing
        const authOpts = {
            s: 'sessionId',
            u: 'username/password'
        };
        const { s, u } = authOpts;

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
                choices: Object.values(authOpts),
                type: 'select',
                name: 'authMethod',
                required: true,
                initial: SFSID ? s : u
            }
        ];

        // get credentials
        const { authMethod } = this;
        yield [
            {
                message: 'Enter session id',
                type: 'input',
                name: 'sid',
                skip: authMethod === u,
                required: authMethod === s,
                initial: SFSID
            },
            {
                message: 'Enter username',
                type: 'input',
                name: 'uname',
                skip: authMethod === s,
                required: authMethod === u,
                initial: SFUNAME
            },
            {
                message: 'Enter password',
                type: 'password',
                name: 'pwd',
                skip: authMethod === s,
                required: authMethod === u,
                initial: SFPWD
            }
        ];

        // yield confirmation prompt to connect to sf
        const { sid, uname, pwd, instanceUrl } = this;
        yield [
            {
                message: 'Connect now?',
                type: 'confirm',
                name: 'connection',
                required: true,
                initial: 'Y',
                onSubmit: async(name, value) => {
                    if(!value) return undefined;
                    // connect via jsforce
                    let opts = { loginUrl: instanceUrl, instanceUrl };
                    if(authMethod === s){
                        opts.sessionId = sid;
                        opts.accessToken = sid;
                    }
                    const conn = new Connection(opts);
                    try{
                        if(authMethod === s){
                            await conn.identity(); // throws error if sessionId is invalid
                        } else{
                            await conn.loginBySoap(uname, pwd);
                        }
                    } catch(err){
                        throw new Error('Could not authenticate using provided auth info');
                    }

                    // return the authorized connection
                    return conn;
                }
            }
        ]

    }
}

module.exports = Ent;