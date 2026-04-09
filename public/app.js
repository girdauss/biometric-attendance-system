// Configuration
const API_URL = ''; // Relative path since we're serving from the same server

// --- Navigation & Clock ---
setInterval(() => {
    const timeElement = document.getElementById('current-time');
    if (timeElement) {
        timeElement.innerText = new Date().toLocaleTimeString();
    }
}, 1000);

// --- Dashboard Logic ---
async function loadDashboard() {
    if (!document.getElementById('today-body')) return;
    
    try {
        const response = await fetch(`${API_URL}/api/absen/hari-ini`);
        const { logs, summary } = await response.json();
        
        document.getElementById('stat-total').innerText = summary.total_siswa;
        document.getElementById('stat-hadir').innerText = summary.total_hadir;
        document.getElementById('stat-terlambat').innerText = summary.total_terlambat;
        document.getElementById('stat-absen').innerText = summary.total_siswa - (summary.total_hadir + summary.total_terlambat);
        
        const tbody = document.getElementById('today-body');
        tbody.innerHTML = '';
        
        logs.forEach(log => {
            const row = `
                <tr>
                    <td>${log.siswa.nama}</td>
                    <td>${log.siswa.kelas}</td>
                    <td>${log.jam_masuk}</td>
                    <td><span class="status-badge status-${log.status.toLowerCase()}">${log.status}</span></td>
                </tr>
            `;
            tbody.innerHTML += row;
        });
    } catch (err) {
        console.error('Error loading dashboard:', err);
    }
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
        const row = `
            <tr>
                <td>${s.nis}</td>
                <td>${s.nama}</td>
                <td>${s.kelas}</td>
                <td>${s.finger_id}</td>
                <td>
                    <button class="btn-danger" onclick="deleteSiswa(${s.id})">Hapus</button>
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
    modal.style.display = 'flex';
}
function closeModal() {
    modal.style.display = 'none';
}

if (document.getElementById('form-siswa')) {
    document.getElementById('form-siswa').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            nama: document.getElementById('nama').value,
            nis: document.getElementById('nis').value,
            kelas: document.getElementById('kelas').value,
            finger_id: parseInt(document.getElementById('finger_id').value)
        };
        
        try {
            const res = await fetch(`${API_URL}/api/siswa`, {
                method: 'POST',
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
            console.error('Error adding siswa:', err);
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
                    <td><span class="status-badge status-${log.status.toLowerCase()}">${log.status}</span></td>
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
