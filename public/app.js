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
        const statusFilter = document.getElementById('filter-status-dashboard').value;
        const kelasFilter = document.getElementById('filter-kelas-dashboard').value;
        const angkatanFilter = document.getElementById('filter-angkatan-dashboard').value;

        // Populate Kelas Filter
        const kelasSelect = document.getElementById('filter-kelas-dashboard');
        if (kelasSelect.options.length === 1) {
            const classes = [...new Set(allSiswaList.map(s => s.kelas))].sort();
            classes.forEach(k => {
                const opt = document.createElement('option');
                opt.value = k;
                opt.innerText = k;
                kelasSelect.appendChild(opt);
            });
        }

        // Populate Angkatan Filter
        const angkatanSelect = document.getElementById('filter-angkatan-dashboard');
        if (angkatanSelect && angkatanSelect.options.length === 1) {
            const batches = [...new Set(allSiswaList.map(s => s.angkatan).filter(a => a))].sort();
            batches.forEach(b => {
                const opt = document.createElement('option');
                opt.value = b;
                opt.innerText = b;
                angkatanSelect.appendChild(opt);
            });
        }

        const tbody = document.getElementById('today-body');
        tbody.innerHTML = '';
        
        allSiswaList.forEach(siswa => {
            const log = logs.find(l => l.siswa_id === siswa.id);
            const statusText = log ? log.status : 'Tanpa Keterangan';
            
            // Apply Filters
            if (searchQuery && !siswa.nama.toLowerCase().includes(searchQuery)) return;
            if (statusFilter !== 'all' && statusText !== statusFilter) return;
            if (kelasFilter !== 'all' && siswa.kelas !== kelasFilter) return;
            if (angkatanFilter !== 'all' && (siswa.angkatan || '') !== angkatanFilter) return;

            const statusClass = log ? log.status.toLowerCase().replace(' ', '-') : 'absen';
            const isManualStatus = log && (log.status === 'Izin' || log.status === 'Sakit');
            
            const row = `
                <tr>
                    <td>${siswa.nama}</td>
                    <td>${siswa.kelas}</td>
                    <td>${siswa.angkatan || '-'}</td>
                    <td>${(log && !isManualStatus) ? log.jam_masuk : '-'}</td>
                    <td>${(log && !isManualStatus) ? (log.jam_pulang || '-') : '-'}</td>
                    <td><span class="status-badge status-${statusClass}">${statusText}</span></td>
                    <td>${log ? (log.keterangan || '-') : '-'}</td>
                    <td style="display: flex; gap: 5px;">
                        <button class="btn-primary" style="padding: 4px 8px; font-size: 0.7rem;" onclick="showIzinModal(${siswa.id})">Izin/Pulang</button>
                        ${log ? `<button class="btn-secondary" style="padding: 4px 8px; font-size: 0.7rem;" onclick='showEditAbsenModal(${JSON.stringify(log)})'>Edit</button>` : ''}
                    </td>
                </tr>
            `;
            tbody.innerHTML += row;
        });
    } catch (err) {
        console.error('Error loading dashboard:', err);
    }
}

// --- Attendance Edit Modal ---
function showEditAbsenModal(log) {
    document.getElementById('edit-absen-id').value = log.id;
    document.getElementById('edit-jam-masuk').value = log.jam_masuk;
    document.getElementById('edit-jam-pulang').value = log.jam_pulang || '';
    document.getElementById('edit-status').value = log.status;
    document.getElementById('edit-keterangan').value = log.keterangan || '';
    document.getElementById('modal-edit-absen').style.display = 'flex';
}

function closeEditAbsenModal() {
    document.getElementById('modal-edit-absen').style.display = 'none';
}

if (document.getElementById('form-edit-absen')) {
    document.getElementById('form-edit-absen').addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('edit-absen-id').value;
        const data = {
            jam_masuk: document.getElementById('edit-jam-masuk').value,
            jam_pulang: document.getElementById('edit-jam-pulang').value,
            status: document.getElementById('edit-status').value,
            keterangan: document.getElementById('edit-keterangan').value
        };
        try {
            await fetch(`${API_URL}/api/absen/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            closeEditAbsenModal();
            loadDashboard();
        } catch (err) { console.error(err); }
    });
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
                <td><input type="checkbox" class="siswa-checkbox" value="${s.id}" onclick="updateBatchDeleteBtn()"></td>
                <td>${s.nis}</td>
                <td>${s.nama}</td>
                <td>${s.kelas}</td>
                <td>${s.angkatan || '-'}</td>
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

function toggleSelectAll(master) {
    const checkboxes = document.querySelectorAll('.siswa-checkbox');
    checkboxes.forEach(cb => cb.checked = master.checked);
    updateBatchDeleteBtn();
}

function updateBatchDeleteBtn() {
    const selectedCount = document.querySelectorAll('.siswa-checkbox:checked').length;
    document.getElementById('btn-batch-delete').style.display = selectedCount > 0 ? 'block' : 'none';
}

async function batchDeleteSiswa() {
    const selected = Array.from(document.querySelectorAll('.siswa-checkbox:checked')).map(cb => parseInt(cb.value));
    if (!confirm(`Hapus ${selected.length} siswa terpilih?`)) return;
    
    try {
        await fetch(`${API_URL}/api/siswa/batch-delete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: selected })
        });
        loadSiswa();
        document.getElementById('select-all-siswa').checked = false;
        updateBatchDeleteBtn();
    } catch (err) { console.error(err); }
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
    document.getElementById('angkatan').value = siswa.angkatan || '';
    
    document.getElementById('finger_id_1').value = '';
    document.getElementById('finger_id_2').value = '';
    document.getElementById('finger_id_3').value = '';
    
    if (Array.isArray(siswa.finger_ids)) {
        if (siswa.finger_ids[0]) document.getElementById('finger_id_1').value = siswa.finger_ids[0];
        if (siswa.finger_ids[1]) document.getElementById('finger_id_2').value = siswa.finger_ids[1];
        if (siswa.finger_ids[2]) document.getElementById('finger_id_3').value = siswa.finger_ids[2];
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
        if (document.getElementById('finger_id_1').value) finger_ids.push(document.getElementById('finger_id_1').value);
        if (document.getElementById('finger_id_2').value) finger_ids.push(document.getElementById('finger_id_2').value);
        if (document.getElementById('finger_id_3').value) finger_ids.push(document.getElementById('finger_id_3').value);

        const data = {
            nama: document.getElementById('nama').value,
            nis: document.getElementById('nis').value,
            kelas: document.getElementById('kelas').value,
            angkatan: document.getElementById('angkatan').value,
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
            } else { alert(result.message); }
        } catch (err) { console.error(err); }
    });
}

async function deleteSiswa(id) {
    if (!confirm('Hapus data siswa ini?')) return;
    try {
        await fetch(`${API_URL}/api/siswa/${id}`, { method: 'DELETE' });
        loadSiswa();
    } catch (err) { console.error(err); }
}

// --- Report Logic ---
async function loadLaporan() {
    if (!document.getElementById('laporan-body')) return;
    
    try {
        const responseSiswa = await fetch(`${API_URL}/api/siswa`);
        const allSiswaReport = await responseSiswa.json();

        const responseAbsen = await fetch(`${API_URL}/api/absen/rekap`);
        const logs = await responseAbsen.json();
        
        const filterDate = document.getElementById('filter-date').value;
        const filterStatus = document.getElementById('filter-status-report').value;
        const filterKelas = document.getElementById('filter-kelas').value;
        const filterAngkatan = document.getElementById('filter-angkatan-report').value;
        
        const kelasSelect = document.getElementById('filter-kelas');
        if (kelasSelect.options.length === 1) {
            const classes = [...new Set(allSiswaReport.map(s => s.kelas))].sort();
            classes.forEach(k => {
                const opt = document.createElement('option');
                opt.value = k;
                opt.innerText = k;
                kelasSelect.appendChild(opt);
            });
        }

        const angkatanSelect = document.getElementById('filter-angkatan-report');
        if (angkatanSelect && angkatanSelect.options.length === 1) {
            const batches = [...new Set(allSiswaReport.map(s => s.angkatan).filter(a => a))].sort();
            batches.forEach(b => {
                const opt = document.createElement('option');
                opt.value = b;
                opt.innerText = b;
                angkatanSelect.appendChild(opt);
            });
        }

        const filtered = logs.filter(log => {
            const dateMatch = filterDate ? log.tanggal === filterDate : true;
            const statusMatch = filterStatus === 'all' ? true : log.status === filterStatus;
            const kelasMatch = filterKelas === 'all' ? true : log.siswa.kelas === filterKelas;
            const angkatanMatch = filterAngkatan === 'all' ? true : (log.siswa.angkatan || '') === filterAngkatan;
            return dateMatch && statusMatch && kelasMatch && angkatanMatch;
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
                    <td>${log.siswa.angkatan || '-'}</td>
                    <td>${log.jam_masuk}</td>
                    <td>${log.jam_pulang || '-'}</td>
                    <td><span class="status-badge status-${log.status.toLowerCase().replace(' ', '-')}">${log.status}</span></td>
                    <td>${log.keterangan || '-'}</td>
                </tr>
            `;
            tbody.innerHTML += row;
        });
    } catch (err) { console.error(err); }
}

function exportToCSV() {
    const table = document.getElementById('laporan-table');
    let csv = [];
    for (let i = 0; i < table.rows.length; i++) {
        let row = [], cols = table.rows[i].querySelectorAll('td, th');
        for (let j = 0; j < cols.length - 1; j++) row.push('"' + cols[j].innerText + '"');
        csv.push(row.join(','));
    }
    const csvContent = "data:text/csv;charset=utf-8," + csv.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `laporan_absensi.csv`);
    document.body.appendChild(link);
    link.click();
}

document.addEventListener('DOMContentLoaded', () => {
    loadDashboard();
    loadSiswa();
    loadLaporan();
    if (document.getElementById('today-body')) setInterval(loadDashboard, 5000);
});
