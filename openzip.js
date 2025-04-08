const AdmZip = require('adm-zip');
const fs = require('fs');

function tryPassword(zipFilePath, password) {
    try {
        const zip = new AdmZip(zipFilePath);
        zip.extractAllTo(/* target path */ "output", /* overwrite */ true, password);
        console.log(`Password ditemukan: ${password}`);
        process.exit(0);
    } catch (err) {
        // Jika ada kesalahan, kita anggap password salah
        return false;
    }
}

function bruteForce(zipFilePath, charset, length, currentPassword = "") {
    if (currentPassword.length === length) {
        tryPassword(zipFilePath, currentPassword);
        return;
    }

    for (let i = 0; i < charset.length; i++) {
        const nextPassword = currentPassword + charset[i];
        bruteForce(zipFilePath, charset, length, nextPassword);
    }
}

// Konfigurasi
const zipFilePath = "D:\project\bukapasszip\a.zip"; // Ganti dengan path file ZIP Anda
const charset = "abcdefghijklmnopqrstuvwxyz"; // Karakter yang akan digunakan
const length = 4; // Panjang password yang akan dicoba

// Mulai brute force
bruteForce(zipFilePath, charset, length);
