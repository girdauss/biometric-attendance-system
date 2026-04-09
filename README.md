# 🫆 Biometric Attendance System

Sistem absensi modern yang dirancang untuk sekolah, mengintegrasikan sensor sidik jari ESP32 dengan dashboard admin berbasis web yang responsif. Sistem ini mencakup manajemen data siswa, rekapitulasi kehadiran otomatis, dan fitur perizinan manual.

## 🚀 Fitur Utama

- **Integrasi Hardware**: Mendukung ESP32 dengan sensor sidik jari (R307/AS608).
- **Dashboard Real-Time**: Pantau kehadiran siswa secara langsung dengan auto-refresh setiap 5 detik.
- **Logika Absensi Otomatis**: Penentuan status otomatis (Hadir, Terlambat) berdasarkan jam operasional sekolah.
- **Sistem Clock-In & Clock-Out**: Mendukung absen masuk di pagi hari dan absen pulang di siang hari.
- **Manajemen Siswa (CRUD)**: Tambah, edit, dan hapus data siswa dengan dukungan hingga **3 Finger ID** per siswa.
- **Fitur Izin & Sakit**: Admin dapat memberikan status Izin/Sakit/Pulang Awal secara manual dengan kolom keterangan.
- **Filter Canggih**: Filter berdasarkan Status, Kelas, Angkatan, dan Nama Siswa di Dashboard & Laporan.
- **Export Data**: Unduh rekapitulasi kehadiran dalam format CSV.
- **Dynamic Island Clock**: Jam mengapung futuristik dengan format 24 jam di seluruh halaman.
- **Batch Delete**: Hapus banyak data siswa sekaligus dengan sistem centang (checkbox).

## 🛠️ Teknologi yang Digunakan

- **Backend**: Node.js, Express.js
- **Frontend**: HTML5, CSS3 (Vanilla), JavaScript (ES6+)
- **Database**: JSON (Flat-file database untuk kemudahan portabilitas)
- **Hardware**: ESP32, Sensor Fingerprint AS608/R307

## 📋 Prasyarat

- **Node.js** (Versi 18 atau lebih baru direkomendasikan)
- **Arduino IDE** (Untuk upload kode ke ESP32)

## ⚙️ Cara Instalasi & Menjalankan

### 1. Kloning atau Download Project
Pastikan semua file berada dalam satu folder utama.

### 2. Instalasi Dependency
Buka terminal di folder proyek dan jalankan:
```bash
npm install
```

### 3. Konfigurasi Jam Operasional (Opsional)
Buka `server.js` dan sesuaikan variabel jam pada bagian `/api/absen`:
- Jam Masuk: default 07:00 (Terlambat jika > 07:30)
- Jam Pulang: default 14:00/15:00

### 4. Menjalankan Server
Jalankan perintah berikut:
```bash
node server.js
```
Akses website di: `http://localhost:3000`

## 📟 Konfigurasi ESP32

1. Buka file `esp32/fingerprint_sender.ino` di Arduino IDE.
2. Ubah `ssid` dan `password` Wi-Fi Anda.
3. Ubah `serverUrl` dengan alamat IP laptop/PC Anda (Contoh: `http://192.168.1.15:3000/api/absen`).
4. Pastikan library `Adafruit Fingerprint Sensor` dan `ArduinoJson` sudah terinstal.
5. Upload kode ke ESP32.

## 🧪 Simulasi Tanpa Hardware
Jika Anda ingin mencoba fitur website tanpa ESP32, gunakan script simulasi yang sudah disediakan:
```bash
# Ganti angka 1 dengan Finger ID yang sudah terdaftar di Data Siswa
node simulate_absen.js 1
```

## 📂 Struktur Folder
- `server.js`: Logika API dan Server.
- `data/db.json`: Tempat penyimpanan data siswa & absensi.
- `public/`: File frontend (HTML, CSS, JS).
- `esp32/`: Kode sumber Arduino/ESP32.

---
**Dibuat untuk kebutuhan Tugas Akhir IoT.** 🚀
