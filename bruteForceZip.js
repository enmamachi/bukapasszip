const yauzl = require("yauzl");
const { ZipFile } = require("zip-lib");

// Fungsi untuk mencoba password
function tryPassword(zipFilePath, password, callback) {
    yauzl.open(zipFilePath, { password: password }, (err, zipFile) => {
        if (err) {
            // Jika ada kesalahan, kita anggap password salah
            return callback(false);
        }
        // Jika berhasil membuka, kita panggil callback dengan true
        callback(true);
    });
}

// Fungsi untuk brute force password
function bruteForce(zipFilePath, charset, length, currentPassword = "") {
    if (currentPassword.length === length) {
        // Jika panjang password sudah sesuai, coba password
        tryPassword(zipFilePath, currentPassword, (success) => {
            if (success) {
                console.log(`Password ditemukan: ${currentPassword}`);
                process.exit(0);
            }
        });
        return;
    }

    // Loop melalui setiap karakter dalam charset
    for (let i = 0; i < charset.length; i++) {
        const nextPassword = currentPassword + charset[i];
        bruteForce(zipFilePath, charset, length, nextPassword);
    }
}

// Konfigurasi
const zipFilePath = "path/to/your/file.zip"; // Ganti dengan path file ZIP Anda
const charset = "abcdefghijklmnopqrstuvwxyz"; // Karakter yang akan digunakan
const length = 4; // Panjang password yang akan dicoba

// Mulai brute force
bruteForce(zipFilePath, charset, length);
