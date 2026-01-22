const API_URL = '/api';
let isSpinning = false;
let currentBalance = 0;
const MIN_BET = 1000;
const SPIN_DURATION_MS = 6000;
const CENTER_STOP_OFFSET_MS = 250;
const WIN_MEDIUM_THRESHOLD = 50000;
const WIN_HIGH_THRESHOLD = 200000;
const ROULETTE_NUMBERS = Array.from({ length: 37 }, (_, index) => index);
const ROULETTE_COLOR_MAP = {
    0: 'green',
    1: 'red', 2: 'black', 3: 'red', 4: 'black', 5: 'red', 6: 'black',
    7: 'red', 8: 'black', 9: 'red', 10: 'black', 11: 'black', 12: 'red',
    13: 'black', 14: 'red', 15: 'black', 16: 'red', 17: 'black', 18: 'red',
    19: 'red', 20: 'black', 21: 'red', 22: 'black', 23: 'red', 24: 'black',
    25: 'red', 26: 'black', 27: 'red', 28: 'black', 29: 'black', 30: 'red',
    31: 'black', 32: 'red', 33: 'black', 34: 'red', 35: 'black', 36: 'red'
};
let ballRotation = 0;
let ballSpinFrame = null;
let ballSpinLastTime = null;
const rouletteSpinAudio = createAudio('/sfx/Rollete roll.mp3');
let rouletteSpinDurationMs = 0;
const winLowAudio = createAudio('/sfx/win low.mp3');
const winMediumAudio = createAudio('/sfx/win medium.mp3');
const winHighAudio = createAudio('/sfx/win high.mp3');
const winAudios = [winLowAudio, winMediumAudio, winHighAudio];
const GAME_DUMMY_DATA = {
    balance: 250000,
    history: [
        { result: 7, resultColor: 'red', isWin: true, betType: 'number', betAmount: 10000, winAmount: 350000 },
        { result: 22, resultColor: 'black', isWin: false, betType: 'red', betAmount: 5000, winAmount: 0 },
        { result: 0, resultColor: 'green', isWin: false, betType: 'even', betAmount: 8000, winAmount: 0 }
    ]
};
let gameUsingDummy = false;

function createAudio(src, { loop = false } = {}) {
    const audio = new Audio(encodeURI(src));
    audio.loop = loop;
    audio.preload = 'auto';
    return audio;
}

function playAudio(audio) {
    if (!audio) return;
    audio.currentTime = 0;
    audio.play().catch(() => {});
}

function stopAudio(audio) {
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
}

function stopWinSounds() {
    winAudios.forEach(stopAudio);
}

function updateRouletteSpinDuration() {
    if (Number.isFinite(rouletteSpinAudio.duration) && rouletteSpinAudio.duration > 0) {
        rouletteSpinDurationMs = Math.round(rouletteSpinAudio.duration * 1000);
    }
}

function playWinSound(winAmount) {
    const amount = parseFloat(winAmount) || 0;
    if (amount <= 0) return;
    const winAudio = amount >= WIN_HIGH_THRESHOLD
        ? winHighAudio
        : amount >= WIN_MEDIUM_THRESHOLD
            ? winMediumAudio
            : winLowAudio;
    playAudio(winAudio);
}

// Check auth on load
window.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    if (!token || !user.id) {
        window.location.href = '/index.html';
        return;
    }

    // Display user info
    document.getElementById('userInfo').textContent = `Halo, ${user.username}!`;

    // Load initial data
    updateBalance();
    loadGameHistory();
    updateBetOptions();
    updateBetHelp();
    setCenterNumber(0);
    renderWheelNumbers();
    setBallRotation(0);

    const betAmountInput = document.getElementById('betAmount');
    betAmountInput?.addEventListener('input', () => {
        updateBetHelp();
    });
});

rouletteSpinAudio.addEventListener('loadedmetadata', updateRouletteSpinDuration);
rouletteSpinAudio.addEventListener('durationchange', updateRouletteSpinDuration);

// Update balance display
async function updateBalance() {
    try {
        const response = await fetch(`${API_URL}/game/balance`, {
            headers: getAuthHeaders()
        });

        const data = await response.json();
        if (response.ok) {
            gameUsingDummy = false;
            currentBalance = parseFloat(data.balance);
            const balanceText = `Rp ${parseFloat(data.balance).toLocaleString('id-ID')}`;
            document.getElementById('balanceDisplay').textContent = `Saldo: ${balanceText}`;

            // Update in-game balance display if exists
            const balanceInGame = document.getElementById('balanceInGame');
            if (balanceInGame) {
                balanceInGame.textContent = balanceText;
            }

            updateBetHelp();
        }
    } catch (error) {
        console.error('Failed to update balance:', error);
        useDummyGameData('Tidak bisa terhubung ke server. Menampilkan data dummy.');
    }
}

// Update bet value input visibility
function updateBetOptions() {
    const betType = document.getElementById('betType').value;
    const numberSelect = document.getElementById('numberSelect');

    if (betType === 'number') {
        numberSelect.classList.remove('hidden');
    } else {
        numberSelect.classList.add('hidden');
    }
}

function updateBetHelp() {
    const betHint = document.getElementById('betHint');
    const spinButton = document.getElementById('spinButton');
    const betAmount = parseFloat(document.getElementById('betAmount').value || '0');

    if (!betHint || !spinButton) return;

    const depositLink = '<a href="/deposit.html" style="color: var(--accent); text-decoration: none; font-weight: 600;">Topup sekarang</a>';

    if (currentBalance < MIN_BET) {
        betHint.innerHTML = `Saldo belum cukup untuk bermain. ${depositLink}.`;
        spinButton.disabled = true;
        return;
    }

    if (betAmount < MIN_BET) {
        betHint.textContent = `Minimal taruhan Rp ${MIN_BET.toLocaleString('id-ID')}.`;
        spinButton.disabled = true;
        return;
    }

    if (betAmount > currentBalance) {
        betHint.innerHTML = `Saldo tidak cukup untuk jumlah taruhan ini. ${depositLink}.`;
        spinButton.disabled = true;
        return;
    }

    betHint.textContent = '';
    spinButton.disabled = false;
}

function setGameStatus(message, isError = false) {
    const statusEl = document.getElementById('gameStatus');
    if (!statusEl) return;
    statusEl.textContent = message || '';
    statusEl.style.color = isError ? 'var(--danger)' : 'var(--text-muted)';
}

function renderGameHistory(history) {
    if (!history || history.length === 0) {
        document.getElementById('gameHistory').innerHTML = '<p class="text-muted text-center">Belum ada riwayat permainan</p>';
        return;
    }

    const historyHTML = history.map(game => {
        const colorMap = {
            'red': '#c41e3a',
            'black': '#000000',
            'green': '#0f7e0f'
        };

        const resultColor = colorMap[game.resultColor] || '#ffffff';

        return `
            <div class="history-item ${game.isWin ? 'win' : 'lose'}">
                <div class="history-header">
                    <span class="history-result" style="color: ${resultColor}">
                        ${game.result}
                    </span>
                    <span class="badge ${game.isWin ? 'badge-success' : 'badge-danger'}">
                        ${game.isWin ? 'MENANG' : 'KALAH'}
                    </span>
                </div>
                <div class="history-details">
                    <span>Taruhan: ${game.betType} - Rp ${parseFloat(game.betAmount).toLocaleString('id-ID')}</span>
                    <span style="color: ${game.isWin ? 'var(--success)' : 'var(--danger)'}">
                        ${game.isWin ? '+' : '-'}Rp ${parseFloat(game.isWin ? game.winAmount : game.betAmount).toLocaleString('id-ID')}
                    </span>
                </div>
            </div>
        `;
    }).join('');

    document.getElementById('gameHistory').innerHTML = historyHTML;
}

function useDummyGameData(reason) {
    gameUsingDummy = true;
    setGameStatus(reason || 'Mode dummy aktif: data contoh digunakan untuk testing.');
    currentBalance = GAME_DUMMY_DATA.balance;
    const balanceText = `Rp ${parseFloat(currentBalance).toLocaleString('id-ID')}`;
    document.getElementById('balanceDisplay').textContent = `Saldo: ${balanceText}`;
    renderGameHistory(GAME_DUMMY_DATA.history);
    updateBetHelp();
}

function setBallRotation(degrees) {
    const orbit = document.querySelector('.roulette-ball-orbit');
    if (!orbit) return;
    orbit.style.transform = `rotate(${degrees}deg)`;
}

function startBallSpin() {
    stopBallSpinImmediate();
    const speed = 1580;

    const step = (time) => {
        if (ballSpinLastTime === null) {
            ballSpinLastTime = time;
        }
        const delta = (time - ballSpinLastTime) / 1000;
        ballSpinLastTime = time;
        ballRotation = (ballRotation + speed * delta) % 360;
        setBallRotation(ballRotation);
        updateCenterNumberFromBall(ballRotation);
        ballSpinFrame = requestAnimationFrame(step);
    };

    ballSpinLastTime = null;
    ballSpinFrame = requestAnimationFrame(step);
}

function stopBallSpinImmediate(finalNumber) {
    if (ballSpinFrame) {
        cancelAnimationFrame(ballSpinFrame);
    }
    ballSpinFrame = null;
    ballSpinLastTime = null;
    if (finalNumber !== undefined) {
        const targetAngle = getTargetAngle(finalNumber);
        ballRotation = targetAngle;
        setBallRotation(ballRotation);
        setCenterNumber(finalNumber);
        return;
    }
    updateCenterNumberFromBall(ballRotation);
}

function finalizeBallSpin(finalNumber, remainingMs) {
    stopBallSpinImmediate();

    const targetAngle = getTargetAngle(finalNumber);
    const currentBase = ((ballRotation % 360) + 360) % 360;
    let delta = targetAngle - currentBase;
    if (delta < 0) {
        delta += 360;
    }

    const extraSpins = 2 + Math.floor(Math.random() * 2);
    const endRotation = ballRotation + extraSpins * 360 + delta;
    const duration = Math.max(900, remainingMs || SPIN_DURATION_MS);
    const centerStopAt = Math.max(0, duration - CENTER_STOP_OFFSET_MS);
    let centerLocked = false;
    const startRotation = ballRotation;
    const startTime = performance.now();

    const animate = (time) => {
        const elapsed = time - startTime;
        const progress = Math.min(1, elapsed / duration);
        const eased = easeOutCubic(progress);
        const value = startRotation + (endRotation - startRotation) * eased;
        ballRotation = value;
        setBallRotation(value);
        if (!centerLocked) {
            if (elapsed >= centerStopAt) {
                setCenterNumber(finalNumber);
                centerLocked = true;
            } else {
                updateCenterNumberFromBall(value);
            }
        }

        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            ballRotation = endRotation % 360;
            setBallRotation(ballRotation);
            setCenterNumber(finalNumber);
        }
    };

    requestAnimationFrame(animate);
}

function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
}

function getTargetAngle(number) {
    const index = ROULETTE_NUMBERS.indexOf(Number(number));
    if (index === -1) return 0;
    const step = 360 / ROULETTE_NUMBERS.length;
    return index * step;
}

function renderWheelNumbers() {
    const container = document.querySelector('.roulette-numbers');
    if (!container || container.childElementCount > 0) return;

    const radius = 125;
    ROULETTE_NUMBERS.forEach((number, index) => {
        const angle = (index / ROULETTE_NUMBERS.length) * 360;
        const numberEl = document.createElement('div');
        const colorClass = ROULETTE_COLOR_MAP[number] || 'black';
        numberEl.className = `roulette-number ${colorClass}`;
        numberEl.textContent = number;
        numberEl.style.transform = `rotate(${angle}deg) translateY(-${radius}px) rotate(-${angle}deg)`;
        container.appendChild(numberEl);
    });
}

function setCenterNumber(value) {
    const centerNumber = document.getElementById('rouletteCenterNumber');
    if (!centerNumber) return;
    centerNumber.textContent = value;
}

function updateCenterNumberFromBall(angle) {
    const step = 360 / ROULETTE_NUMBERS.length;
    const normalized = ((angle % 360) + 360) % 360;
    const index = Math.round(normalized / step) % ROULETTE_NUMBERS.length;
    setCenterNumber(ROULETTE_NUMBERS[index]);
}

// Spin roulette
async function spinRoulette() {
    if (isSpinning) return;

    const betAmount = document.getElementById('betAmount').value;
    const betType = document.getElementById('betType').value;
    const betValue = betType === 'number' ? document.getElementById('betValue').value : null;

    if (!betAmount || betAmount < MIN_BET) {
        updateBetHelp();
        return;
    }

    if (currentBalance < MIN_BET || parseFloat(betAmount) > currentBalance) {
        updateBetHelp();
        return;
    }

    const spinStart = Date.now();
    if (gameUsingDummy) {
        setGameStatus('Mode dummy aktif: putaran tidak akan mengubah saldo server.');
    }

    isSpinning = true;
    document.getElementById('spinButton').disabled = true;
    document.getElementById('result').innerHTML = '<div class="spinner"></div>';

    // Animate wheel
    const wheel = document.getElementById('rouletteWheel');
    wheel.classList.add('spinning');
    startBallSpin();
    stopWinSounds();
    updateRouletteSpinDuration();
    playAudio(rouletteSpinAudio);

    try {
        const response = await fetch(`${API_URL}/game/spin`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ betAmount, betType, betValue })
        });

        const data = await response.json();

        if (!response.ok) {
            // Handle API errors
            wheel.classList.remove('spinning');
            document.getElementById('result').innerHTML = '';
            stopBallSpinImmediate(0);
            stopAudio(rouletteSpinAudio);

            const hasBalanceInfo = data && (data.balance !== undefined || data.message?.toLowerCase().includes('saldo'));
            if (response.status === 400 && hasBalanceInfo) {
                const betHint = document.getElementById('betHint');
                if (betHint) {
                    betHint.innerHTML = `Saldo tidak cukup untuk taruhan ini. <a href="/deposit.html" style="color: var(--accent); text-decoration: none; font-weight: 600;">Topup sekarang</a>.`;
                }
                alert(`❌ Saldo tidak cukup!\n\nSaldo Anda: Rp ${data.balance || 0}\nTaruhan: Rp ${betAmount}\n\nSilakan isi saldo via menu Deposit.`);
            } else {
                alert(`❌ Error: ${data.message || 'Gagal melakukan taruhan'}`);
            }

            isSpinning = false;
            document.getElementById('spinButton').disabled = false;
            updateBetHelp();
            return;
        }

        const elapsed = Date.now() - spinStart;
        const targetSpinMs = Math.max(SPIN_DURATION_MS, rouletteSpinDurationMs || 0);
        const remaining = Math.max(0, targetSpinMs - elapsed);
        finalizeBallSpin(data.result, remaining);

        // Wait for animation to complete
        setTimeout(() => {
            wheel.classList.remove('spinning');
            stopAudio(rouletteSpinAudio);
            displayResult(data);
            updateBalance();
            loadGameHistory();
            isSpinning = false;
            document.getElementById('spinButton').disabled = false;
        }, remaining);

    } catch (error) {
        console.error('Spin error:', error);
        alert('❌ Terjadi kesalahan koneksi.\n\nSilakan periksa:\n1. Server masih berjalan\n2. Koneksi internet Anda\n3. Coba refresh halaman');
        wheel.classList.remove('spinning');
        document.getElementById('result').innerHTML = '';
        stopBallSpinImmediate(0);
        stopAudio(rouletteSpinAudio);
        isSpinning = false;
        document.getElementById('spinButton').disabled = false;
    }
}

// Display result
function displayResult(data) {
    const resultDiv = document.getElementById('result');

    const colorMap = {
        'red': '#c41e3a',
        'black': '#000000',
        'green': '#0f7e0f'
    };

    const resultColor = colorMap[data.resultColor] || '#ffffff';

    resultDiv.innerHTML = `
        <div class="result-number" style="color: ${resultColor}">
            ${data.result}
        </div>
        <div class="result-message" style="color: ${data.isWin ? 'var(--success)' : 'var(--text-secondary)'}">
            ${data.message}
        </div>
        ${data.isWin ? `
            <div style="font-size: 1.5rem; color: var(--accent); margin-top: 0.5rem;">
                +Rp ${parseFloat(data.winAmount).toLocaleString('id-ID')}
            </div>
        ` : ''}
    `;

    if (data.isWin) {
        playWinSound(data.winAmount);
    }
}

// Load game history
async function loadGameHistory() {
    try {
        const response = await fetch(`${API_URL}/game/history?limit=10`, {
            headers: getAuthHeaders()
        });

        const data = await response.json();

        if (response.ok && data.history) {
            renderGameHistory(data.history);
            setGameStatus('');
            return;
        }

        useDummyGameData('Riwayat gagal dimuat. Menampilkan data dummy.');
    } catch (error) {
        console.error('Failed to load history:', error);
        useDummyGameData('Riwayat gagal dimuat. Menampilkan data dummy.');
    }
}
