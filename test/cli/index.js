const { exec } = require('node:child_process');
const { join } = require('node:path');
const { createReadStream } = require('node:fs');
const readline = require('node:readline');
const Enquirer = require('enquirer');
const { ent } = require('../../index');
ent.interactive(true);

// the command script
async function *getFileCommands(filePath){
    filePath = join(process.cwd(), filePath);
    const readStream = createReadStream(filePath, 'utf8');
    const rl = readline.createInterface({
        input: readStream,
        crlfDelay: Infinity
    });

    for await (const line of rl) {
        yield line;
    }

    /** yield 'generate';
    yield '\r'; // login url
    yield '\r'; // sessionId confirm
    yield '\r'; // sessionId input
    yield '\r'; // confirm connect now
    yield './.generated'; // output dir
    yield 'query\r'; // create a query
    yield 'never\r'; */
}

(async()=>{
    // get readpath from args
    const scriptPath = process.argv[2];
    if(!scriptPath) throw new Error('Path to script must be provided as first command argument');
    
    // get iterator to read script line-by-line
    const iter = getFileCommands(scriptPath);

    // shadow Enquirer prompt method to add self as event handler
    const orig = Enquirer.prototype.prompt;
    Enquirer.prototype.prompt = async function(...args){
        // add event listener to listen for prompt events and provide inputs from script file
        this.addListener('prompt', (prompt, enquirerInstance) => {
            process.nextTick(async()=>{
                // don't processed skipped prompts (those not presented to user)
                const skip = await (async ()=>{
                    if(typeof prompt.skip === 'boolean') return prompt.skip;
                    
                    return await prompt.skip();
                })();
                if(skip) return;

                let { done, value } = (await iter.next());
                if(!done){
                    // const input = `${value}\n`;
                    // set the value and return its result
                    prompt.value = value; // TODO working until Autocomplete type prompt
                    
                    await prompt.submit();
                } else{
                    console.log(`End of file: ${scriptPath}`);
                    process.exit(0);
                }
            });
        });
        // return the result of original method call, bound to its Enquirer instance
        const result = await orig.call(this, ...args);

        return result;
    }

    await ent();

    // exec cmd
    const cmdPath = join(process.cwd(), './bin/sfent');
    const cp = exec(`node ${cmdPath}`);

    // listen to stdout and read lines from the script file
    let iterToggle = true; // used to ignore the lines enquirer writes back immediately after user submits input
    let lastUserPrompt = 'dummyInitialValue';
    cp.stdout.on('data', async (data) => {
        data = data.toString();
        console.log(data);
        const userPrompt = data.includes('[1m');
        // ignore script lines that are not user prompts or simply readback input from user prompts
        if(userPrompt && !data.split('[1m')[1].startsWith(lastUserPrompt)){
            if(!iterToggle){
                iterToggle = true;
                return;
            }
            // reset the toggle so readback is ignored
            iterToggle = false;
            // set last prompt to avoid duplicate condition entries
            lastUserPrompt = data.split('[1m')[1];
            let { done, value } = (await iter.next());
            if(!done){
                setTimeout(()=>{
                    const input = `${value}\r`;
                    cp.stdin.write(input);
                }, 1000);
            } else{
                console.log(`End of file: ${scriptPath}`);
                process.exit(0);
            }
        }
    });
})();