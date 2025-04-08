const AdmZip = require('adm-zip');

let found = false; // Variabel untuk menandai jika password ditemukan

function tryPassword(zipFilePath, password) {
    try {
        const zip = new AdmZip(zipFilePath);
        zip.extractAllTo("output", true, password);
        console.log(`Password ditemukan: ${password}`);
        found = true; // Tandai bahwa password telah ditemukan
        return true; // Kembalikan true jika password ditemukan
    } catch (err) {
        // Jika ada kesalahan, kita anggap password salah
        // console.error(`Kesalahan saat mencoba password ${password}: ${err.message}`);
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

// Mulai brute force
bruteForce(zipFilePath, charset, length);
