const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const DB_PATH = path.join(__dirname, 'data', 'db.json');
const API_KEY = 'fingerprint_secret_key'; // Simple API Key for ESP32

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Database Helpers
const readDB = () => JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
const writeDB = (data) => fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));

// --- API Endpoints for ESP32 ---

// POST /api/absen -> Receive attendance from ESP32
app.post('/api/absen', (req, res) => {
  const { finger_id, timestamp } = req.body;
  const apiKey = req.headers['x-api-key'];

  if (apiKey !== API_KEY) {
    return res.status(401).json({ success: false, message: 'Unauthorized API Key' });
  }

  const db = readDB();
  const siswa = db.siswa.find(s => s.finger_id === finger_id);

  if (!siswa) {
    return res.status(404).json({ success: false, message: 'Fingerprint ID not found' });
  }

  const time = new Date(timestamp);
  const hour = time.getHours();
  const minute = time.getMinutes();
  const dateStr = time.toLocaleDateString('en-CA'); // YYYY-MM-DD local format

  // Check if already checked in today
  const existingAbsensi = db.absensi.find(a => a.siswa_id === siswa.id && a.tanggal === dateStr);

  if (existingAbsensi) {
    // Clock-out logic (Pulang)
    if (existingAbsensi.jam_pulang) {
      return res.status(400).json({ success: false, message: 'Sudah absen pulang hari ini' });
    }

    // Assume school finishes at 15:00 (3 PM)
    if (hour < 15) {
      return res.status(400).json({ success: false, message: 'Belum jam pulang (Minimal 15:00)' });
    }

    existingAbsensi.jam_pulang = time.toTimeString().split(' ')[0];
    writeDB(db);
    return res.json({ success: true, message: `Absen Pulang: ${siswa.nama}` });
  }

  // Clock-in logic (Masuk)
  let status = 'Hadir';
  if (hour > 6 || (hour === 6 && minute > 45)) {
    status = 'Terlambat';
  }

  const newAbsensi = {
    id: Date.now(),
    siswa_id: siswa.id,
    tanggal: dateStr,
    jam_masuk: time.toTimeString().split(' ')[0],
    jam_pulang: null,
    status: status,
    created_at: time.toISOString()
  };

  db.absensi.push(newAbsensi);
  writeDB(db);

  res.json({ success: true, message: `Absen Masuk: ${siswa.nama} (${status})` });
});

// --- API Endpoints for Admin Dashboard ---

// GET /api/siswa -> List all students
app.get('/api/siswa', (req, res) => {
  const db = readDB();
  res.json(db.siswa);
});

// POST /api/siswa -> Add new student
app.post('/api/siswa', (req, res) => {
  const { nama, nis, kelas, finger_id } = req.body;
  const db = readDB();
  
  if (db.siswa.find(s => s.finger_id === finger_id)) {
    return res.status(400).json({ success: false, message: 'Finger ID already registered' });
  }

  const newSiswa = {
    id: Date.now(),
    nama,
    nis,
    kelas,
    finger_id,
    created_at: new Date().toISOString()
  };

  db.siswa.push(newSiswa);
  writeDB(db);
  res.json({ success: true, data: newSiswa });
});

// DELETE /api/siswa/:id -> Delete student
app.delete('/api/siswa/:id', (req, res) => {
  const { id } = req.params;
  const db = readDB();
  db.siswa = db.siswa.filter(s => s.id != id);
  db.absensi = db.absensi.filter(a => a.siswa_id != id); // Cascade delete attendance
  writeDB(db);
  res.json({ success: true });
});

// GET /api/absen/hari-ini -> Get today's attendance logs
app.get('/api/absen/hari-ini', (req, res) => {
  const db = readDB();
  const dateStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD local format
  
  const todayLogs = db.absensi.filter(a => a.tanggal === dateStr).map(log => {
    const student = db.siswa.find(s => s.id === log.siswa_id);
    return { ...log, siswa: student };
  });

  const summary = {
    total_hadir: todayLogs.filter(a => a.status === 'Hadir').length,
    total_terlambat: todayLogs.filter(a => a.status === 'Terlambat').length,
    total_siswa: db.siswa.length
  };

  res.json({ logs: todayLogs, summary });
});

// GET /api/absen/rekap -> Get all reports
app.get('/api/absen/rekap', (req, res) => {
  const db = readDB();
  const rekap = db.absensi.map(log => {
    const student = db.siswa.find(s => s.id === log.siswa_id);
    return { ...log, siswa: student };
  });
  res.json(rekap);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
