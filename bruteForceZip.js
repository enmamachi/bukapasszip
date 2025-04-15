const yauzl = require("yauzl");
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const os = require('os');

// Track all attempted passwords
const passwordAttempts = new Set();

async function tryPassword(zipFilePath, password) {
    return new Promise((resolve) => {
        yauzl.open(zipFilePath, { password }, (err, zipFile) => {
            if (err) {
                if (err.code === 'BAD_PASSWORD' || err.message.includes('bad password')) {
                    return resolve(false);
                }
                console.error('Error:', err);
                process.exit(1);
            }
            zipFile.close();
            resolve(true);
        });
    });
}

async function workerTask() {
    const { zipFilePath, charset, length, workerId, totalWorkers } = workerData;
    let attempts = 0;
    
    // Generate all possible combinations
    function* generateCombinations(current = '') {
        if (current.length === length) {
            yield current;
            return;
        }
        for (const char of charset) {
            yield* generateCombinations(current + char);
        }
    }

    for (const password of generateCombinations()) {
        // Distribute work among workers
        if (password.charCodeAt(0) % totalWorkers !== workerId) continue;
        
        attempts++;
        passwordAttempts.add(password);
        
        const success = await tryPassword(zipFilePath, password);
        if (success) {
            parentPort.postMessage({ 
                password,
                attempts,
                tested: Array.from(passwordAttempts).slice(-10)
            });
            return;
        }
    }
    parentPort.postMessage({ done: true, attempts });
}

async function bruteForce(zipFilePath, charset, length) {
    const cpuCount = Math.min(os.cpus().length, charset.length);
    const workers = [];
    let completedWorkers = 0;
    let totalAttempts = 0;

    console.log(`Starting brute force with ${cpuCount} workers...`);
    console.log(`Character set: ${charset}`);
    console.log(`Password length: ${length}`);
    console.log(`Total possible combinations: ${Math.pow(charset.length, length)}`);

    for (let i = 0; i < cpuCount; i++) {
        const worker = new Worker(__filename, {
            workerData: {
                zipFilePath,
                charset,
                length,
                workerId: i,
                totalWorkers: cpuCount
            }
        });

        worker.on('message', (msg) => {
            if (msg.password) {
                console.log(`\nSUCCESS! Password found: ${msg.password}`);
                console.log(`Total attempts: ${msg.attempts}`);
                console.log(`Recent attempts: ${msg.tested.join(', ')}`);
                workers.forEach(w => w.terminate());
                process.exit(0);
            } else {
                completedWorkers++;
                totalAttempts += msg.attempts;
                console.log(`Worker ${i} completed. Attempts: ${msg.attempts}`);
                
                if (completedWorkers === cpuCount) {
                    console.log(`\nAll workers finished. Total attempts: ${totalAttempts}`);
                    console.log(`Password not found. Total tested: ${passwordAttempts.size}`);
                    process.exit(1);
                }
            }
        });

        workers.push(worker);
    }
}

if (isMainThread) {
    const zipFilePath = "path/to/your/file.zip";
    const charset = "clg"; // Your test charset
    const length = 4;
    
    bruteForce(zipFilePath, charset, length).catch(console.error);
} else {
    workerTask().catch(console.error);
}
