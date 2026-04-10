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
  const siswa = db.siswa.find(s => 
    s.finger_id === finger_id || (Array.isArray(s.finger_ids) && s.finger_ids.includes(finger_id))
  );

  if (!siswa) {
    return res.status(404).json({ success: false, message: 'Fingerprint ID not found' });
  }

  // Determine timestamp: Real-time scan or simulation?
  let time;
  // If the request comes from ESP32 (usually doesn't provide a precise timestamp 
  // or sends a placeholder), use current server time.
  if (!timestamp || timestamp.startsWith("202")) { 
    // If timestamp starts with 202x, it's likely a simulation or placeholder.
    // For real production use from ESP32, we prefer server's clock.
    time = new Date(); 
  } else {
    time = new Date(timestamp);
  }
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
    keterangan: '',
    created_at: time.toISOString()
  };

  db.absensi.push(newAbsensi);
  writeDB(db);

  res.json({ success: true, message: `Absen Masuk: ${siswa.nama} (${status})` });
});

// POST /api/absen/izin -> Manual permission (Izin/Pulang Awal)
app.post('/api/absen/izin', (req, res) => {
  const { siswa_id, status, keterangan } = req.body;
  const db = readDB();
  const dateStr = new Date().toLocaleDateString('en-CA');
  
  const existingIndex = db.absensi.findIndex(a => a.siswa_id == siswa_id && a.tanggal === dateStr);
  const currentTime = new Date().toTimeString().split(' ')[0];

  if (existingIndex !== -1) {
    // Update existing record
    db.absensi[existingIndex].status = status;
    db.absensi[existingIndex].keterangan = keterangan;
    db.absensi[existingIndex].jam_pulang = currentTime;
  } else {
    // Create new record for izin
    db.absensi.push({
      id: Date.now(),
      siswa_id: parseInt(siswa_id),
      tanggal: dateStr,
      jam_masuk: currentTime,
      jam_pulang: currentTime,
      status: status,
      keterangan: keterangan,
      created_at: new Date().toISOString()
    });
  }

  writeDB(db);
  res.json({ success: true, message: 'Status izin berhasil disimpan' });
});

// --- API Endpoints for Admin Dashboard ---

// GET /api/siswa -> List all students
app.get('/api/siswa', (req, res) => {
  const db = readDB();
  res.json(db.siswa);
});

// POST /api/siswa -> Add new student
app.post('/api/siswa', (req, res) => {
  const { nama, nis, kelas, angkatan, finger_ids } = req.body; 
  const db = readDB();
  
  if (!Array.isArray(finger_ids) || finger_ids.length === 0 || finger_ids.length > 3) {
    return res.status(400).json({ success: false, message: 'Harus 1-3 Finger ID' });
  }

  const allUsedIds = db.siswa.flatMap(s => s.finger_ids || [s.finger_id]);
  if (finger_ids.some(id => allUsedIds.includes(parseInt(id)))) {
    return res.status(400).json({ success: false, message: 'Salah satu Finger ID sudah terdaftar' });
  }

  const newSiswa = {
    id: Date.now(),
    nama,
    nis,
    kelas,
    angkatan: angkatan || '',
    finger_ids: finger_ids.map(id => parseInt(id)),
    created_at: new Date().toISOString()
  };

  db.siswa.push(newSiswa);
  writeDB(db);
  res.json({ success: true, data: newSiswa });
});

// PUT /api/siswa/:id -> Update student
app.put('/api/siswa/:id', (req, res) => {
  const { id } = req.params;
  const { nama, nis, kelas, angkatan, finger_ids } = req.body;
  const db = readDB();
  
  const index = db.siswa.findIndex(s => s.id == id);
  if (index === -1) return res.status(404).json({ success: false, message: 'Siswa tidak ditemukan' });

  const otherStudents = db.siswa.filter(s => s.id != id);
  const allUsedIds = otherStudents.flatMap(s => s.finger_ids || [s.finger_id]);
  if (finger_ids.some(fid => allUsedIds.includes(parseInt(fid)))) {
    return res.status(400).json({ success: false, message: 'Finger ID sudah digunakan siswa lain' });
  }

  db.siswa[index] = {
    ...db.siswa[index],
    nama,
    nis,
    kelas,
    angkatan: angkatan || '',
    finger_ids: finger_ids.map(fid => parseInt(fid))
  };

  writeDB(db);
  res.json({ success: true });
});

// POST /api/siswa/batch-delete -> Batch delete students
app.post('/api/siswa/batch-delete', (req, res) => {
  const { ids } = req.body; // Array of IDs
  if (!Array.isArray(ids)) return res.status(400).json({ success: false });

  const db = readDB();
  db.siswa = db.siswa.filter(s => !ids.includes(s.id));
  db.absensi = db.absensi.filter(a => !ids.includes(a.siswa_id));
  writeDB(db);
  res.json({ success: true });
});

// PUT /api/absen/:id -> Update attendance record (Manual Edit)
app.put('/api/absen/:id', (req, res) => {
  const { id } = req.params;
  const { jam_masuk, jam_pulang, status, keterangan } = req.body;
  const db = readDB();
  
  const index = db.absensi.findIndex(a => a.id == id);
  if (index === -1) return res.status(404).json({ success: false });

  db.absensi[index] = {
    ...db.absensi[index],
    jam_masuk,
    jam_pulang,
    status,
    keterangan
  };

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
    total_izin: todayLogs.filter(a => a.status === 'Izin').length,
    total_sakit: todayLogs.filter(a => a.status === 'Sakit').length,
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
