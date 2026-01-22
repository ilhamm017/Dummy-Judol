const API_URL = '/api';
window.__adminBooted = true;

function setAdminStatus(message, isError = false) {
    const statusEl = document.getElementById('adminStatus');
    if (!statusEl) return;
    statusEl.textContent = message || '';
    statusEl.style.color = isError ? 'var(--danger)' : 'var(--text-muted)';
}

function handleAuthFailure(response) {
    if (response.status === 401 || response.status === 403) {
        alert('Sesi admin berakhir. Silakan login ulang.');
        logout();
        return true;
    }
    return false;
}

// Check admin auth on load
window.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    if (!token || !user.id || user.role !== 'admin') {
        alert('Akses ditolak. Halaman ini hanya untuk admin.');
        window.location.href = '/index.html';
        return;
    }

    document.getElementById('userInfo').textContent = `Admin: ${user.username}`;

    setAdminStatus('Memuat data admin...');
    loadStatistics();
    loadDeposits();
    loadUsers();
    loadSettings();
});

// Tab management
function showTab(tab) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-outline');
    });

    // Show selected tab
    document.getElementById(tab + 'Content').classList.remove('hidden');
    document.getElementById(tab + 'Tab').classList.remove('btn-outline');
    document.getElementById(tab + 'Tab').classList.add('btn-primary');
}

// Make showTab globally accessible
window.showTab = showTab;

function renderStatistics(statistics) {
    document.getElementById('totalUsers').textContent = statistics.totalUsers || 0;
    document.getElementById('totalGames').textContent = statistics.totalGames || 0;
    document.getElementById('pendingDeposits').textContent = statistics.pendingDeposits || 0;

    const totalBetsEl = document.getElementById('totalBets');
    const totalWinningsEl = document.getElementById('totalWinnings');
    const houseProfitEl = document.getElementById('houseProfit');
    if (totalBetsEl) totalBetsEl.textContent = `Rp ${Number(statistics.totalBets || 0).toLocaleString('id-ID')}`;
    if (totalWinningsEl) totalWinningsEl.textContent = `Rp ${Number(statistics.totalWinnings || 0).toLocaleString('id-ID')}`;
    if (houseProfitEl) houseProfitEl.textContent = `Rp ${Number(statistics.houseProfit || 0).toLocaleString('id-ID')}`;
}

// Load statistics
async function loadStatistics() {
    try {
        const response = await fetch(`${API_URL}/admin/statistics`, {
            headers: getAuthHeaders()
        });

        if (handleAuthFailure(response)) return;

        const data = await response.json();

        if (response.ok) {
            renderStatistics(data.statistics);
            setAdminStatus('');
        } else {
            setAdminStatus('Gagal memuat statistik admin.', true);
        }
    } catch (error) {
        console.error('Failed to load statistics:', error);
        setAdminStatus('Tidak bisa terhubung ke server.', true);
    }
}

function renderDeposits(deposits) {
    if (!deposits || deposits.length === 0) {
        document.getElementById('depositsList').innerHTML = '<p class="text-muted text-center">Tidak ada permintaan deposit</p>';
        return;
    }

    const depositsHTML = deposits.map(deposit => {
        const statusBadge = {
            'pending': 'badge-warning',
            'approved': 'badge-success',
            'rejected': 'badge-danger'
        };

        const statusText = {
            'pending': 'MENUNGGU',
            'approved': 'DISETUJUI',
            'rejected': 'DITOLAK'
        };

        return `
            <div class="card" style="margin-bottom: 1rem; ${deposit.status === 'pending' ? 'border: 2px solid var(--warning);' : ''}">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
                    <div>
                        <h3 style="color: var(--accent);">Rp ${parseFloat(deposit.amount).toLocaleString('id-ID')}</h3>
                        <p class="text-muted">User: ${deposit.user?.username || 'Unknown'} (${deposit.user?.email || ''})</p>
                        <p class="text-muted">GoPay: ${deposit.gopayNumber}</p>
                        <p class="text-muted">Tanggal: ${new Date(deposit.createdAt).toLocaleString('id-ID')}</p>
                    </div>
                    <span class="badge ${statusBadge[deposit.status]}">${statusText[deposit.status]}</span>
                </div>
                
                ${deposit.proofImage ? `
                    <div style="margin-bottom: 1rem;">
                        <img src="/uploads/${deposit.proofImage}" 
                             style="max-width: 100%; max-height: 300px; border-radius: var(--border-radius-sm); cursor: pointer;"
                             onclick="window.open('/uploads/${deposit.proofImage}', '_blank')">
                    </div>
                ` : ''}
                
                ${deposit.status === 'pending' ? `
                    <div style="display: flex; gap: 1rem;">
                        <button onclick="approveDeposit(${deposit.id}, ${deposit.userId})" class="btn btn-success" style="flex: 1;">
                            <span>✓ Setujui</span>
                        </button>
                        <button onclick="rejectDeposit(${deposit.id})" class="btn btn-danger" style="flex: 1;">
                            <span>✗ Tolak</span>
                        </button>
                    </div>
                ` : deposit.adminNotes ? `
                    <p style="color: var(--text-secondary); padding: 0.5rem; background: var(--bg-tertiary); border-radius: var(--border-radius-sm);">
                        Catatan: ${deposit.adminNotes}
                    </p>
                ` : ''}
            </div>
        `;
    }).join('');

    document.getElementById('depositsList').innerHTML = depositsHTML;
}

// Load deposits
async function loadDeposits() {
    try {
        const response = await fetch(`${API_URL}/admin/deposits`, {
            headers: getAuthHeaders()
        });

        if (handleAuthFailure(response)) return;

        const data = await response.json();

        if (response.ok && data.deposits) {
            renderDeposits(data.deposits);
        }
    } catch (error) {
        console.error('Failed to load deposits:', error);
        document.getElementById('depositsList').innerHTML = '<p class="text-danger text-center">Gagal memuat deposit</p>';
    }
}

// Approve deposit
async function approveDeposit(depositId, userId) {
    const notes = prompt('Catatan admin (opsional):');

    try {
        const response = await fetch(`${API_URL}/admin/deposits/${depositId}/approve`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ adminNotes: notes })
        });

        const data = await response.json();

        if (response.ok) {
            alert('Deposit disetujui! Saldo user telah ditambahkan.');
            loadDeposits();
            loadStatistics();
        } else {
            alert('Gagal menyetujui deposit: ' + data.message);
        }
    } catch (error) {
        console.error('Approve error:', error);
        alert('Terjadi kesalahan');
    }
}

// Reject deposit
async function rejectDeposit(depositId) {
    const notes = prompt('Alasan penolakan:');
    if (!notes) return;

    try {
        const response = await fetch(`${API_URL}/admin/deposits/${depositId}/reject`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ adminNotes: notes })
        });

        const data = await response.json();

        if (response.ok) {
            alert('Deposit ditolak.');
            loadDeposits();
            loadStatistics();
        } else {
            alert('Gagal menolak deposit: ' + data.message);
        }
    } catch (error) {
        console.error('Reject error:', error);
        alert('Terjadi kesalahan');
    }
}

// Make deposit functions globally accessible
window.approveDeposit = approveDeposit;
window.rejectDeposit = rejectDeposit;

function renderUsers(users) {
    if (!users || users.length === 0) {
        document.getElementById('usersTable').innerHTML = '<tr><td colspan="9" class="text-center text-muted">Belum ada user terdaftar</td></tr>';
        return;
    }

    const formatMode = (value) => {
        const normalized = normalizeTriState(value);
        if (normalized === true) {
            return '<span class="badge badge-success">ORGANIK</span>';
        }
        if (normalized === false) {
            return '<span class="badge badge-warning">CUSTOM</span>';
        }
        return '<span class="text-muted">GLOBAL</span>';
    };

    const usersHTML = users.map(user => `
        <tr>
            <td>${user.username}</td>
            <td>${user.email}</td>
            <td>Rp ${parseFloat(user.balance).toLocaleString('id-ID')}</td>
            <td>${user.rouletteWinRate !== null && user.rouletteWinRate !== undefined ? user.rouletteWinRate + '%' : '<span class="text-muted">Default</span>'}</td>
            <td>${formatMode(user.rouletteUseOrganic)}</td>
            <td>${user.slotWinRate !== null && user.slotWinRate !== undefined ? user.slotWinRate + '%' : '<span class="text-muted">Default</span>'}</td>
            <td>${formatMode(user.slotUseOrganic)}</td>
            <td><span class="badge ${user.role === 'admin' ? 'badge-warning' : 'badge-success'}">${user.role}</span></td>
            <td>
                <button onclick='editUser(${JSON.stringify(user)})' class="btn btn-secondary" style="padding: 0.5rem 1rem;">
                    Edit
                </button>
            </td>
        </tr>
    `).join('');

    document.getElementById('usersTable').innerHTML = usersHTML;
}

// Load users
async function loadUsers() {
    try {
        const response = await fetch(`${API_URL}/admin/users`, {
            headers: getAuthHeaders()
        });

        if (handleAuthFailure(response)) return;

        const data = await response.json();

        if (response.ok && data.users) {
            renderUsers(data.users);
        } else {
            document.getElementById('usersTable').innerHTML = '<tr><td colspan="9" class="text-center text-danger">Gagal memuat data user</td></tr>';
        }
    } catch (error) {
        console.error('Failed to load users:', error);
        document.getElementById('usersTable').innerHTML = '<tr><td colspan="9" class="text-center text-danger">Error: ' + error.message + '</td></tr>';
    }
}

// Edit user modal functions
function editUser(user) {
    document.getElementById('editUserId').value = user.id;
    document.getElementById('editBalance').value = user.balance;
    document.getElementById('editRouletteWinRate').value = user.rouletteWinRate || '';
    document.getElementById('editSlotWinRate').value = user.slotWinRate || '';
    document.getElementById('editRouletteMode').value = mapModeValue(user.rouletteUseOrganic);
    document.getElementById('editSlotMode').value = mapModeValue(user.slotUseOrganic);
    updateEditModeFields();
    document.getElementById('editUserModal').classList.remove('hidden');
}

function closeEditModal() {
    document.getElementById('editUserModal').classList.add('hidden');
}

function closeDepositModal() {
    document.getElementById('depositModal').classList.add('hidden');
}

// Make functions globally accessible
window.editUser = editUser;
window.closeEditModal = closeEditModal;
window.closeDepositModal = closeDepositModal;

// Submit user edit
document.getElementById('editUserForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const userId = document.getElementById('editUserId').value;
    const balance = document.getElementById('editBalance').value;
    const rouletteWinRate = document.getElementById('editRouletteWinRate').value;
    const slotWinRate = document.getElementById('editSlotWinRate').value;
    const rouletteMode = document.getElementById('editRouletteMode').value;
    const slotMode = document.getElementById('editSlotMode').value;

    try {
        const response = await fetch(`${API_URL}/admin/users/${userId}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                balance: parseFloat(balance),
                rouletteWinRate: rouletteMode === 'custom' && rouletteWinRate ? parseFloat(rouletteWinRate) : null,
                slotWinRate: slotMode === 'custom' && slotWinRate ? parseFloat(slotWinRate) : null,
                rouletteUseOrganic: mapModeToOrganic(rouletteMode),
                slotUseOrganic: mapModeToOrganic(slotMode)
            })
        });

        const data = await response.json();

        if (response.ok) {
            alert('User berhasil diupdate!');
            closeEditModal();
            loadUsers();
        } else {
            alert('Gagal update user: ' + data.message);
        }
    } catch (error) {
        console.error('Update error:', error);
        alert('Terjadi kesalahan');
    }
});

function mapModeValue(value) {
    const normalized = normalizeTriState(value);
    if (normalized === true) return 'organic';
    if (normalized === false) return 'custom';
    return 'inherit';
}

function mapModeToOrganic(mode) {
    if (mode === 'organic') return true;
    if (mode === 'custom') return false;
    return null;
}

function normalizeTriState(value) {
    if (value === true || value === 1 || value === 'true') return true;
    if (value === false || value === 0 || value === 'false') return false;
    return null;
}

function updateEditModeFields() {
    const rouletteMode = document.getElementById('editRouletteMode')?.value;
    const slotMode = document.getElementById('editSlotMode')?.value;
    const rouletteGroup = document.getElementById('editRouletteWinRateGroup');
    const slotGroup = document.getElementById('editSlotWinRateGroup');
    const rouletteInput = document.getElementById('editRouletteWinRate');
    const slotInput = document.getElementById('editSlotWinRate');

    const showRouletteCustom = rouletteMode === 'custom';
    const showSlotCustom = slotMode === 'custom';

    rouletteGroup?.classList.toggle('hidden', !showRouletteCustom);
    slotGroup?.classList.toggle('hidden', !showSlotCustom);
    if (rouletteInput) rouletteInput.disabled = !showRouletteCustom;
    if (slotInput) slotInput.disabled = !showSlotCustom;
}

document.getElementById('editRouletteMode')?.addEventListener('change', updateEditModeFields);
document.getElementById('editSlotMode')?.addEventListener('change', updateEditModeFields);

function renderSettings(settings) {
    const rouletteWinRate = settings.roulette_win_rate || settings.default_win_rate || 45;
    const slotWinRate = settings.slot_win_rate || settings.default_win_rate || 45;
    const rouletteOrganic = settings.roulette_use_organic === 'true' || settings.roulette_use_organic === true;
    const slotOrganic = settings.slot_use_organic === 'true' || settings.slot_use_organic === true;

    document.getElementById('rouletteWinRate').value = rouletteWinRate;
    document.getElementById('slotWinRate').value = slotWinRate;
    document.getElementById('houseEdge').value = settings.house_edge || 2.7;
    setOrganicToggle('roulette', rouletteOrganic);
    setOrganicToggle('slot', slotOrganic);

    const rouletteWinRateStat = document.getElementById('rouletteWinRateStat');
    const slotWinRateStat = document.getElementById('slotWinRateStat');
    const houseEdgeStat = document.getElementById('houseEdgeStat');
    if (rouletteWinRateStat) {
        rouletteWinRateStat.textContent = `${rouletteWinRate}%`;
    }
    if (slotWinRateStat) {
        slotWinRateStat.textContent = `${slotWinRate}%`;
    }
    if (houseEdgeStat) {
        houseEdgeStat.textContent = `${settings.house_edge || 2.7}%`;
    }

    updateOrganicInputs();
}

// Load settings
async function loadSettings() {
    try {
        const response = await fetch(`${API_URL}/admin/settings`, {
            headers: getAuthHeaders()
        });

        if (handleAuthFailure(response)) return;

        const data = await response.json();

        if (response.ok && data.settings) {
            renderSettings(data.settings);
        } else {
            setAdminStatus('Gagal memuat pengaturan admin.', true);
        }
    } catch (error) {
        console.error('Failed to load settings:', error);
        setAdminStatus('Tidak bisa terhubung ke server.', true);
    }
}

// Submit settings
document.getElementById('settingsForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const rouletteWinRate = document.getElementById('rouletteWinRate').value;
    const slotWinRate = document.getElementById('slotWinRate').value;
    const rouletteOrganic = document.getElementById('rouletteOrganic').value === 'true';
    const slotOrganic = document.getElementById('slotOrganic').value === 'true';
    const houseEdge = document.getElementById('houseEdge').value;

    try {
        const response = await fetch(`${API_URL}/admin/settings`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                roulette_win_rate: parseFloat(rouletteWinRate),
                slot_win_rate: parseFloat(slotWinRate),
                roulette_use_organic: rouletteOrganic,
                slot_use_organic: slotOrganic,
                house_edge: parseFloat(houseEdge)
            })
        });

        const data = await response.json();

        if (response.ok) {
            alert('Pengaturan berhasil disimpan!');
            loadSettings();
        } else {
            alert('Gagal menyimpan pengaturan: ' + data.message);
        }
    } catch (error) {
        console.error('Settings error:', error);
        alert('Terjadi kesalahan');
    }
});

function updateOrganicInputs() {
    const rouletteWinRate = document.getElementById('rouletteWinRate');
    const slotWinRate = document.getElementById('slotWinRate');

    if (!rouletteWinRate || !slotWinRate) {
        return;
    }

    const rouletteOrganicEnabled = document.getElementById('rouletteOrganic')?.value === 'true';
    const slotOrganicEnabled = document.getElementById('slotOrganic')?.value === 'true';

    rouletteWinRate.disabled = rouletteOrganicEnabled;
    slotWinRate.disabled = slotOrganicEnabled;
}

function setOrganicToggle(gameKey, enabled) {
    const input = document.getElementById(`${gameKey}Organic`);
    const toggle = document.getElementById(`${gameKey}OrganicToggle`);
    if (!input || !toggle) return;

    input.value = enabled ? 'true' : 'false';
    toggle.textContent = `Mode Organik: ${enabled ? 'ON' : 'OFF'}`;
    toggle.classList.toggle('btn-primary', enabled);
    toggle.classList.toggle('btn-outline', !enabled);
}

function toggleOrganic(gameKey) {
    const input = document.getElementById(`${gameKey}Organic`);
    if (!input) return;
    const nextValue = input.value !== 'true';
    setOrganicToggle(gameKey, nextValue);
    updateOrganicInputs();
}

document.getElementById('rouletteOrganicToggle')?.addEventListener('click', () => toggleOrganic('roulette'));
document.getElementById('slotOrganicToggle')?.addEventListener('click', () => toggleOrganic('slot'));
