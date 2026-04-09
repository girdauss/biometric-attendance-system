const SERVER_URL = 'http://localhost:3000/api/absen';
const API_KEY = 'fingerprint_secret_key';

async function sendFakeAbsen(fingerId, customTime = null) {
  // Use current time if customTime is not provided
  const timestamp = customTime || new Date().toISOString();

  const payload = {
    finger_id: fingerId,
    timestamp: timestamp
  };

  try {
    const response = await fetch(SERVER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    console.log(`[Status ${response.status}] Sent Finger ID: ${fingerId}`);
    console.log('Server Response:', result);
  } catch (error) {
    console.error('Error sending request:', error.message);
  }
}

// --- Contoh Penggunaan ---

// 1. Simulasi Hadir (Jam 07:15)
// sendFakeAbsen(1, "2025-01-01T07:15:00");

// 2. Simulasi Terlambat (Jam 08:30)
// sendFakeAbsen(2, "2025-01-01T08:30:00");

// 3. Kirim Absen dengan waktu sekarang
const args = process.argv.slice(2);
const id = parseInt(args[0]) || 1;
sendFakeAbsen(id);
