const yauzl = require("yauzl");
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const os = require('os');

// Debugging tracker
const passwordAttempts = new Set();
let attemptCount = 0;

// Generator function that produces all possible passwords
function* generatePasswords(charset, maxLength, current = '') {
    if (current.length === maxLength) {
        yield current;
        return;
    }
    for (const char of charset) {
        yield* generatePasswords(charset, maxLength, current + char);
    }
}

// Worker function
async function workerTask() {
    const { zipFilePath, charset, length, workerId } = workerData;
    const startTime = Date.now();
    
    console.log(`Worker ${workerId} started`);
    
    for (const password of generatePasswords(charset, length)) {
        // Skip passwords not meant for this worker (for distribution)
        if (password.charCodeAt(0) % workerData.totalWorkers !== workerId) {
            continue;
        }

        attemptCount++;
        passwordAttempts.add(password);
        
        if (attemptCount % 1000 === 0) {
            console.log(`Worker ${workerId} tried ${attemptCount} passwords... Last tried: ${password}`);
        }

        const success = await new Promise(resolve => {
            yauzl.open(zipFilePath, { password }, (err, zipFile) => {
                if (err) {
                    if (err.code === 'BAD_PASSWORD') {
                        return resolve(false);
                    }
                    console.error(`Worker ${workerId} error:`, err);
                    process.exit(1);
                }
                zipFile.close();
                resolve(true);
            });
        });

        if (success) {
            parentPort.postMessage({ 
                password,
                attempts: attemptCount,
                duration: (Date.now() - startTime) / 1000 + 's'
            });
            return;
        }
    }
    parentPort.postMessage({ done: true });
}

async function bruteForce(zipFilePath, charset, length) {
    if (!isMainThread) return;

    const cpuCount = Math.min(os.cpus().length, charset.length); // Don't create more workers than charset length
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
                console.log(`Attempts: ${msg.attempts}`);
                console.log(`Time: ${msg.duration}`);
                console.log(`Tested passwords:`, Array.from(passwordAttempts).slice(-10));
                
                // Terminate all workers
                workers.forEach(w => w.terminate());
                process.exit(0);
            } else if (msg.done) {
                completedWorkers++;
                totalAttempts += msg.attempts || 0;
                console.log(`Worker ${i} completed. Total completed: ${completedWorkers}/${cpuCount}`);
                
                if (completedWorkers === cpuCount) {
                    console.log(`\nAll workers finished. Total attempts: ${totalAttempts}`);
                    console.log(`Password not found among tested combinations.`);
                    process.exit(1);
                }
            }
        });

        worker.on('error', (err) => {
            console.error(`Worker ${i} error:`, err);
        });

        worker.on('exit', (code) => {
            if (code !== 0) {
                console.error(`Worker ${i} stopped with exit code ${code}`);
            }
        });

        workers.push(worker);
    }
}

// Entry point
if (isMainThread) {
    const zipFilePath = "path/to/your/file.zip";
    const charset = "abcdefghijklmnopqrstuvwxyz"; // Try with "abcde" first for testing
    const length = 4;
    
    bruteForce(zipFilePath, charset, length)
        .catch(console.error);
} else {
    workerTask().catch(console.error);
}
