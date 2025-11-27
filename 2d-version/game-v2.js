// ==================== PING PONG ONLINE - GAME ENGINE v2.0 ====================
// Gelişmiş fizik, falso sistemi ve online multiplayer desteği

// ==================== GLOBAL VARIABLES ====================
let canvas, ctx;
let gameState = 'menu';
let gameMode = 'online'; // 'online', 'bot', 'practice'
let animationId;

// Room/Connection
let roomCode = '';
let isHost = false;
let socket = null;
let playerId = '';
let opponentConnected = false;
let lastPing = 0;

// ==================== PHYSICS CONSTANTS ====================
const PHYSICS = {
    gravity: 0.001,
    airResistance: 0.9998,      // Çok az direnç = hızlı top
    tableHeight: 0.15,
    netHeight: 0.08,
    bounceFactor: 0.9,
    spinDecay: 0.99,            // Spin uzun sürer
    maxSpin: 0.1,               // Yüksek spin limiti
    ballRadius: 12,
    paddleWidth: 22,
    paddleHeight: 150,
    maxBallSpeed: 40,           // ÇOK HIZLI top
    minBallSpeed: 18,           // Hızlı başlangıç
    magnusStrength: 1.2,        // GÜÇLÜ falso eğrisi
    spinTransfer: 0.008         // Güçlü spin aktarımı
};

// ==================== POWER SHOT SYSTEM ====================
let powerShot = {
    active: false,
    timeLeft: 0,
    cooldown: 0,
    duration: 1500,      // 1.5 saniye aktif
    cooldownTime: 6000   // 6 saniye bekleme
};

// ==================== GAME OBJECTS ====================
let ball = {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    spin: { x: 0, y: 0, z: 0 },
    trail: [],
    lastHitBy: null,
    active: true,
    smashPower: 0
};

let paddles = {
    p1: { x: 50, y: 0, prevY: 0, vy: 0, score: 0, combo: 0, powerCharge: 0 },
    p2: { x: 0, y: 0, prevY: 0, vy: 0, score: 0, combo: 0, powerCharge: 0 }
};

let gameSettings = {
    winScore: 11,
    soundEnabled: true,
    volume: 0.5,
    particlesEnabled: true,
    trailEnabled: true,
    screenShakeEnabled: true
};

// Visual Effects
let particles = [];
let screenShake = { x: 0, y: 0, intensity: 0 };
let flashEffect = { active: false, color: '#fff', alpha: 0 };

// Bot AI
let botDifficulty = 0.75;
let botReactionDelay = 0;
let botTargetY = 0;
let botPredictedSpin = 0;

// ==================== SOUND SYSTEM ====================
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new AudioContext();
    }
}

function playSound(type, volume = 1) {
    if (!gameSettings.soundEnabled || !audioCtx) return;
    
    try {
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        const vol = Math.min(1, volume * gameSettings.volume);
        
        switch(type) {
            case 'hit':
                oscillator.frequency.value = 440 + Math.random() * 80;
                oscillator.type = 'sine';
                gainNode.gain.setValueAtTime(vol * 0.25, audioCtx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.08);
                oscillator.start();
                oscillator.stop(audioCtx.currentTime + 0.08);
                break;
                
            case 'wall':
                oscillator.frequency.value = 220;
                oscillator.type = 'triangle';
                gainNode.gain.setValueAtTime(vol * 0.15, audioCtx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.04);
                oscillator.start();
                oscillator.stop(audioCtx.currentTime + 0.04);
                break;
                
            case 'score':
                oscillator.frequency.value = 523.25;
                oscillator.type = 'sine';
                gainNode.gain.setValueAtTime(vol * 0.35, audioCtx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
                oscillator.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.1);
                oscillator.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.2);
                oscillator.start();
                oscillator.stop(audioCtx.currentTime + 0.4);
                break;
                
            case 'spin':
                oscillator.frequency.value = 880;
                oscillator.type = 'sawtooth';
                gainNode.gain.setValueAtTime(vol * 0.12, audioCtx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);
                oscillator.start();
                oscillator.stop(audioCtx.currentTime + 0.12);
                break;
                
            case 'smash':
                oscillator.frequency.value = 150;
                oscillator.type = 'square';
                gainNode.gain.setValueAtTime(vol * 0.4, audioCtx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
                oscillator.frequency.linearRampToValueAtTime(50, audioCtx.currentTime + 0.2);
                oscillator.start();
                oscillator.stop(audioCtx.currentTime + 0.2);
                break;
                
            case 'countdown':
                oscillator.frequency.value = 600;
                oscillator.type = 'sine';
                gainNode.gain.setValueAtTime(vol * 0.3, audioCtx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
                oscillator.start();
                oscillator.stop(audioCtx.currentTime + 0.15);
                break;
        }
    } catch (e) {
        console.log('Sound error:', e);
    }
}

// ==================== SOCKET CONNECTION ====================
function initSocket() {
    if (typeof io !== 'undefined') {
        socket = io();
        
        socket.on('connect', () => {
            playerId = socket.id;
            console.log('Sunucuya bağlandı:', playerId);
        });
        
        socket.on('opponent-joined', (data) => {
            opponentConnected = true;
            document.getElementById('waiting-text').textContent = 'Rakip bulundu! Oyun başlıyor...';
        });
        
        socket.on('opponent-move', (data) => {
            if (!isHost) {
                paddles.p1.y = data.y * canvas.height;
                paddles.p1.vy = data.vy;
            } else {
                paddles.p2.y = data.y * canvas.height;
                paddles.p2.vy = data.vy;
            }
        });
        
        socket.on('ball-update', (data) => {
            ball.x = data.x * canvas.width;
            ball.y = data.y * canvas.height;
            ball.vx = data.vx * canvas.width / 100;
            ball.vy = data.vy * canvas.height / 100;
            ball.spin = data.spin;
        });
        
        socket.on('countdown', (count) => {
            const countdownEl = document.getElementById('countdown');
            countdownEl.style.display = 'block';
            countdownEl.textContent = count > 0 ? count : 'GO!';
            playSound('countdown');
        });
        
        socket.on('game-start', () => {
            document.getElementById('countdown').style.display = 'none';
            gameState = 'playing';
            gameLoop();
        });
        
        socket.on('score-changed', (data) => {
            paddles.p1.score = data.scores.p1;
            paddles.p2.score = data.scores.p2;
            updateScoreDisplay();
        });
        
        socket.on('game-over', (data) => {
            gameState = 'ended';
            showWinMessage(data.winner);
        });
        
        socket.on('opponent-disconnected', () => {
            showMessage('Rakip bağlantısı koptu!', '#ff4444');
            setTimeout(() => quitGame(), 2000);
        });
        
        setInterval(() => {
            if (socket && socket.connected && gameState === 'playing') {
                const start = Date.now();
                socket.emit('ping-check', start, (timestamp) => {
                    lastPing = Date.now() - timestamp;
                    document.getElementById('ping-display').textContent = `PING: ${lastPing}ms`;
                });
            }
        }, 2000);
    }
}

// ==================== ROOM GENERATION ====================
function generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// ==================== MENU FUNCTIONS ====================
function showLobby() {
    document.getElementById('menu-screen').style.display = 'none';
    document.getElementById('lobby-screen').style.display = 'flex';
    initAudio();
    initSocket();
}

function backToMenu() {
    document.getElementById('lobby-screen').style.display = 'none';
    document.getElementById('menu-screen').style.display = 'flex';
    document.getElementById('create-room-section').style.display = 'block';
    document.getElementById('room-created-section').style.display = 'none';
    
    roomCode = '';
    opponentConnected = false;
    
    if (roomCode) {
        localStorage.removeItem('pingpong_room_' + roomCode);
    }
}

function createRoom() {
    if (socket && socket.connected) {
        socket.emit('create-room', (response) => {
            if (response.success) {
                roomCode = response.roomCode;
                isHost = true;
                showRoomCreated();
            }
        });
    } else {
        roomCode = generateRoomCode();
        isHost = true;
        
        localStorage.setItem('pingpong_room_' + roomCode, JSON.stringify({
            host: 'local_' + Date.now(),
            created: Date.now(),
            status: 'waiting'
        }));
        
        showRoomCreated();
        checkForPlayerLocal();
    }
}

function showRoomCreated() {
    document.getElementById('create-room-section').style.display = 'none';
    document.getElementById('room-created-section').style.display = 'block';
    document.getElementById('room-code').textContent = roomCode;
    document.getElementById('waiting-text').textContent = 'Rakip bekleniyor...';
}

function checkForPlayerLocal() {
    if (!isHost || gameState !== 'menu') return;
    
    const roomData = localStorage.getItem('pingpong_room_' + roomCode);
    if (roomData) {
        const data = JSON.parse(roomData);
        if (data.guest) {
            opponentConnected = true;
            document.getElementById('waiting-text').textContent = 'Rakip bulundu! Oyun başlıyor...';
            setTimeout(() => startOnlineGame(), 1500);
            return;
        }
    }
    setTimeout(checkForPlayerLocal, 500);
}

function joinRoom() {
    const inputCode = document.getElementById('join-room-input').value.toUpperCase().trim();
    
    if (inputCode.length !== 4) {
        showMessage('Lütfen 4 haneli oda kodunu girin!', '#ff4444');
        return;
    }
    
    if (socket && socket.connected) {
        socket.emit('join-room', inputCode, (response) => {
            if (response.success) {
                roomCode = response.roomCode;
                isHost = false;
                opponentConnected = true;
                showJoinSuccess();
            } else {
                showMessage(response.error, '#ff4444');
            }
        });
    } else {
        const roomData = localStorage.getItem('pingpong_room_' + inputCode);
        
        if (!roomData) {
            showMessage('Bu oda bulunamadı!', '#ff4444');
            return;
        }
        
        const data = JSON.parse(roomData);
        if (data.guest) {
            showMessage('Bu oda dolu!', '#ff4444');
            return;
        }
        
        roomCode = inputCode;
        isHost = false;
        data.guest = 'local_' + Date.now();
        localStorage.setItem('pingpong_room_' + roomCode, JSON.stringify(data));
        
        opponentConnected = true;
        showJoinSuccess();
        setTimeout(() => startOnlineGame(), 1500);
    }
}

function showJoinSuccess() {
    document.getElementById('create-room-section').style.display = 'none';
    document.getElementById('room-created-section').style.display = 'block';
    document.getElementById('room-code').textContent = roomCode;
    document.getElementById('waiting-text').textContent = 'Odaya katıldın! Oyun başlıyor...';
}

function copyRoomCode() {
    navigator.clipboard.writeText(roomCode).then(() => {
        const btn = document.querySelector('.copy-btn');
        btn.textContent = '✅ Kopyalandı!';
        setTimeout(() => btn.textContent = '📋 Kodu Kopyala', 2000);
    }).catch(() => {
        const input = document.createElement('input');
        input.value = roomCode;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
    });
}

function showMessage(text, color) {
    const overlay = document.getElementById('message-overlay');
    overlay.innerHTML = `<div style="color: ${color}; font-size: 1.5rem;">${text}</div>`;
    overlay.style.display = 'block';
    setTimeout(() => overlay.style.display = 'none', 2000);
}

// ==================== GAME START FUNCTIONS ====================
function startOnlineGame() {
    gameMode = 'online';
    
    if (isHost) {
        document.getElementById('p1-name').textContent = 'SEN';
        document.getElementById('p2-name').textContent = 'RAKİP';
    } else {
        document.getElementById('p1-name').textContent = 'RAKİP';
        document.getElementById('p2-name').textContent = 'SEN';
    }
    
    document.getElementById('ping-display').style.display = 'block';
    startGame();
}

function startBotGame() {
    gameMode = 'bot';
    isHost = true;
    document.getElementById('p1-name').textContent = 'SEN';
    document.getElementById('p2-name').textContent = 'BOT';
    document.getElementById('ping-display').style.display = 'none';
    initAudio();
    startGame();
}

function startPractice() {
    gameMode = 'practice';
    isHost = true;
    document.getElementById('p1-name').textContent = 'SEN';
    document.getElementById('p2-name').textContent = 'DUVAR';
    document.getElementById('ping-display').style.display = 'none';
    initAudio();
    startGame();
}

function startGame() {
    document.getElementById('menu-screen').style.display = 'none';
    document.getElementById('lobby-screen').style.display = 'none';
    document.getElementById('game-screen').style.display = 'block';
    
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');
    resizeCanvas();
    
    resetGame();
    
    window.addEventListener('resize', resizeCanvas);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleKeyDown);
    
    gameState = 'countdown';
    startCountdown();
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    paddles.p1.x = 60;
    paddles.p2.x = canvas.width - 60;
}

function resetGame() {
    paddles.p1.y = canvas.height / 2;
    paddles.p2.y = canvas.height / 2;
    paddles.p1.score = 0;
    paddles.p2.score = 0;
    paddles.p1.combo = 0;
    paddles.p2.combo = 0;
    
    resetBall();
    updateScoreDisplay();
}

function resetBall(server = 'p1') {
    ball.x = canvas.width / 2;
    ball.y = canvas.height / 2;
    
    const direction = server === 'p1' ? 1 : -1;
    const speed = PHYSICS.minBallSpeed;  // Hızlı başlangıç
    const angle = (Math.random() - 0.5) * Math.PI / 6;
    
    ball.vx = speed * direction * Math.cos(angle);
    ball.vy = speed * Math.sin(angle);
    
    // Spin sıfırla - yeni servis yeni falso
    ball.spin = { x: 0, y: 0, z: 0 };
    ball.trail = [];
    ball.lastHitBy = null;
    ball.active = true;
    ball.smashPower = 0;
}

function startCountdown() {
    let count = 3;
    const countdownEl = document.getElementById('countdown');
    countdownEl.style.display = 'block';
    
    const countdown = setInterval(() => {
        if (count > 0) {
            countdownEl.textContent = count;
            countdownEl.style.animation = 'none';
            countdownEl.offsetHeight;
            countdownEl.style.animation = 'countdownPop 0.5s ease';
            playSound('countdown');
            count--;
        } else {
            countdownEl.textContent = 'GO!';
            countdownEl.style.color = '#00ff88';
            playSound('score');
            
            setTimeout(() => {
                countdownEl.style.display = 'none';
                countdownEl.style.color = '#00f5ff';
                gameState = 'playing';
                gameLoop();
            }, 600);
            
            clearInterval(countdown);
        }
    }, 800);
}

// ==================== INPUT HANDLING ====================
let mouseHoldTime = 0;
let isMouseDown = false;

function handleMouseMove(e) {
    if (gameState !== 'playing') return;
    
    const rect = canvas.getBoundingClientRect();
    const mouseY = e.clientY - rect.top;
    
    updatePaddlePosition(mouseY);
}

function handleTouchMove(e) {
    e.preventDefault();
    if (gameState !== 'playing') return;
    
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const touchY = touch.clientY - rect.top;
    
    updatePaddlePosition(touchY);
}

function updatePaddlePosition(targetY) {
    const paddle = isHost ? paddles.p1 : paddles.p2;
    
    paddle.prevY = paddle.y;
    paddle.y = Math.max(
        PHYSICS.paddleHeight / 2, 
        Math.min(canvas.height - PHYSICS.paddleHeight / 2, targetY)
    );
    paddle.vy = paddle.y - paddle.prevY;
    
    if (gameMode === 'online' && socket) {
        socket.emit('paddle-move', {
            roomCode: roomCode,
            y: paddle.y / canvas.height,
            vy: paddle.vy
        });
    }
}

function handleClick(e) {
    // Click artık bir şey yapmıyor
}

function handleKeyDown(e) {
    switch(e.key) {
        case 'Escape':
            togglePause();
            break;
        case 'm':
        case 'M':
            gameSettings.soundEnabled = !gameSettings.soundEnabled;
            break;
        case ' ':
            e.preventDefault();
            if (gameState === 'playing') {
                activatePowerShot();
            }
            break;
    }
}

// ==================== POWER SHOT FUNCTIONS ====================
function activatePowerShot() {
    // Cooldown kontrolü
    if (powerShot.cooldown > 0) {
        // Henüz hazır değil
        return;
    }
    
    // Zaten aktifse tekrar aktif etme
    if (powerShot.active) {
        return;
    }
    
    // Power shot aktif et
    powerShot.active = true;
    powerShot.timeLeft = powerShot.duration;
    
    // Görsel efekt
    playSound('smash');
    flashEffect = { active: true, color: '#ffff00', alpha: 0.3 };
    
    console.log('⚡ POWER SHOT AKTİF! 1.5 saniye');
}

function updatePowerShot(deltaTime) {
    // Aktifse süreyi azalt
    if (powerShot.active) {
        powerShot.timeLeft -= deltaTime;
        if (powerShot.timeLeft <= 0) {
            powerShot.active = false;
            powerShot.cooldown = powerShot.cooldownTime;
            console.log('🔄 Power shot bitti, 6 saniye bekleme...');
        }
    }
    
    // Cooldown'ı azalt
    if (powerShot.cooldown > 0) {
        powerShot.cooldown -= deltaTime;
        if (powerShot.cooldown <= 0) {
            powerShot.cooldown = 0;
            console.log('✅ Power shot hazır!');
        }
    }
}

function togglePause() {
    if (gameState === 'playing') {
        gameState = 'paused';
        document.getElementById('pause-menu').style.display = 'flex';
    } else if (gameState === 'paused') {
        resumeGame();
    }
}

function resumeGame() {
    gameState = 'playing';
    document.getElementById('pause-menu').style.display = 'none';
    gameLoop();
}

function quitGame() {
    gameState = 'menu';
    document.getElementById('pause-menu').style.display = 'none';
    document.getElementById('game-screen').style.display = 'none';
    document.getElementById('message-overlay').style.display = 'none';
    document.getElementById('menu-screen').style.display = 'flex';
    
    if (animationId) {
        cancelAnimationFrame(animationId);
    }
    
    if (roomCode) {
        localStorage.removeItem('pingpong_room_' + roomCode);
    }
    
    particles = [];
}

// ==================== GAME LOOP ====================
let lastTime = performance.now();

function gameLoop() {
    if (gameState !== 'playing') return;
    
    const currentTime = performance.now();
    const deltaTime = currentTime - lastTime;
    lastTime = currentTime;
    
    update(deltaTime);
    render();
    
    animationId = requestAnimationFrame(gameLoop);
}

function update(deltaTime = 16) {
    // Power shot sistemini güncelle
    updatePowerShot(deltaTime);
    
    if (gameMode === 'bot') {
        updateBot();
    } else if (gameMode === 'practice') {
        const targetY = ball.y + ball.vy * 5;
        paddles.p2.prevY = paddles.p2.y;
        paddles.p2.y += (targetY - paddles.p2.y) * 0.15;
        paddles.p2.y = Math.max(PHYSICS.paddleHeight / 2, Math.min(canvas.height - PHYSICS.paddleHeight / 2, paddles.p2.y));
        paddles.p2.vy = paddles.p2.y - paddles.p2.prevY;
    }
    
    updateBall();
    updateParticles();
    updateEffects();
}

function updateBall() {
    if (!ball.active) return;
    
    // Trail
    if (gameSettings.trailEnabled) {
        ball.trail.push({ 
            x: ball.x, 
            y: ball.y, 
            alpha: 1,
            spin: { ...ball.spin }
        });
        if (ball.trail.length > 20) ball.trail.shift();
        ball.trail.forEach(t => t.alpha *= 0.88);
    }
    
    // ==================== SPIN PHYSICS (Magnus Effect) ====================
    // Falso etkisi - spin yönüne göre top eğrilir
    const magnusForceX = ball.spin.y * PHYSICS.magnusStrength;
    const magnusForceY = ball.spin.x * PHYSICS.magnusStrength;
    
    // Yatay hızın yönü korunmalı (geri dönme önleme)
    const originalDirection = Math.sign(ball.vx);
    
    ball.vx += magnusForceX;
    ball.vy += magnusForceY;
    
    // Top asla geri dönmemeli
    if (Math.sign(ball.vx) !== originalDirection && originalDirection !== 0) {
        ball.vx = originalDirection * Math.abs(ball.vx);
    }
    
    ball.x += ball.vx;
    ball.y += ball.vy;
    
    // Hava direnci
    ball.vx *= PHYSICS.airResistance;
    ball.vy *= PHYSICS.airResistance;
    
    // Havada spin yavaşça azalır
    ball.spin.x *= PHYSICS.spinDecay;
    ball.spin.y *= PHYSICS.spinDecay;
    ball.spin.z *= PHYSICS.spinDecay;
    
    // ==================== DUVAR ÇARPIŞMASI - FALSO BİTER ====================
    if (ball.y - PHYSICS.ballRadius < 0) {
        ball.y = PHYSICS.ballRadius;
        ball.vy *= -PHYSICS.bounceFactor;
        // DUVARA ÇARPINCA FALSO BİTER
        ball.spin.x = 0;
        ball.spin.y = 0;
        ball.spin.z = 0;
        playSound('wall');
        createParticles(ball.x, ball.y, '#00f5ff', 10);
    }
    
    if (ball.y + PHYSICS.ballRadius > canvas.height) {
        ball.y = canvas.height - PHYSICS.ballRadius;
        ball.vy *= -PHYSICS.bounceFactor;
        // DUVARA ÇARPINCA FALSO BİTER
        ball.spin.x = 0;
        ball.spin.y = 0;
        ball.spin.z = 0;
        playSound('wall');
        createParticles(ball.x, ball.y, '#00f5ff', 10);
    }
    
    // ==================== RAKET ÇARPIŞMASI ====================
    if (checkPaddleCollision(paddles.p1, -1)) {
        handlePaddleHit('p1');
    }
    
    if (checkPaddleCollision(paddles.p2, 1)) {
        handlePaddleHit('p2');
    }
    
    // ==================== SKOR ====================
    if (ball.x < -PHYSICS.ballRadius * 2) {
        scorePoint('p2');
    }
    
    if (ball.x > canvas.width + PHYSICS.ballRadius * 2) {
        scorePoint('p1');
    }
}

function checkPaddleCollision(paddle, direction) {
    const paddleLeft = paddle.x - PHYSICS.paddleWidth / 2;
    const paddleRight = paddle.x + PHYSICS.paddleWidth / 2;
    const paddleTop = paddle.y - PHYSICS.paddleHeight / 2;
    const paddleBottom = paddle.y + PHYSICS.paddleHeight / 2;
    
    const ballLeft = ball.x - PHYSICS.ballRadius;
    const ballRight = ball.x + PHYSICS.ballRadius;
    const ballTop = ball.y - PHYSICS.ballRadius;
    const ballBottom = ball.y + PHYSICS.ballRadius;
    
    if (ballRight > paddleLeft && ballLeft < paddleRight &&
        ballBottom > paddleTop && ballTop < paddleBottom) {
        if ((direction === -1 && ball.vx < 0) || (direction === 1 && ball.vx > 0)) {
            return true;
        }
    }
    return false;
}

function handlePaddleHit(player) {
    const paddle = paddles[player];
    const isP1 = player === 'p1';
    
    ball.x = isP1 ? 
        paddle.x + PHYSICS.paddleWidth / 2 + PHYSICS.ballRadius + 1 : 
        paddle.x - PHYSICS.paddleWidth / 2 - PHYSICS.ballRadius - 1;
    
    const hitPosition = (ball.y - paddle.y) / (PHYSICS.paddleHeight / 2);
    const clampedHitPos = Math.max(-1, Math.min(1, hitPosition));
    
    const paddleSpeed = paddle.vy;
    const absSpeed = Math.abs(paddleSpeed);
    
    // ==================== FALSO (SPIN) SİSTEMİ ====================
    // Ne kadar hızlı çekersen o kadar falso!
    // Yukarı çekiş = topspin (top aşağı eğrilir)
    // Aşağı çekiş = backspin (top yukarı eğrilir)
    
    // Paddle hızına göre spin hesapla - HIZLI ÇEKİŞ = GÜÇLÜ FALSO
    const spinPower = paddleSpeed * PHYSICS.spinTransfer;
    
    // Çekiş hızına göre üstel artış (hızlı çekiş = çok daha fazla spin)
    let spinMultiplier = 1;
    if (absSpeed > 3) spinMultiplier = 1.5;
    if (absSpeed > 6) spinMultiplier = 2.5;
    if (absSpeed > 10) spinMultiplier = 4.0;
    if (absSpeed > 15) spinMultiplier = 6.0;  // Çok hızlı çekiş = maksimum falso
    
    let newSpinX = spinPower * spinMultiplier;
    let newSpinY = clampedHitPos * absSpeed * 0.003 * spinMultiplier * (isP1 ? 1 : -1);
    
    // Spin efekti göster
    if (absSpeed > 5) {
        playSound('spin');
        const spinColor = paddleSpeed > 0 ? '#ff6600' : '#00ff66';
        createSpinParticles(ball.x, ball.y, spinColor, Math.min(25, absSpeed * 2));
    }
    
    // Spin uygula (limitli)
    ball.spin.x = Math.max(-PHYSICS.maxSpin, Math.min(PHYSICS.maxSpin, newSpinX));
    ball.spin.y = Math.max(-PHYSICS.maxSpin, Math.min(PHYSICS.maxSpin, newSpinY));
    
    // ==================== HIZ HESAPLAMA ====================
    ball.vx *= -1;
    
    // Hız artışı
    const speedBoost = 1.08 + absSpeed * 0.012;
    ball.vx *= speedBoost;
    
    // Dikey yön - raket hareketine göre
    ball.vy += clampedHitPos * 5;
    ball.vy += paddleSpeed * 0.4;
    
    // ==================== POWER SHOT ====================
    // Space'e basıldıysa ve aktifse güçlü vuruş
    if (powerShot.active) {
        ball.vx *= 1.6;  // %60 daha hızlı
        ball.vy *= 1.3;
        
        playSound('smash');
        createParticles(ball.x, ball.y, '#ffff00', 35);
        createParticles(ball.x, ball.y, '#ff0000', 20);
        screenShake.intensity = 15;
        flashEffect = { active: true, color: '#ffff00', alpha: 0.5 };
    }
    
    const currentSpeed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
    if (currentSpeed > PHYSICS.maxBallSpeed) {
        const scale = PHYSICS.maxBallSpeed / currentSpeed;
        ball.vx *= scale;
        ball.vy *= scale;
    }
    if (currentSpeed < PHYSICS.minBallSpeed) {
        const scale = PHYSICS.minBallSpeed / currentSpeed;
        ball.vx *= scale;
        ball.vy *= scale;
    }
    
    // Top her zaman doğru yöne gitmeli
    if (isP1 && ball.vx < 0) ball.vx = Math.abs(ball.vx);
    if (!isP1 && ball.vx > 0) ball.vx = -Math.abs(ball.vx);
    
    paddle.combo++;
    const otherPaddle = isP1 ? paddles.p2 : paddles.p1;
    otherPaddle.combo = 0;
    
    ball.lastHitBy = player;
    
    playSound('hit');
    createParticles(ball.x, ball.y, isP1 ? '#00f5ff' : '#ff00ff', 12);
    screenShake.intensity = 3 + absSpeed * 0.3;
    
    if (gameMode === 'online' && socket) {
        socket.emit('ball-hit', {
            roomCode: roomCode,
            ballState: {
                x: ball.x / canvas.width,
                y: ball.y / canvas.height,
                vx: ball.vx * 100 / canvas.width,
                vy: ball.vy * 100 / canvas.height,
                spin: ball.spin
            }
        });
    }
}

function scorePoint(scorer) {
    paddles[scorer].score++;
    playSound('score');
    updateScoreDisplay();
    
    const side = scorer === 'p1' ? canvas.width : 0;
    createParticles(side, ball.y, scorer === 'p1' ? '#00f5ff' : '#ff00ff', 30);
    screenShake.intensity = 15;
    flashEffect = { active: true, color: scorer === 'p1' ? '#00f5ff' : '#ff00ff', alpha: 0.4 };
    
    if (checkWin(scorer)) return;
    
    setTimeout(() => {
        resetBall(scorer === 'p1' ? 'p1' : 'p2');
    }, 1000);
    
    if (gameMode === 'online' && socket) {
        socket.emit('score-update', {
            roomCode: roomCode,
            scorer: scorer
        });
    }
}

// ==================== BOT AI ====================
function updateBot() {
    botReactionDelay--;
    
    if (botReactionDelay <= 0) {
        if (ball.vx > 0) {
            const timeToReach = Math.abs((paddles.p2.x - ball.x) / ball.vx);
            
            let predictedY = ball.y + ball.vy * timeToReach;
            predictedY += ball.spin.x * timeToReach * 80;
            
            let bounces = 0;
            while ((predictedY < 0 || predictedY > canvas.height) && bounces < 5) {
                if (predictedY < 0) predictedY = -predictedY;
                if (predictedY > canvas.height) predictedY = 2 * canvas.height - predictedY;
                bounces++;
            }
            
            const skillError = (1 - botDifficulty) * 80;
            const randomError = (Math.random() - 0.5) * skillError;
            
            botTargetY = predictedY + randomError;
            botPredictedSpin = ball.spin.x;
        } else {
            botTargetY = canvas.height / 2 + (Math.random() - 0.5) * 100;
        }
        
        botReactionDelay = Math.floor(5 + (1 - botDifficulty) * 15);
    }
    
    const maxSpeed = 6 + botDifficulty * 6;
    const diff = botTargetY - paddles.p2.y;
    
    paddles.p2.prevY = paddles.p2.y;
    
    const moveSpeed = Math.min(Math.abs(diff), maxSpeed);
    
    if (Math.abs(diff) > 5) {
        const direction = Math.sign(diff);
        
        if (botDifficulty > 0.6 && ball.vx > 0 && Math.abs(ball.x - paddles.p2.x) < 200) {
            paddles.p2.y += direction * (moveSpeed + 3);
        } else {
            paddles.p2.y += direction * moveSpeed;
        }
    }
    
    paddles.p2.vy = paddles.p2.y - paddles.p2.prevY;
    
    paddles.p2.y = Math.max(
        PHYSICS.paddleHeight / 2, 
        Math.min(canvas.height - PHYSICS.paddleHeight / 2, paddles.p2.y)
    );
}

// ==================== PARTICLES ====================
function createParticles(x, y, color, count) {
    if (!gameSettings.particlesEnabled) return;
    
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 8 + 2;
        
        particles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 1,
            color: color,
            size: Math.random() * 6 + 2,
            type: 'normal'
        });
    }
}

function createSpinParticles(x, y, color, count = 10) {
    if (!gameSettings.particlesEnabled) return;
    
    for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        particles.push({
            x: x + Math.cos(angle) * 15,
            y: y + Math.sin(angle) * 15,
            vx: Math.cos(angle) * 4,
            vy: Math.sin(angle) * 4,
            life: 1,
            color: color,
            size: 5,
            type: 'spin',
            angle: angle
        });
    }
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.96;
        p.vy *= 0.96;
        p.life -= 0.025;
        
        if (p.type === 'spin') {
            p.angle += 0.1;
        }
        
        if (p.life <= 0) {
            particles.splice(i, 1);
        }
    }
}

function updateEffects() {
    if (screenShake.intensity > 0.1) {
        screenShake.x = (Math.random() - 0.5) * screenShake.intensity;
        screenShake.y = (Math.random() - 0.5) * screenShake.intensity;
        screenShake.intensity *= 0.92;
    } else {
        screenShake.x = 0;
        screenShake.y = 0;
        screenShake.intensity = 0;
    }
    
    if (flashEffect.active) {
        flashEffect.alpha *= 0.9;
        if (flashEffect.alpha < 0.01) {
            flashEffect.active = false;
        }
    }
}

// ==================== RENDER ====================
function render() {
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.save();
    
    if (gameSettings.screenShakeEnabled) {
        ctx.translate(screenShake.x, screenShake.y);
    }
    
    drawBackground();
    drawCenterLine();
    drawBallTrail();
    drawPaddle(paddles.p1, '#00f5ff', 'left');
    drawPaddle(paddles.p2, '#ff00ff', 'right');
    drawBall();
    drawParticles();
    drawSpinUI();
    drawPowerShotUI();
    
    ctx.restore();
    
    if (flashEffect.active) {
        ctx.fillStyle = flashEffect.color;
        ctx.globalAlpha = flashEffect.alpha;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 1;
    }
}

// ==================== POWER SHOT UI ====================
function drawPowerShotUI() {
    const barWidth = 200;
    const barHeight = 20;
    const x = canvas.width / 2 - barWidth / 2;
    const y = canvas.height - 50;
    
    // Arkaplan
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(x - 5, y - 5, barWidth + 10, barHeight + 10);
    
    // Bar çerçeve
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, barWidth, barHeight);
    
    if (powerShot.active) {
        // Aktif - sarı bar, azalıyor
        const fillWidth = (powerShot.timeLeft / powerShot.duration) * barWidth;
        
        // Parlayan efekt
        ctx.shadowColor = '#ffff00';
        ctx.shadowBlur = 20;
        
        ctx.fillStyle = '#ffff00';
        ctx.fillRect(x, y, fillWidth, barHeight);
        
        ctx.shadowBlur = 0;
        
        // Metin
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('⚡ POWER SHOT AKTİF! ⚡', canvas.width / 2, y - 10);
        
    } else if (powerShot.cooldown > 0) {
        // Cooldown - kırmızı bar, doluyor
        const fillWidth = (1 - powerShot.cooldown / powerShot.cooldownTime) * barWidth;
        
        ctx.fillStyle = '#ff4444';
        ctx.fillRect(x, y, fillWidth, barHeight);
        
        // Metin
        ctx.fillStyle = '#ff4444';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        const secondsLeft = Math.ceil(powerShot.cooldown / 1000);
        ctx.fillText(`Bekleniyor... ${secondsLeft}s`, canvas.width / 2, y - 10);
        
    } else {
        // Hazır - yeşil bar
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(x, y, barWidth, barHeight);
        
        // Metin
        ctx.fillStyle = '#00ff00';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('🚀 [SPACE] - GÜÇLÜ VURUŞ HAZIR!', canvas.width / 2, y - 10);
    }
}

function drawBackground() {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
    ctx.lineWidth = 1;
    
    const gridSize = 60;
    for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
    
    const edgeGradientL = ctx.createLinearGradient(0, 0, 100, 0);
    edgeGradientL.addColorStop(0, 'rgba(0, 245, 255, 0.1)');
    edgeGradientL.addColorStop(1, 'transparent');
    ctx.fillStyle = edgeGradientL;
    ctx.fillRect(0, 0, 100, canvas.height);
    
    const edgeGradientR = ctx.createLinearGradient(canvas.width, 0, canvas.width - 100, 0);
    edgeGradientR.addColorStop(0, 'rgba(255, 0, 255, 0.1)');
    edgeGradientR.addColorStop(1, 'transparent');
    ctx.fillStyle = edgeGradientR;
    ctx.fillRect(canvas.width - 100, 0, 100, canvas.height);
}

function drawCenterLine() {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 4;
    ctx.setLineDash([25, 20]);
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();
    ctx.setLineDash([]);
}

function drawPaddle(paddle, color, side) {
    const x = paddle.x;
    const y = paddle.y;
    const width = PHYSICS.paddleWidth;
    const height = PHYSICS.paddleHeight;
    
    const glowSize = 80 + Math.abs(paddle.vy) * 3;
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, glowSize);
    gradient.addColorStop(0, color + '30');
    gradient.addColorStop(0.5, color + '10');
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.fillRect(x - glowSize, y - glowSize, glowSize * 2, glowSize * 2);
    
    if (Math.abs(paddle.vy) > 4) {
        const blurCount = Math.min(5, Math.floor(Math.abs(paddle.vy) / 3));
        for (let i = 1; i <= blurCount; i++) {
            ctx.globalAlpha = 0.15 / i;
            ctx.fillStyle = color;
            roundRect(
                ctx,
                x - width / 2,
                y - height / 2 - paddle.vy * i * 0.4,
                width,
                height,
                4
            );
        }
        ctx.globalAlpha = 1;
    }
    
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 25;
    roundRect(ctx, x - width / 2, y - height / 2, width, height, 5);
    ctx.shadowBlur = 0;
    
    if (paddle.powerCharge > 0.1) {
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 3;
        ctx.globalAlpha = paddle.powerCharge;
        ctx.beginPath();
        ctx.arc(x, y, height / 2 + 10, 0, Math.PI * 2 * paddle.powerCharge);
        ctx.stroke();
        ctx.globalAlpha = 1;
    }
    
    if (Math.abs(paddle.vy) > 5) {
        const indicatorColor = paddle.vy > 0 ? '#ff6600' : '#00ff66';
        ctx.fillStyle = indicatorColor;
        ctx.globalAlpha = 0.6;
        
        const arrowY = paddle.vy > 0 ? y + height / 2 + 15 : y - height / 2 - 15;
        ctx.beginPath();
        ctx.moveTo(x, arrowY);
        ctx.lineTo(x - 8, arrowY - Math.sign(paddle.vy) * 10);
        ctx.lineTo(x + 8, arrowY - Math.sign(paddle.vy) * 10);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}

function drawBallTrail() {
    if (!gameSettings.trailEnabled) return;
    
    ball.trail.forEach((t, i) => {
        const alpha = t.alpha * 0.6;
        const size = PHYSICS.ballRadius * (0.4 + t.alpha * 0.6);
        
        let color;
        const spinMag = Math.abs(t.spin.x) + Math.abs(t.spin.y);
        if (spinMag > 0.003) {
            if (t.spin.x > 0.002) {
                color = `rgba(255, 102, 0, ${alpha})`;
            } else if (t.spin.x < -0.002) {
                color = `rgba(0, 255, 102, ${alpha})`;
            } else {
                color = `rgba(255, 255, 0, ${alpha})`;
            }
        } else {
            color = `rgba(255, 255, 255, ${alpha})`;
        }
        
        ctx.beginPath();
        ctx.arc(t.x, t.y, size, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
    });
}

function drawBall() {
    const spinMagnitude = Math.abs(ball.spin.x) + Math.abs(ball.spin.y);
    
    let glowColor = '#ffffff';
    if (spinMagnitude > 0.003) {
        if (ball.spin.x > 0.002) {
            glowColor = '#ff6600';
        } else if (ball.spin.x < -0.002) {
            glowColor = '#00ff66';
        } else if (Math.abs(ball.spin.y) > 0.002) {
            glowColor = '#ffff00';
        }
    }
    
    const glowRadius = PHYSICS.ballRadius * 4 + spinMagnitude * 500;
    const gradient = ctx.createRadialGradient(ball.x, ball.y, 0, ball.x, ball.y, glowRadius);
    gradient.addColorStop(0, glowColor + '50');
    gradient.addColorStop(0.4, glowColor + '20');
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.fillRect(ball.x - glowRadius, ball.y - glowRadius, glowRadius * 2, glowRadius * 2);
    
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, PHYSICS.ballRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 20 + spinMagnitude * 300;
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(ball.x - 4, ball.y - 4, PHYSICS.ballRadius * 0.35, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.shadowBlur = 0;
    ctx.fill();
    
    if (spinMagnitude > 0.002) {
        drawSpinIndicator();
    }
}

function drawSpinIndicator() {
    const spinMag = Math.abs(ball.spin.x) + Math.abs(ball.spin.y);
    if (spinMag < 0.001) return;
    
    ctx.save();
    ctx.translate(ball.x, ball.y);
    
    const rotation = Date.now() * 0.015 * (ball.spin.x > 0 ? 1 : -1);
    ctx.rotate(rotation);
    
    let ringColor;
    if (ball.spin.x > 0.002) {
        ringColor = 'rgba(255, 102, 0, 0.7)';
    } else if (ball.spin.x < -0.002) {
        ringColor = 'rgba(0, 255, 102, 0.7)';
    } else {
        ringColor = 'rgba(255, 255, 0, 0.7)';
    }
    
    ctx.strokeStyle = ringColor;
    ctx.lineWidth = 2 + spinMag * 100;
    
    const segments = 6;
    const arcLength = Math.PI / segments;
    
    for (let i = 0; i < segments; i++) {
        ctx.beginPath();
        ctx.arc(0, 0, PHYSICS.ballRadius + 8, 
                (i * 2 * Math.PI / segments), 
                (i * 2 * Math.PI / segments) + arcLength);
        ctx.stroke();
    }
    
    ctx.restore();
}

function drawSpinUI() {
    const spinX = ball.spin.x;
    const spinY = ball.spin.y;
    const spinMag = Math.abs(spinX) + Math.abs(spinY);
    
    if (spinMag < 0.001) return;
    
    const uiX = 100;
    const uiY = 100;
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.beginPath();
    ctx.arc(uiX, uiY, 35, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.save();
    ctx.translate(uiX, uiY);
    
    const angle = Math.atan2(spinX, spinY);
    ctx.rotate(angle);
    
    let arrowColor;
    if (spinX > 0.002) {
        arrowColor = '#ff6600';
    } else if (spinX < -0.002) {
        arrowColor = '#00ff66';
    } else {
        arrowColor = '#ffff00';
    }
    
    ctx.fillStyle = arrowColor;
    ctx.beginPath();
    ctx.moveTo(0, -25);
    ctx.lineTo(-8, 10);
    ctx.lineTo(8, 10);
    ctx.closePath();
    ctx.fill();
    
    ctx.restore();
    
    ctx.fillStyle = '#888';
    ctx.font = '12px Orbitron, sans-serif';
    ctx.textAlign = 'center';
    
    let spinLabel = '';
    if (spinX > 0.002) spinLabel = 'TOPSPIN';
    else if (spinX < -0.002) spinLabel = 'BACKSPIN';
    else if (Math.abs(spinY) > 0.002) spinLabel = 'SIDESPIN';
    
    ctx.fillText(spinLabel, uiX, uiY + 55);
}

function drawParticles() {
    particles.forEach(p => {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        
        if (p.type === 'spin') {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
            ctx.fill();
        } else {
            const size = p.size * p.life;
            ctx.fillRect(p.x - size / 2, p.y - size / 2, size, size);
        }
    });
    ctx.globalAlpha = 1;
}

function roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();
}

// ==================== SCORE & WIN ====================
function updateScoreDisplay() {
    document.getElementById('score-p1').textContent = paddles.p1.score;
    document.getElementById('score-p2').textContent = paddles.p2.score;
}

function checkWin(winner) {
    if (paddles[winner].score >= gameSettings.winScore) {
        gameState = 'ended';
        showWinMessage(winner);
        return true;
    }
    return false;
}

function showWinMessage(winner) {
    const overlay = document.getElementById('message-overlay');
    const isP1Win = winner === 'p1';
    let isYou;
    
    if (gameMode === 'bot' || gameMode === 'practice') {
        isYou = isP1Win;
    } else {
        isYou = (isHost && isP1Win) || (!isHost && !isP1Win);
    }
    
    const winColor = isYou ? '#00ff88' : '#ff4444';
    const winText = isYou ? '🏆 KAZANDIN!' : '😢 KAYBETTİN!';
    
    overlay.innerHTML = `
        <div style="animation: fadeInUp 0.5s ease;">
            <div style="color: ${winColor}; font-size: 3.5rem; margin-bottom: 20px; text-shadow: 0 0 30px ${winColor};">
                ${winText}
            </div>
            <div style="color: #888; font-size: 1.5rem; margin-bottom: 10px;">
                Final Skor
            </div>
            <div style="font-size: 2.5rem; margin-bottom: 30px;">
                <span style="color: #00f5ff;">${paddles.p1.score}</span>
                <span style="color: #444;"> - </span>
                <span style="color: #ff00ff;">${paddles.p2.score}</span>
            </div>
            <button class="menu-btn btn-online" onclick="restartGame()" style="font-size: 1rem; padding: 15px 40px; margin: 10px;">
                🔄 Tekrar Oyna
            </button>
            <br>
            <button class="menu-btn btn-back" onclick="quitGame()" style="font-size: 1rem; padding: 15px 40px; margin: 10px;">
                🏠 Ana Menü
            </button>
        </div>
    `;
    overlay.style.display = 'block';
}

function restartGame() {
    document.getElementById('message-overlay').style.display = 'none';
    resetGame();
    gameState = 'countdown';
    startCountdown();
}

// ==================== SETTINGS ====================
function toggleSettings() {
    document.getElementById('volume-control').classList.toggle('active');
}

function setVolume(value) {
    gameSettings.volume = value / 100;
}

// ==================== INITIALIZATION ====================
window.onload = function() {
    playerId = 'player_' + Math.random().toString(36).substring(2, 8);
    
    const style = document.createElement('style');
    style.textContent = `
        @keyframes countdownPop {
            0% { transform: translate(-50%, -50%) scale(1.5); opacity: 0; }
            50% { transform: translate(-50%, -50%) scale(1.1); opacity: 1; }
            100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
        }
        @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
        }
    `;
    document.head.appendChild(style);
};

window.onbeforeunload = function() {
    if (roomCode) {
        localStorage.removeItem('pingpong_room_' + roomCode);
    }
};
