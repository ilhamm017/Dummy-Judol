const AUTH_API_URL = '/api';

function showMessage(message, isError = false) {
    const messageDiv = document.getElementById('message');
    messageDiv.textContent = message;
    messageDiv.style.color = isError ? 'var(--danger)' : 'var(--success)';
    messageDiv.style.padding = '1rem';
    messageDiv.style.borderRadius = 'var(--border-radius-sm)';
    messageDiv.style.background = isError ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)';
}

function showLogin() {
    document.getElementById('loginForm').classList.remove('hidden');
    document.getElementById('registerForm').classList.add('hidden');
}

function showRegister() {
    document.getElementById('registerForm').classList.remove('hidden');
    document.getElementById('loginForm').classList.add('hidden');
}

// Login form handler
document.getElementById('loginFormElement')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const response = await fetch(`${AUTH_API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));

            showMessage('Login berhasil! Mengalihkan...');

            setTimeout(() => {
                if (data.user.role === 'admin') {
                    window.location.href = '/admin.html';
                } else {
                    window.location.href = '/game.html';
                }
            }, 1000);
        } else {
            showMessage(data.message || 'Login gagal', true);
        }
    } catch (error) {
        showMessage('Terjadi kesalahan. Silakan coba lagi.', true);
    }
});

// Register form handler
document.getElementById('registerFormElement')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('registerUsername').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;

    try {
        const response = await fetch(`${AUTH_API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));

            showMessage('Registrasi berhasil! Mengalihkan...');

            setTimeout(() => {
                window.location.href = '/game.html';
            }, 1000);
        } else {
            showMessage(data.message || 'Registrasi gagal', true);
        }
    } catch (error) {
        showMessage('Terjadi kesalahan. Silakan coba lagi.', true);
    }
});

async function checkAuth() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    if (!token || !user.id) {
        return;
    }

    try {
        const response = await fetch(`${AUTH_API_URL}/auth/profile`, {
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            return;
        }

        if (user.role === 'admin') {
            window.location.href = '/admin.html';
        } else {
            window.location.href = '/game.html';
        }
    } catch (error) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    }
}

if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
    checkAuth();
}

// Logout function
function logout() {
    fetch(`${AUTH_API_URL}/auth/logout`, { method: 'POST' }).catch(() => {});
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/index.html';
}

// Get auth headers
function getAuthHeaders(options = {}) {
    const headers = {};
    const token = localStorage.getItem('token');

    if (options.json !== false) {
        headers['Content-Type'] = 'application/json';
    }
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
}
