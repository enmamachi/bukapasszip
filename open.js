const AdmZip = require('adm-zip');
const fs = require('fs');

let found = false; // Variable to indicate if the password has been found

function tryPassword(zipFilePath, password) {
    try {
        const zip = new AdmZip(zipFilePath);
        zip.extractAllTo("output", true, password);
        console.log(`Password found: ${password}`);
        found = true; // Mark that the password has been found
        return true; // Return true if the password is found
    } catch (err) {
        // Log error if the password is incorrect
        if (err.message.includes("Incompatible password parameter")) {
            // This error indicates the password is incorrect
            return false; 
        } else {
            console.error(`Error trying password ${password}: ${err.message}`);
            return false; 
        }
    }
}

function bruteForce(zipFilePath, charset, length) {
    const totalCombinations = Math.pow(charset.length, length);
    let count = 0;

    function generatePassword(currentPassword) {
        if (found) return; // If the password has been found, stop execution

        if (currentPassword.length === length) {
            count++;
            console.log(`Trying password: ${currentPassword} (${count}/${totalCombinations})`);
            if (tryPassword(zipFilePath, currentPassword)) {
                return; // If the password is found, stop execution
            }
            return;
        }

        for (let i = 0; i < charset.length; i++) {
            generatePassword(currentPassword + charset[i]);
            if (found) return; // Check again after each recursive call
        }
    }

    generatePassword("");
}

// Configuration
const zipFilePath = "D:\\project\\bukapasszip\\a.zip"; // Change to your ZIP file path
const charset = "clg"; // Charset with 3 characters
const length = 4; // Length of the password to try

// Ensure the output directory exists
if (!fs.existsSync("output")) {
    fs.mkdirSync("output");
}

// Start brute force
bruteForce(zipFilePath, charset, length);
