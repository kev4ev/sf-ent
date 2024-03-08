const { exec } = require('node:child_process');
const { join } = require('node:path');
const { createWriteStream } = require('fs');

(async()=>{
    // use enquirer to get the filename
    const writePath = join(process.cwd(), './test/cli/scripts/', process.argv[2] || `script.${Date.now()}.txt`);
    const writeStream = createWriteStream(writePath, 'utf-8');
    // execute cli as child process
    const cmdPath = join(process.cwd(), './bin/sfent');
    const cp = exec(`node ${cmdPath}`);
    // capture std input and write output to both a file and back to cp
    process.stdin.on('data', data => {
        data = data.toString();
        writeStream.write(data === '\n' ? '\r' : data);
        cp.stdin.write(data);
    });
    // duplicate prompts to stdout
    cp.stdout.on('data', data => {
        console.log(data.toString());
    });
    // finalization
    const finalize = () => {
        writeStream.close();
        console.log(`New script writen to ${writePath}`)
        process.exit(0);
    };
    cp.on('exit', () => {
        finalize();  
    });
    process.on('SIGINT', () => {
        finalize();
    })
})();