const API_URL = '/api';
const DEPOSIT_DUMMY_DATA = [
    {
        amount: 50000,
        status: 'pending',
        gopayNumber: '0812-1111-2222',
        createdAt: new Date().toISOString(),
        adminNotes: ''
    },
    {
        amount: 200000,
        status: 'approved',
        gopayNumber: '0812-3333-4444',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        adminNotes: 'Sudah masuk'
    }
];
let depositUsingDummy = false;

// Check auth on load
window.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    if (!token || !user.id) {
        window.location.href = '/index.html';
        return;
    }

    document.getElementById('userInfo').textContent = `Halo, ${user.username}!`;
    updateBalance();
    loadDepositHistory();
    loadGopayInfo();
});

function showMessage(message, isError = false) {
    const messageDiv = document.getElementById('message');
    messageDiv.textContent = message;
    messageDiv.style.color = isError ? 'var(--danger)' : 'var(--success)';
    messageDiv.style.padding = '1rem';
    messageDiv.style.borderRadius = 'var(--border-radius-sm)';
    messageDiv.style.background = isError ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)';
}

async function updateBalance() {
    try {
        const response = await fetch(`${API_URL}/game/balance`, {
            headers: getAuthHeaders()
        });

        const data = await response.json();
        if (response.ok) {
            depositUsingDummy = false;
            document.getElementById('balanceDisplay').textContent =
                `Saldo: Rp ${parseFloat(data.balance).toLocaleString('id-ID')}`;
        }
    } catch (error) {
        console.error('Failed to update balance:', error);
        setDepositStatus('Tidak bisa terhubung ke server. Menampilkan data dummy.', true);
    }
}

function loadGopayInfo() {
    // In production, fetch from API
    document.getElementById('gopayNumber').textContent = '0812-3456-7890';
    document.getElementById('gopayName').textContent = 'Admin Roulette';
}

function setDepositStatus(message, isError = false) {
    const statusEl = document.getElementById('depositStatus');
    if (!statusEl) return;
    statusEl.textContent = message || '';
    statusEl.style.color = isError ? 'var(--danger)' : 'var(--text-muted)';
}

// Image preview
document.getElementById('proofImage')?.addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const preview = document.getElementById('imagePreview');
            const img = document.getElementById('previewImg');
            img.src = e.target.result;
            preview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
});

// Submit deposit request
document.getElementById('depositForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const amount = document.getElementById('amount').value;
    const gopayNumber = document.getElementById('gopayNumber').value;
    const proofImage = document.getElementById('proofImage').files[0];

    if (!proofImage) {
        showMessage('Silakan upload bukti transfer', true);
        return;
    }

    const formData = new FormData();
    formData.append('amount', amount);
    formData.append('gopayNumber', gopayNumber);
    formData.append('proofImage', proofImage);

    try {
        const response = await fetch(`${API_URL}/deposit/request`, {
            method: 'POST',
            headers: getAuthHeaders({ json: false }),
            body: formData
        });

        const data = await response.json();

        if (response.ok) {
            showMessage('Permintaan deposit berhasil dikirim! Menunggu verifikasi admin.');
            document.getElementById('depositForm').reset();
            document.getElementById('imagePreview').style.display = 'none';
            loadDepositHistory();
        } else {
            showMessage(data.message || 'Gagal mengirim permintaan deposit', true);
        }
    } catch (error) {
        console.error('Deposit error:', error);
        showMessage('Terjadi kesalahan. Silakan coba lagi.', true);
    }
});

// Load deposit history
async function loadDepositHistory() {
    try {
        const response = await fetch(`${API_URL}/deposit/history`, {
            headers: getAuthHeaders()
        });

        const data = await response.json();

        if (response.ok && data.deposits) {
            renderDepositHistory(data.deposits);
            setDepositStatus('');
            return;
        }

        useDummyDepositHistory('Riwayat gagal dimuat. Menampilkan data dummy.');
    } catch (error) {
        console.error('Failed to load deposit history:', error);
        useDummyDepositHistory('Riwayat gagal dimuat. Menampilkan data dummy.');
    }
}

function renderDepositHistory(deposits) {
    if (!deposits || deposits.length === 0) {
        document.getElementById('depositHistory').innerHTML = '<p class="text-muted text-center">Belum ada riwayat deposit</p>';
        return;
    }

    const historyHTML = deposits.map(deposit => {
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
            <div class="card" style="margin-bottom: 1rem; padding: 1rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                    <span style="font-size: 1.25rem; font-weight: 700; color: var(--accent);">
                        Rp ${parseFloat(deposit.amount).toLocaleString('id-ID')}
                    </span>
                    <span class="badge ${statusBadge[deposit.status]}">
                        ${statusText[deposit.status]}
                    </span>
                </div>
                <div style="font-size: 0.875rem; color: var(--text-secondary);">
                    <p>GoPay: ${deposit.gopayNumber}</p>
                    <p>Tanggal: ${new Date(deposit.createdAt).toLocaleString('id-ID')}</p>
                    ${deposit.adminNotes ? `<p style="color: var(--text-primary); margin-top: 0.5rem;">Catatan Admin: ${deposit.adminNotes}</p>` : ''}
                </div>
            </div>
        `;
    }).join('');

    document.getElementById('depositHistory').innerHTML = historyHTML;
}

function useDummyDepositHistory(reason) {
    if (!depositUsingDummy) {
        depositUsingDummy = true;
        setDepositStatus(reason || 'Mode dummy aktif: data contoh digunakan untuk testing.', true);
    }
    renderDepositHistory(DEPOSIT_DUMMY_DATA);
}
