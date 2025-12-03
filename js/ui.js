// ==================== UI.JS ====================
// Kullanıcı arayüzü yönetimi

// UI elementleri
const elements = {
    menuScreen: null,
    gameUI: null,
    scoreP1: null,
    scoreP2: null,
    message: null,
    pauseScreen: null,
    tutorial: null,
    spinIndicator: null,
    powerMeter: null,
    combo: null
};

// UI'ı başlat
export function initUI() {
    elements.menuScreen = document.getElementById('menu-screen');
    elements.gameUI = document.getElementById('game-ui');
    elements.scoreP1 = document.getElementById('score-p1');
    elements.scoreP2 = document.getElementById('score-p2');
    elements.message = document.getElementById('message');
    elements.pauseScreen = document.getElementById('pause-screen');
    elements.tutorial = document.getElementById('tutorial');
    elements.spinIndicator = document.getElementById('spin-indicator');
    elements.powerMeter = document.getElementById('power-meter');
    elements.combo = document.getElementById('combo');
}

// Menüyü göster/gizle
export function showMenu(show = true) {
    if (elements.menuScreen) {
        if (show) {
            elements.menuScreen.classList.remove('hidden');
        } else {
            elements.menuScreen.classList.add('hidden');
        }
    }
}

// Oyun UI'ını göster/gizle
export function showGameUI(show = true) {
    if (elements.gameUI) {
        if (show) {
            elements.gameUI.classList.add('active');
        } else {
            elements.gameUI.classList.remove('active');
        }
    }
}

// Skoru güncelle
export function updateScore(playerScore, opponentScore) {
    if (elements.scoreP1) elements.scoreP1.textContent = playerScore;
    if (elements.scoreP2) elements.scoreP2.textContent = opponentScore;
}

// Mesaj göster
export function showMessage(text, duration = 0) {
    if (!elements.message) return;
    
    elements.message.innerHTML = text;
    elements.message.style.display = 'block';
    
    if (duration > 0) {
        setTimeout(() => {
            elements.message.style.display = 'none';
        }, duration);
    }
}

// Mesajı gizle
export function hideMessage() {
    if (elements.message) {
        elements.message.style.display = 'none';
    }
}

// Mesaja ek içerik ekle
export function appendToMessage(html) {
    if (elements.message) {
        elements.message.innerHTML += html;
    }
}

// Pause ekranı
export function showPauseScreen(show = true) {
    if (elements.pauseScreen) {
        elements.pauseScreen.style.display = show ? 'flex' : 'none';
    }
}

// Tutorial göster/gizle
export function showTutorial(show = true) {
    if (elements.tutorial) {
        if (show) {
            elements.tutorial.classList.add('active');
        } else {
            elements.tutorial.classList.remove('active');
        }
    }
}

// Combo göster
export function showCombo(count) {
    if (elements.combo && count > 2) {
        elements.combo.textContent = `${count}x COMBO!`;
        elements.combo.style.display = 'block';
        
        setTimeout(() => {
            elements.combo.style.display = 'none';
        }, 1000);
    }
}

// Power meter güncelle
export function updatePowerMeter(power) {
    const fill = document.getElementById('power-fill');
    if (fill) {
        fill.style.height = `${power * 100}%`;
    }
}

// Spin indicator güncelle
export function updateSpinIndicator(angle) {
    const arrow = document.getElementById('spin-arrow');
    if (arrow) {
        arrow.style.transform = `rotate(${angle}deg)`;
    }
}
