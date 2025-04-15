const yauzl = require("yauzl");
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const os = require('os');

// Track all attempted passwords (only in main thread)
const passwordAttempts = isMainThread ? new Set() : null;

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
        // Distribute work among workers based on first character
        if (password.charCodeAt(0) % totalWorkers !== workerId) continue;
        
        attempts++;
        const success = await tryPassword(zipFilePath, password);
        
        // Report back to main thread
        parentPort.postMessage({ 
            attempt: password,
            workerId,
            success
        });

        if (success) {
            return; // Exit if password found
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
                totalWorkers: cpuCount  // Fixed typo: was 'totalWorkers'
            }
        });

        worker.on('message', (msg) => {
            if (msg.success) {
                console.log(`\nSUCCESS! Password found: ${msg.attempt}`);
                console.log(`By Worker ${msg.workerId}`);
                workers.forEach(w => w.terminate());
                process.exit(0);
            } 
            else if (msg.done) {
                completedWorkers++;
                totalAttempts += msg.attempts;
                console.log(`Worker ${i} completed. Attempts: ${msg.attempts}`);
                
                if (completedWorkers === cpuCount) {
                    console.log(`\nAll workers finished. Total attempts: ${totalAttempts}`);
                    process.exit(1);
                }
            }
            else if (msg.attempt) {
                passwordAttempts.add(msg.attempt);
                if (passwordAttempts.size % 100 === 0) {
                    console.log(`Progress: ${passwordAttempts.size} attempts`);
                }
            }
        });

        workers.push(worker);
    }
}

if (isMainThread) {
    const zipFilePath = "D:\\project\\bukapasszip\\a.zip";
    const charset = "clg"; // Your test charset
    const length = 4;
    
    bruteForce(zipFilePath, charset, length).catch(console.error);
} else {
    workerTask().catch(console.error);
}
