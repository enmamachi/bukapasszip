const AdmZip = require('adm-zip');

let found = false; // Variabel untuk menandai jika password ditemukan

function tryPassword(zipFilePath, password) {
    try {
        const zip = new AdmZip(zipFilePath);
        zip.extractAllTo("output", true, password);
        console.log(`Password ditemukan: ${password}`);
        found = true; // Tandai bahwa password telah ditemukan
        process.exit(0); // Keluar dari proses
    } catch (err) {
        // Jika ada kesalahan, kita anggap password salah
        return false;
    }
}

function bruteForce(zipFilePath, charset, length) {
    const totalCombinations = Math.pow(charset.length, length);
    let count = 0;

    function generatePassword(currentPassword) {
        if (found) return; // Jika password sudah ditemukan, hentikan eksekusi

        if (currentPassword.length === length) {
            tryPassword(zipFilePath, currentPassword);
            count++;
            console.log(`Mencoba password: ${currentPassword} (${count}/${totalCombinations})`);
            return;
        }

        for (let i = 0; i < charset.length; i++) {
            generatePassword(currentPassword + charset[i]);
        }
    }

    generatePassword("");
}

// Konfigurasi
const zipFilePath = "path/to/your/file.zip"; // Ganti dengan path file ZIP Anda
const charset = "abcdefghijklmnopqrstuvwxyz0123456789"; // Karakter yang akan digunakan
const length = 4; // Panjang password yang akan dicoba

// Mulai brute force
bruteForce(zipFilePath, charset, length);
