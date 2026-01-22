const API_URL = '/api';
const MIN_BET = 1000;
const STOP_DELAYS = [0, 450, 900];
const STOP_EARLY_MS = 500;
const SYMBOLS = ['7', 'BAR', 'CHERRY', 'LEMON', 'ORANGE', 'GRAPE'];
const SYMBOL_EMOJI = {
    '7': '7️⃣',
    BAR: '⬛️',
    CHERRY: '🍒',
    LEMON: '🍋',
    ORANGE: '🍊',
    GRAPE: '🍇'
};
const WIN_MEDIUM_THRESHOLD = 50000;
const WIN_HIGH_THRESHOLD = 200000;
const slotClickAudio = createAudio('/sfx/slot click.mp3');
const slotRollAudio = createAudio('/sfx/slot roll.mp3');
const slotReelAudio = createAudio('/sfx/slot reeell.mp3', { loop: true });
const winLowAudio = createAudio('/sfx/win low.mp3');
const winMediumAudio = createAudio('/sfx/win medium.mp3');
const winHighAudio = createAudio('/sfx/win high.mp3');
const winAudios = [winLowAudio, winMediumAudio, winHighAudio];

let isSpinning = false;
let currentBalance = 0;
let spinIntervals = [];
let manualModeEnabled = false;
let manualResultData = null;
let manualStopIndex = 0;
let manualFinalizeTimer = null;
let manualFinalized = false;
let slotRollDurationMs = 0;

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

function updateSlotRollDuration() {
    if (Number.isFinite(slotRollAudio.duration) && slotRollAudio.duration > 0) {
        slotRollDurationMs = Math.round(slotRollAudio.duration * 1000);
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

function startSlotRollSound() {
    stopAudio(slotRollAudio);
    updateSlotRollDuration();
    playAudio(slotRollAudio);
}

function stopSlotRollSound() {
    stopAudio(slotRollAudio);
}

function startSlotReelSound() {
    stopAudio(slotReelAudio);
    playAudio(slotReelAudio);
}

function stopSlotReelSound() {
    stopAudio(slotReelAudio);
}

function startSlotSpinSound() {
    stopSlotRollSound();
    stopSlotReelSound();
    if (manualModeEnabled) {
        startSlotReelSound();
    } else {
        startSlotRollSound();
    }
}

function stopSlotSpinSound() {
    stopSlotRollSound();
    stopSlotReelSound();
}

window.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    if (!token || !user.id) {
        window.location.href = '/index.html';
        return;
    }

    document.getElementById('userInfo').textContent = `Halo, ${user.username}!`;

    updateBalance();
    loadSlotHistory();
    updateBetHint();

    const betAmountInput = document.getElementById('betAmount');
    betAmountInput?.addEventListener('input', updateBetHint);

    const manualToggle = document.getElementById('manualModeToggle');
    manualToggle?.addEventListener('change', (event) => {
        manualModeEnabled = event.target.checked;
        updateManualControls();
    });
    updateManualControls();
});

slotRollAudio.addEventListener('loadedmetadata', updateSlotRollDuration);
slotRollAudio.addEventListener('durationchange', updateSlotRollDuration);

function updateManualControls() {
    const manualToggle = document.getElementById('manualModeToggle');
    const stopButton = document.getElementById('stopReelButton');
    if (manualToggle) {
        manualToggle.checked = manualModeEnabled;
        manualToggle.disabled = isSpinning;
    }

    if (stopButton) {
        stopButton.classList.toggle('hidden', !manualModeEnabled);
        stopButton.disabled = !manualModeEnabled || !isSpinning || !manualResultData;
    }
}

function clearManualTimers() {
    if (manualFinalizeTimer) {
        clearTimeout(manualFinalizeTimer);
        manualFinalizeTimer = null;
    }
}

function resetManualState() {
    manualResultData = null;
    manualStopIndex = 0;
    manualFinalized = false;
    clearManualTimers();
}

function setSlotStatus(message, isError = false) {
    const statusEl = document.getElementById('slotStatus');
    if (!statusEl) return;
    statusEl.textContent = message || '';
    statusEl.style.color = isError ? 'var(--danger)' : 'var(--text-muted)';
}

async function updateBalance() {
    try {
        const response = await fetch(`${API_URL}/slot/balance`, {
            headers: getAuthHeaders()
        });

        const data = await response.json();
        if (response.ok) {
            currentBalance = parseFloat(data.balance);
            const balanceText = `Rp ${currentBalance.toLocaleString('id-ID')}`;
            document.getElementById('balanceDisplay').textContent = `Saldo: ${balanceText}`;
            updateBetHint();
        }
    } catch (error) {
        console.error('Failed to update balance:', error);
        setSlotStatus('Tidak bisa terhubung ke server.', true);
    }
}

function updateBetHint() {
    const hint = document.getElementById('slotHint');
    const spinButton = document.getElementById('spinButton');
    const betAmount = parseFloat(document.getElementById('betAmount').value || '0');

    if (!hint || !spinButton) return;

    const depositLink = '<a href="/deposit.html" style="color: var(--accent); text-decoration: none; font-weight: 600;">Topup sekarang</a>';

    if (currentBalance < MIN_BET) {
        hint.innerHTML = `Saldo belum cukup untuk bermain. ${depositLink}.`;
        spinButton.disabled = true;
        return;
    }

    if (betAmount < MIN_BET) {
        hint.textContent = `Minimal taruhan Rp ${MIN_BET.toLocaleString('id-ID')}.`;
        spinButton.disabled = true;
        return;
    }

    if (betAmount > currentBalance) {
        hint.innerHTML = `Saldo tidak cukup untuk jumlah taruhan ini. ${depositLink}.`;
        spinButton.disabled = true;
        return;
    }

    hint.textContent = '';
    spinButton.disabled = false;
}

function renderReels(symbols) {
    const reel1 = document.getElementById('reel1');
    const reel2 = document.getElementById('reel2');
    const reel3 = document.getElementById('reel3');

    if (!reel1 || !reel2 || !reel3) return;

    reel1.textContent = formatSymbol(symbols[0]);
    reel2.textContent = formatSymbol(symbols[1]);
    reel3.textContent = formatSymbol(symbols[2]);
}

function startSpinAnimation() {
    const reels = Array.from(document.querySelectorAll('.slot-reel'));
    reels.forEach((reel, index) => {
        reel.classList.add('spinning');
        if (spinIntervals[index]) {
            clearInterval(spinIntervals[index]);
        }
        spinIntervals[index] = setInterval(() => {
            reel.textContent = formatSymbol(SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]);
        }, 90 + index * 25);
    });
}

function stopSpinAnimation(finalSymbols) {
    const reels = Array.from(document.querySelectorAll('.slot-reel'));
    if (reels.length === 0) {
        return Promise.resolve();
    }

    const delays = STOP_DELAYS;

    return new Promise((resolve) => {
        reels.forEach((reel, index) => {
            setTimeout(() => {
                if (spinIntervals[index]) {
                    clearInterval(spinIntervals[index]);
                    spinIntervals[index] = null;
                }
                reel.classList.remove('spinning');
                reel.textContent = formatSymbol(finalSymbols[index]);

                if (index === reels.length - 1) {
                    resolve();
                }
            }, delays[index] || 0);
        });
    });
}

function stopReelAt(index, symbol) {
    const reel = document.getElementById(`reel${index + 1}`);
    if (!reel) return;
    if (spinIntervals[index]) {
        clearInterval(spinIntervals[index]);
        spinIntervals[index] = null;
    }
    reel.classList.remove('spinning');
    reel.textContent = formatSymbol(symbol);
}

function finishSlotSpin(data) {
    stopSlotSpinSound();
    showResult(data);
    updateBalance();
    loadSlotHistory();
    isSpinning = false;
    document.getElementById('spinButton').disabled = false;
    resetManualState();
    updateManualControls();
}

function finalizeManualSpin(data) {
    if (manualFinalized) return;
    manualFinalized = true;
    clearManualTimers();
    manualFinalizeTimer = setTimeout(() => {
        finishSlotSpin(data);
    }, STOP_EARLY_MS);
}

function stopNextReel() {
    if (!manualModeEnabled || !isSpinning || !manualResultData) return;
    if (manualStopIndex >= manualResultData.reels.length) return;

    playAudio(slotClickAudio);
    stopReelAt(manualStopIndex, manualResultData.reels[manualStopIndex]);
    manualStopIndex += 1;
    updateManualControls();

    if (manualStopIndex >= manualResultData.reels.length) {
        finalizeManualSpin(manualResultData);
    }
}

function showResult(data) {
    const resultEl = document.getElementById('slotResult');
    if (!resultEl) return;

    resultEl.innerHTML = `
        <div class="slot-result-center">
            <div class="slot-result-reels">
                ${data.reels.map((symbol) => `<span class="slot-result-badge">${formatSymbol(symbol)}</span>`).join('')}
            </div>
            <div class="result-message" style="color: ${data.isWin ? 'var(--success)' : 'var(--text-secondary)'}">
                ${data.message}
            </div>
            ${data.isWin ? `
                <div class="slot-win-amount" style="font-size: 1.4rem; color: var(--accent);">
                    +Rp ${parseFloat(data.winAmount).toLocaleString('id-ID')}
                </div>
            ` : ''}
        </div>
    `;

    if (data.isWin) {
        playWinSound(data.winAmount);
    }
}

async function spinSlot() {
    if (isSpinning) return;
    playAudio(slotClickAudio);

    const betAmount = parseFloat(document.getElementById('betAmount').value || '0');

    if (!betAmount || betAmount < MIN_BET) {
        updateBetHint();
        return;
    }

    if (currentBalance < MIN_BET || betAmount > currentBalance) {
        updateBetHint();
        return;
    }

    isSpinning = true;
    document.getElementById('spinButton').disabled = true;
    startSpinAnimation();
    stopWinSounds();
    startSlotSpinSound();
    resetManualState();
    updateManualControls();

    const spinStart = Date.now();

    try {
        const response = await fetch(`${API_URL}/slot/spin`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ betAmount })
        });

        const data = await response.json();

        if (!response.ok) {
            await stopSpinAnimation(['-', '-', '-']);
            stopSlotSpinSound();
            if (response.status === 400 && data.message?.toLowerCase().includes('saldo')) {
                const hint = document.getElementById('slotHint');
                if (hint) {
                    hint.innerHTML = 'Saldo tidak cukup untuk taruhan ini. <a href="/deposit.html" style="color: var(--accent); text-decoration: none; font-weight: 600;">Topup sekarang</a>.';
                }
                alert(`❌ Saldo tidak cukup!\n\nSaldo Anda: Rp ${data.balance || 0}\nTaruhan: Rp ${betAmount}`);
            } else {
                alert(`❌ Error: ${data.message || 'Gagal memutar slot'}`);
            }
            isSpinning = false;
            document.getElementById('spinButton').disabled = false;
            resetManualState();
            updateManualControls();
            updateBetHint();
            return;
        }

        const elapsed = Date.now() - spinStart;
        const stopTailMs = STOP_DELAYS[STOP_DELAYS.length - 1] || 0;
        const baseSpinMs = slotRollDurationMs || 0;
        const targetSpinMs = Math.max(2000, baseSpinMs);
        const wait = Math.max(0, targetSpinMs - elapsed - stopTailMs - STOP_EARLY_MS);

        if (manualModeEnabled) {
            manualResultData = data;
            manualStopIndex = 0;
            manualFinalized = false;
            updateManualControls();
            return;
        }

        setTimeout(async () => {
            await stopSpinAnimation(data.reels);
            setTimeout(() => {
                finishSlotSpin(data);
            }, STOP_EARLY_MS);
        }, wait);
    } catch (error) {
        console.error('Slot spin error:', error);
        await stopSpinAnimation(['-', '-', '-']);
        stopSlotSpinSound();
        alert('❌ Terjadi kesalahan koneksi. Silakan coba lagi.');
        isSpinning = false;
        document.getElementById('spinButton').disabled = false;
        resetManualState();
        updateManualControls();
    }
}

async function loadSlotHistory() {
    try {
        const response = await fetch(`${API_URL}/slot/history?limit=10`, {
            headers: getAuthHeaders()
        });

        const data = await response.json();

        if (response.ok && data.history) {
            renderSlotHistory(data.history);
            setSlotStatus('');
            return;
        }

        setSlotStatus('Gagal memuat riwayat slot.', true);
    } catch (error) {
        console.error('Failed to load slot history:', error);
        setSlotStatus('Gagal memuat riwayat slot.', true);
    }
}

function renderSlotHistory(history) {
    if (!history || history.length === 0) {
        document.getElementById('slotHistory').innerHTML = '<p class="text-muted text-center">Belum ada riwayat permainan</p>';
        return;
    }

    const historyHTML = history.map((entry) => `
        <div class="slot-history-item ${entry.isWin ? 'win' : 'lose'}">
            <div class="slot-history-reels">
                ${(entry.reels || []).map((symbol) => `<div class="slot-history-reel">${formatSymbol(symbol)}</div>`).join('')}
            </div>
            <div class="history-details">
                <span>Taruhan: Rp ${parseFloat(entry.betAmount).toLocaleString('id-ID')}</span>
                <span style="color: ${entry.isWin ? 'var(--success)' : 'var(--danger)'}">
                    ${entry.isWin ? '+' : '-'}Rp ${parseFloat(entry.isWin ? entry.winAmount : entry.betAmount).toLocaleString('id-ID')}
                </span>
            </div>
        </div>
    `).join('');

    document.getElementById('slotHistory').innerHTML = historyHTML;
}

function formatSymbol(symbol) {
    return SYMBOL_EMOJI[symbol] || symbol || '-';
}
