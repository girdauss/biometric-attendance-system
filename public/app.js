// Configuration
const API_URL = ''; // Relative path since we're serving from the same server

// --- Navigation & Clock ---
setInterval(() => {
    const timeElement = document.getElementById('island-time');
    if (timeElement) {
        // Enforce 24-hour format
        timeElement.innerText = new Date().toLocaleTimeString('en-GB', { hour12: false });
    }
}, 1000);

// --- Dashboard Logic ---
async function loadDashboard() {
    if (!document.getElementById('today-body')) return;
    
    try {
        const responseSiswa = await fetch(`${API_URL}/api/siswa`);
        const allSiswaList = await responseSiswa.json();
        
        const responseAbsen = await fetch(`${API_URL}/api/absen/hari-ini`);
        const { logs, summary } = await responseAbsen.json();
        
        document.getElementById('stat-total').innerText = summary.total_siswa;
        document.getElementById('stat-hadir').innerText = summary.total_hadir;
        document.getElementById('stat-terlambat').innerText = summary.total_terlambat;
        document.getElementById('stat-izin').innerText = summary.total_izin;
        document.getElementById('stat-sakit').innerText = summary.total_sakit;
        document.getElementById('stat-absen').innerText = summary.total_siswa - (summary.total_hadir + summary.total_terlambat + summary.total_izin + summary.total_sakit);
        
        const searchQuery = document.getElementById('search-dashboard').value.toLowerCase();
        const tbody = document.getElementById('today-body');
        tbody.innerHTML = '';
        
        allSiswaList.forEach(siswa => {
            if (searchQuery && !siswa.nama.toLowerCase().includes(searchQuery)) return;

            const log = logs.find(l => l.siswa_id === siswa.id);
            const statusClass = log ? log.status.toLowerCase().replace(' ', '-') : 'absen';
            const statusText = log ? log.status : 'Tanpa Keterangan';
            
            // For Izin/Sakit, usually there's no real "check-in/out" time
            const isManualStatus = log && (log.status === 'Izin' || log.status === 'Sakit');
            
            const row = `
                <tr>
                    <td>${siswa.nama}</td>
                    <td>${siswa.kelas}</td>
                    <td>${(log && !isManualStatus) ? log.jam_masuk : '-'}</td>
                    <td>${(log && !isManualStatus) ? (log.jam_pulang || '-') : '-'}</td>
                    <td><span class="status-badge status-${statusClass}">${statusText}</span></td>
                    <td>${log ? (log.keterangan || '-') : '-'}</td>
                    <td>
                        <button class="btn-primary" style="padding: 4px 8px; font-size: 0.7rem;" onclick="showIzinModal(${siswa.id})">Izin/Pulang</button>
                    </td>
                </tr>
            `;
            tbody.innerHTML += row;
        });
    } catch (err) {
        console.error('Error loading dashboard:', err);
    }
}

// --- Izin Modal Handling ---
function showIzinModal(siswaId) {
    document.getElementById('izin-siswa-id').value = siswaId;
    document.getElementById('modal-izin').style.display = 'flex';
}

function closeIzinModal() {
    document.getElementById('modal-izin').style.display = 'none';
    document.getElementById('form-izin').reset();
}

if (document.getElementById('form-izin')) {
    document.getElementById('form-izin').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            siswa_id: document.getElementById('izin-siswa-id').value,
            status: document.getElementById('izin-status').value,
            keterangan: document.getElementById('izin-keterangan').value
        };
        
        try {
            const res = await fetch(`${API_URL}/api/absen/izin`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await res.json();
            if (result.success) {
                closeIzinModal();
                loadDashboard();
            } else {
                alert(result.message);
            }
        } catch (err) {
            console.error('Error saving izin:', err);
        }
    });
}

// --- Student Management Logic ---
let allSiswa = [];
async function loadSiswa() {
    if (!document.getElementById('siswa-body')) return;
    
    try {
        const response = await fetch(`${API_URL}/api/siswa`);
        allSiswa = await response.json();
        renderSiswaTable(allSiswa);
    } catch (err) {
        console.error('Error loading siswa:', err);
    }
}

function renderSiswaTable(data) {
    const tbody = document.getElementById('siswa-body');
    tbody.innerHTML = '';
    
    data.forEach(s => {
        const ids = Array.isArray(s.finger_ids) ? s.finger_ids.join(', ') : (s.finger_id || '-');
        const row = `
            <tr>
                <td>${s.nis}</td>
                <td>${s.nama}</td>
                <td>${s.kelas}</td>
                <td>${ids}</td>
                <td style="display: flex; gap: 5px;">
                    <button class="btn-primary" style="padding: 4px 8px; font-size: 0.7rem;" onclick='showEditModal(${JSON.stringify(s)})'>Edit</button>
                    <button class="btn-danger" style="padding: 4px 8px; font-size: 0.7rem;" onclick="deleteSiswa(${s.id})">Hapus</button>
                </td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

function filterSiswa() {
    const query = document.getElementById('search-siswa').value.toLowerCase();
    const filtered = allSiswa.filter(s => 
        s.nama.toLowerCase().includes(query) || 
        s.nis.toLowerCase().includes(query)
    );
    renderSiswaTable(filtered);
}

const modal = document.getElementById('modal-siswa');
function showAddModal() {
    document.getElementById('modal-title').innerText = 'Tambah Siswa Baru';
    document.getElementById('form-siswa').reset();
    document.getElementById('siswa-id').value = '';
    modal.style.display = 'flex';
}

function showEditModal(siswa) {
    document.getElementById('modal-title').innerText = 'Edit Data Siswa';
    document.getElementById('siswa-id').value = siswa.id;
    document.getElementById('nama').value = siswa.nama;
    document.getElementById('nis').value = siswa.nis;
    document.getElementById('kelas').value = siswa.kelas;
    
    // Clear and populate finger IDs
    document.getElementById('finger_id_1').value = '';
    document.getElementById('finger_id_2').value = '';
    document.getElementById('finger_id_3').value = '';
    
    if (Array.isArray(siswa.finger_ids)) {
        if (siswa.finger_ids[0]) document.getElementById('finger_id_1').value = siswa.finger_ids[0];
        if (siswa.finger_ids[1]) document.getElementById('finger_id_2').value = siswa.finger_ids[1];
        if (siswa.finger_ids[2]) document.getElementById('finger_id_3').value = siswa.finger_ids[2];
    } else if (siswa.finger_id) {
        document.getElementById('finger_id_1').value = siswa.finger_id;
    }
    
    modal.style.display = 'flex';
}

function closeModal() {
    modal.style.display = 'none';
}

if (document.getElementById('form-siswa')) {
    document.getElementById('form-siswa').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const siswaId = document.getElementById('siswa-id').value;
        const finger_ids = [];
        const f1 = document.getElementById('finger_id_1').value;
        const f2 = document.getElementById('finger_id_2').value;
        const f3 = document.getElementById('finger_id_3').value;
        
        if (f1) finger_ids.push(f1);
        if (f2) finger_ids.push(f2);
        if (f3) finger_ids.push(f3);

        const data = {
            nama: document.getElementById('nama').value,
            nis: document.getElementById('nis').value,
            kelas: document.getElementById('kelas').value,
            finger_ids: finger_ids
        };
        
        const url = siswaId ? `${API_URL}/api/siswa/${siswaId}` : `${API_URL}/api/siswa`;
        const method = siswaId ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await res.json();
            if (result.success) {
                closeModal();
                loadSiswa();
            } else {
                alert(result.message);
            }
        } catch (err) {
            console.error('Error saving siswa:', err);
        }
    });
}

async function deleteSiswa(id) {
    if (!confirm('Hapus data siswa ini?')) return;
    try {
        await fetch(`${API_URL}/api/siswa/${id}`, { method: 'DELETE' });
        loadSiswa();
    } catch (err) {
        console.error('Error deleting siswa:', err);
    }
}

// --- Report Logic ---
async function loadLaporan() {
    if (!document.getElementById('laporan-body')) return;
    
    try {
        const response = await fetch(`${API_URL}/api/absen/rekap`);
        const logs = await response.json();
        
        const filterDate = document.getElementById('filter-date').value;
        const filterKelas = document.getElementById('filter-kelas').value;
        
        // Populate Kelas Filter options if empty
        const kelasSelect = document.getElementById('filter-kelas');
        if (kelasSelect.options.length === 1) {
            const classes = [...new Set(logs.map(l => l.siswa.kelas))];
            classes.forEach(k => {
                const opt = document.createElement('option');
                opt.value = k;
                opt.innerText = k;
                kelasSelect.appendChild(opt);
            });
        }

        const filtered = logs.filter(log => {
            const dateMatch = filterDate ? log.tanggal === filterDate : true;
            const kelasMatch = filterKelas === 'all' ? true : log.siswa.kelas === filterKelas;
            return dateMatch && kelasMatch;
        });

        const tbody = document.getElementById('laporan-body');
        tbody.innerHTML = '';
        
        filtered.forEach(log => {
            const row = `
                <tr>
                    <td>${log.tanggal}</td>
                    <td>${log.siswa.nis}</td>
                    <td>${log.siswa.nama}</td>
                    <td>${log.siswa.kelas}</td>
                    <td>${log.jam_masuk}</td>
                    <td>${log.jam_pulang || '-'}</td>
                    <td><span class="status-badge status-${log.status.toLowerCase().replace(' ', '-')}">${log.status}</span></td>
                    <td>${log.keterangan || '-'}</td>
                </tr>
            `;
            tbody.innerHTML += row;
        });
    } catch (err) {
        console.error('Error loading laporan:', err);
    }
}

function exportToCSV() {
    const table = document.getElementById('laporan-table');
    let csv = [];
    for (let i = 0; i < table.rows.length; i++) {
        let row = [], cols = table.rows[i].querySelectorAll('td, th');
        for (let j = 0; j < cols.length; j++) row.push('"' + cols[j].innerText + '"');
        csv.push(row.join(','));
    }
    const csvContent = "data:text/csv;charset=utf-8," + csv.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `laporan_absensi_${new Date().toLocaleDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
}

// --- Initial Load ---
document.addEventListener('DOMContentLoaded', () => {
    loadDashboard();
    loadSiswa();
    loadLaporan();
    
    // Auto-refresh Dashboard every 5 seconds
    if (document.getElementById('today-body')) {
        setInterval(loadDashboard, 5000);
    }
});
