const { resolve } = require;
const { join } = require('node:path');
const { Command } = require("../../types");
const { writeFile } = require('node:fs/promises');
const axios = require('axios');

class Load extends Command{

    constructor(args){
        super(args);
    }

    static get flagConfig(){
        return {
            in: {
                char: 'i',
                description: 'relative path to composite JSON file',
                required: true
            },
            out: {
                description: 'path to write output of response; defaults to stdout'
            },
            pipe: {
                char: 'p',
                description: 'pipe to a batch file EJS'
            },
            org: {
                char: 'o',
                description: 'authorized org to send composite api request'
            },
            teardown: {
                char: 't',
                description: 'when true, a teardown file will be created in the same directory as the import file',
                bool: true
            }
        }
    }

    static interactiveMeta(){
        return {
            name: 'Load',
            hint: 'send a composite request to an authorized org'
        }
    }
    
    get requiresConnection(){ return true; }

    set in(input){
        this.#in(input);
    }
    get in(){ return this._in; }

    #in(input){
        const full = join(process.cwd(), input);
        try{
            resolve(full);
            this._in = full;

            return true;
        } catch(err){
            const msg = `Could not resolve the file path:\n${full}`;
            if(this.interactive) return msg;

            throw new Error(msg);
        }
    }

    async *getPrompts(){
        yield this.promptFactory(
            {
                name: 'inPath',
                type: 'input',
                required: true,
                message: 'Enter relative path to composite JSON file',
                validate: (input) => {
                    if(input){
                        return this.#in(input);
                    }
                }
            }
        ); 

        yield this.promptFactory(
            {
                name: 'teardown',
                type: 'autocomplete',
                message: 'Create teardown file?',
                choices: [ 'No', 'Yes' ],
                result: (input) => {
                    if(input){
                        this._teardown = input === 'Yes' ? true : false;
                    }
                }
            }
        );
    }

    async readyToExecute(){
        return this._in ? true : 'Path to composite request JSON must be provided';
    }

    /** shadow superclass since no subcommands */
    async execute(){
        return await this.executeInteractive();
    }

    /** shadow superclass since no subcommands */
    async executeInteractive(){
        // load the request (clear cache) and make callout
        require.cache[this._in] = undefined;
        const data = require(this._in);
        // make the request
        const { instanceUrl, version, accessToken } = this.connection;
        const base = `${instanceUrl.replace(/\/$/, '')}/services/data/${version.startsWith('v') ? version : 'v' + version}`,
            url = `${base}/composite`;
        const resp = await axios.default.post(
            url,
            data,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        if(resp.status === 200){
            // handle teardown
            if(this._teardown){
                // use versioned api resources
                const { request, subrequests } = require('../../api/composite/index')(`v${version}`);
                const deleteRequests = [ ];
                resp.data.compositeResponse.forEach((res, index) => {
                    // TODO how to handle sobjectcollections?
                    const { httpStatusCode, httpHeaders } = res;
                    if(httpStatusCode === 201 && httpHeaders?.Location){
                        const [ , resource ] = httpHeaders.Location.split('/sobjects/');
                        const [ sobject, id ] = resource.split('/');
                        deleteRequests.push(new subrequests.sobject(
                            `SObjectDELETE_${sobject}_${id}`, 
                            'DELETE', 
                            sobject
                        ).delete(id));
                    }
                });
                const teardown = request(deleteRequests);
                // write the file
                const writePath = this._in.replace(/\.json/, '.teardown.json');
                await writeFile(writePath, JSON.stringify(teardown, undefined, 4), 'utf-8');
                console.log(`Wrote teardown file to:\n${writePath}`);
            }
        }
        console.log(this.chalk.yellow(JSON.stringify(resp.data, null, 4)));
    }
}

module.exports = Load;