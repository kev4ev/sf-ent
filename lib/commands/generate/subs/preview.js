const { SubCommand } = require("../../../types");
const { join } = require('path');
const { createWriteStream } = require('node:fs');

/**
 * Prints the current state of Generate command to a file or stdout
 */
class Preview extends SubCommand{
    
    /**
     * @constructor
     * @param {object} generateState current state of generate
     * @param {string|import('node:stream').Writable} [filePathOrWriteStream] optional, defaulting the process.stdout;
     * when provided, must be a path to a file to be written to or a NodeJS WritableStream
     */
    constructor(generateState, filePathOrWriteStream=process.stdout){
        super();
        this.generateState = generateState;
        this.filePathOrWriteStream = filePathOrWriteStream;
    }

    async preRun(){
        // establish the write target
        if(typeof this.filePathOrWriteStream === 'string'){
            this.#createWriteStream(this.filePathOrWriteStream);
        }
    }

    #createWriteStream(filePath){
        const path = join(process.cwd(), filePath);
        this.filePathOrWriteStream = createWriteStream(path, { encoding: 'utf-8' });
    }

    async readyToExecute(){
        return this.filePathOrWriteStream && this.filePathOrWriteStream.writable;
    }

    async *getPrompts(){
        const STD = 'Print to console';
        /** @type {Array<import("../../../types/command/Diviner").Question>} */
        let prompts = [
            {
                message: 'Where do you want to output the preview? ',
                name: 'filePathInput',
                type: 'input',
                initial: STD,
                required: true,
                validate: async (val) => {
                    if(val !== STD){
                        try{
                            this.#createWriteStream(val);

                            return true;
                        } catch(err){
                            return `Could not resolve path "${val}" from "${process.cwd()}"`;
                        }
                    }

                    return true;
                }
            }
        ];
        yield prompts;
        // scope selection
        prompts = [
            {
                message: 'Select a subrequest to preview or "*" to preview all',
                name: 'itemSelect',
                type: 'autocomplete',
                required: true,
                initial: '*',
                choices: [ '*', '<done>', ...(this?.generateState?.compositeRequest?.map(req => req.referenceId) || [ ]) ]
            }
        ];
        // yield recursive prompt until user selects done
        while(this.itemSelect !== '<done>'){
            yield prompts;
            if(this.itemSelect !== '<done>'){
                await new Promise((res, rej) => {
                    // default writeStream highwatermark is ~ 16k; chunk to avoid internal buffer overflow
                    const scope = this.itemSelect === '*' ? 
                        this.generateState : 
                        this.generateState.compositeRequest.filter(req => req.referenceId === this.itemSelect)[0];
                    let preview = JSON.stringify(scope, undefined, 2);
                    const chunkSize = 15000;
                    // chunk writes to the stream
                    const writeNextChunk = () => {
                        const chunk = preview.substring(0, preview.length < chunkSize ? undefined : chunkSize - 1);
                        const writeSuccess = this.filePathOrWriteStream.write(chunk, 'utf-8');
                        if(writeSuccess) preview = preview.slice(chunk.length);
                    }
                    // evt handlers; 'drain' will only fire if stream buffer overflows to indicate it is ready for new data
                    this.filePathOrWriteStream.on('error', (err) => rej(err));
                    this.filePathOrWriteStream.on('drain', () => writeNextChunk());
                    // begin writing, making the first chunk a newline
                    this.filePathOrWriteStream.write('\n');
                    while(preview.length > 0){
                        writeNextChunk();
                    }
                    this.filePathOrWriteStream.write('\n');
                    res();
                });
            }
        }
        // close the file write stream
        if(this.filePathOrWriteStream !== process.stdout) this.filePathOrWriteStream.end();
    }

    async finish(){ return undefined; }
}

module.exports = (generateState, filePathOrWriteStream) => new Preview(generateState, filePathOrWriteStream);