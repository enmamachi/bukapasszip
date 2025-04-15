const yauzl = require("yauzl");
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const os = require('os');

// Optimized password generator using iteration instead of recursion
function* generatePasswords(charset, maxLength, current = '') {
    if (current.length === maxLength) {
        yield current;
        return;
    }
    for (const char of charset) {
        yield* generatePasswords(charset, maxLength, current + char);
    }
}

// Worker function for parallel processing
async function workerTask() {
    const { zipFilePath, charset, length, startChar, endChar } = workerData;
    
    // Modified generator that only produces passwords in the worker's range
    function* workerPasswordGenerator() {
        const prefixLen = startChar.length;
        for (let p of generatePasswords(charset, length - prefixLen)) {
            const password = startChar + p;
            if (password > endChar) return;
            yield password;
        }
    }

    for (const password of workerPasswordGenerator()) {
        const success = await new Promise(resolve => {
            yauzl.open(zipFilePath, { password }, (err, zipFile) => {
                if (err) return resolve(false);
                zipFile.close();
                resolve(true);
            });
        });

        if (success) {
            parentPort.postMessage({ password });
            process.exit(0);
        }
    }
    parentPort.postMessage({ done: true });
}

// Main function
async function bruteForce(zipFilePath, charset, length) {
    if (!isMainThread) return;

    const cpuCount = os.cpus().length;
    const workers = [];
    let found = false;

    // Split work among workers by first character
    const segmentSize = Math.ceil(charset.length / cpuCount);
    
    for (let i = 0; i < cpuCount; i++) {
        const startIdx = i * segmentSize;
        const endIdx = Math.min(startIdx + segmentSize, charset.length);
        const startChar = charset[startIdx] || '';
        const endChar = charset[endIdx - 1] || charset[charset.length - 1];

        const worker = new Worker(__filename, {
            workerData: {
                zipFilePath,
                charset,
                length,
                startChar,
                endChar
            }
        });

        worker.on('message', (msg) => {
            if (msg.password) {
                console.log(`Password found: ${msg.password}`);
                workers.forEach(w => w.terminate());
                found = true;
            }
        });

        workers.push(worker);
    }

    // Cleanup if all workers finish
    await Promise.all(workers.map(w => new Promise(resolve => {
        w.on('exit', resolve);
    })));

    if (!found) {
        console.log('Password not found');
    }
}

// Entry point
if (isMainThread) {
    const zipFilePath = "path/to/your/file.zip";
    const charset = "abcdefghijklmnopqrstuvwxyz";
    const length = 4;
    
    bruteForce(zipFilePath, charset, length)
        .catch(console.error);
} else {
    workerTask().catch(console.error);
}
