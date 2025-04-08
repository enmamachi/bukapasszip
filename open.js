const AdmZip = require('adm-zip');
const fs = require('fs');

let found = false; // Variabel untuk menandai jika password ditemukan

function tryPassword(zipFilePath, password) {
    try {
        const zip = new AdmZip(zipFilePath);
        console.log(`Mencoba password: ${password}`); // Log password yang sedang dicoba
        zip.extractAllTo("output", true, password);
        console.log(`Password ditemukan: ${password}`);
        found = true; // Tandai bahwa password telah ditemukan
        return true; // Kembalikan true jika password ditemukan
    } catch (err) {
        // Log kesalahan jika password salah
        if (err.message.includes("Incompatible password parameter")) {
            console.error(`Password tidak kompatibel: ${password}`);
        } else {
            console.error(`Kesalahan saat mencoba password ${password}: ${err.message}`);
        }
        return false; 
    }
}

function bruteForce(zipFilePath, charset, length) {
    const totalCombinations = Math.pow(charset.length, length);
    let count = 0;

    function generatePassword(currentPassword) {
        if (found) return; // Jika password sudah ditemukan, hentikan eksekusi

        if (currentPassword.length === length) {
            if (tryPassword(zipFilePath, currentPassword)) {
                return; // Jika password ditemukan, hentikan eksekusi
            }
            count++;
            console.log(`Mencoba password: ${currentPassword} (${count}/${totalCombinations})`);
            return;
        }

        for (let i = 0; i < charset.length; i++) {
            generatePassword(currentPassword + charset[i]);
            if (found) return; // Periksa lagi setelah setiap panggilan rekursif
        }
    }

    generatePassword("");
}

// Konfigurasi
const zipFilePath = "D:\\project\\bukapasszip\\a.zip"; // Ganti dengan path file ZIP Anda
const charset = "clg"; // Charset dengan 3 karakter
const length = 4; // Panjang password yang akan dicoba

// Pastikan direktori output ada
if (!fs.existsSync("output")) {
    fs.mkdirSync("output");
}

// Mulai brute force
bruteForce(zipFilePath, charset, length);
