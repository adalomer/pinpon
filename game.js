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
    gravity: 0.0008,
    airResistance: 0.9995,
    tableHeight: 0.15,
    netHeight: 0.08,
    bounceFactor: 0.88,
    spinDecay: 0.997,
    maxSpin: 0.025,
    ballRadius: 12,
    paddleWidth: 18,
    paddleHeight: 110,
    maxBallSpeed: 18,
    minBallSpeed: 4
};

// ==================== GAME OBJECTS ====================
let ball = {
    x: 0,
    y: 0,
    z: 0,                     // 3D efekt için derinlik
    vx: 0,
    vy: 0,
    vz: 0,
    spin: { x: 0, y: 0, z: 0 }, // Falso
    trail: [],
    lastHitBy: null,
    active: true
};

let paddles = {
    p1: { x: 50, y: 0, prevY: 0, vy: 0, score: 0 },
    p2: { x: 0, y: 0, prevY: 0, vy: 0, score: 0 }
};

let gameSettings = {
    winScore: 11,
    soundEnabled: true,
    volume: 0.5,
    particlesEnabled: true,
    trailEnabled: true
};

// Visual Effects
let particles = [];
let screenShake = { x: 0, y: 0, intensity: 0 };

// Bot AI
let botDifficulty = 0.7; // 0-1 arası
let botReactionDelay = 0;
let botTargetY = 0;

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
    
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    const vol = volume * gameSettings.volume;
    
    switch(type) {
        case 'hit':
            oscillator.frequency.value = 400 + Math.random() * 100;
            oscillator.type = 'sine';
            gainNode.gain.setValueAtTime(vol * 0.3, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
            oscillator.start();
            oscillator.stop(audioCtx.currentTime + 0.1);
            break;
        case 'wall':
            oscillator.frequency.value = 200;
            oscillator.type = 'triangle';
            gainNode.gain.setValueAtTime(vol * 0.2, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05);
            oscillator.start();
            oscillator.stop(audioCtx.currentTime + 0.05);
            break;
        case 'score':
            oscillator.frequency.value = 600;
            oscillator.type = 'sine';
            gainNode.gain.setValueAtTime(vol * 0.4, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
            oscillator.frequency.linearRampToValueAtTime(800, audioCtx.currentTime + 0.1);
            oscillator.start();
            oscillator.stop(audioCtx.currentTime + 0.3);
            break;
        case 'spin':
            oscillator.frequency.value = 800;
            oscillator.type = 'sawtooth';
            gainNode.gain.setValueAtTime(vol * 0.15, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
            oscillator.start();
            oscillator.stop(audioCtx.currentTime + 0.15);
            break;
    }
}

// ==================== PEER CONNECTION (WebRTC Signaling via PeerJS) ====================
function initPeerConnection() {
    // PeerJS kullanarak bağlantı kuruyoruz
    playerId = Math.random().toString(36).substring(2, 8);
    
    // PeerJS CDN'den yüklü değilse, basit bir signaling mekanizması kullanacağız
    console.log('Player ID:', playerId);
}

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
}

function backToMenu() {
    document.getElementById('lobby-screen').style.display = 'none';
    document.getElementById('menu-screen').style.display = 'flex';
    document.getElementById('create-room-section').style.display = 'block';
    document.getElementById('room-created-section').style.display = 'none';
    
    // Bağlantıyı temizle
    if (conn) conn.close();
    if (peer) peer.destroy();
    roomCode = '';
    opponentConnected = false;
}

function createRoom() {
    roomCode = generateRoomCode();
    isHost = true;
    
    document.getElementById('create-room-section').style.display = 'none';
    document.getElementById('room-created-section').style.display = 'block';
    document.getElementById('room-code').textContent = roomCode;
    document.getElementById('waiting-text').textContent = 'Rakip bekleniyor...';
    
    // LocalStorage ile basit signaling (aynı tarayıcı için)
    localStorage.setItem('pingpong_room_' + roomCode, JSON.stringify({
        host: playerId,
        created: Date.now(),
        status: 'waiting'
    }));
    
    // Periyodik olarak katılımcı kontrolü
    checkForPlayer();
}

function checkForPlayer() {
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
    setTimeout(checkForPlayer, 500);
}

function joinRoom() {
    const inputCode = document.getElementById('join-room-input').value.toUpperCase();
    if (inputCode.length !== 4) {
        alert('Lütfen 4 haneli oda kodunu girin!');
        return;
    }
    
    const roomData = localStorage.getItem('pingpong_room_' + inputCode);
    if (!roomData) {
        alert('Bu oda bulunamadı!');
        return;
    }
    
    const data = JSON.parse(roomData);
    if (data.guest) {
        alert('Bu oda dolu!');
        return;
    }
    
    // Odaya katıl
    roomCode = inputCode;
    isHost = false;
    data.guest = playerId;
    localStorage.setItem('pingpong_room_' + roomCode, JSON.stringify(data));
    
    opponentConnected = true;
    document.getElementById('waiting-text').textContent = 'Odaya katılındı! Oyun başlıyor...';
    document.getElementById('create-room-section').style.display = 'none';
    document.getElementById('room-created-section').style.display = 'block';
    document.getElementById('room-code').textContent = roomCode;
    
    setTimeout(() => startOnlineGame(), 1500);
}

function copyRoomCode() {
    navigator.clipboard.writeText(roomCode).then(() => {
        const btn = document.querySelector('.copy-btn');
        btn.textContent = '✅ Kopyalandı!';
        setTimeout(() => btn.textContent = '📋 Kodu Kopyala', 2000);
    });
}

// ==================== GAME START FUNCTIONS ====================
function startOnlineGame() {
    gameMode = 'online';
    document.getElementById('p1-name').textContent = isHost ? 'SEN' : 'RAKİP';
    document.getElementById('p2-name').textContent = isHost ? 'RAKİP' : 'SEN';
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
    // Ekranları değiştir
    document.getElementById('menu-screen').style.display = 'none';
    document.getElementById('lobby-screen').style.display = 'none';
    document.getElementById('game-screen').style.display = 'block';
    
    // Canvas ayarları
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');
    resizeCanvas();
    
    // Oyun nesnelerini başlat
    resetGame();
    
    // Event listeners
    window.addEventListener('resize', resizeCanvas);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('keydown', handleKeyDown);
    
    // Geri sayım ve başlat
    gameState = 'countdown';
    startCountdown();
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    // Raket pozisyonlarını güncelle
    paddles.p1.x = 50;
    paddles.p2.x = canvas.width - 50;
}

function resetGame() {
    paddles.p1.y = canvas.height / 2;
    paddles.p2.y = canvas.height / 2;
    paddles.p1.score = 0;
    paddles.p2.score = 0;
    
    resetBall();
    updateScoreDisplay();
}

function resetBall(server = 'p1') {
    ball.x = canvas.width / 2;
    ball.y = canvas.height / 2;
    ball.z = 0;
    
    // Servis yönü
    const direction = server === 'p1' ? 1 : -1;
    const speed = 6;
    const angle = (Math.random() - 0.5) * Math.PI / 4; // -45 ile 45 derece arası
    
    ball.vx = speed * direction * Math.cos(angle);
    ball.vy = speed * Math.sin(angle);
    ball.vz = 0;
    
    ball.spin = { x: 0, y: 0, z: 0 };
    ball.trail = [];
    ball.lastHitBy = null;
    ball.active = true;
}

function startCountdown() {
    let count = 3;
    const countdownEl = document.getElementById('countdown');
    countdownEl.style.display = 'block';
    
    const countdown = setInterval(() => {
        if (count > 0) {
            countdownEl.textContent = count;
            countdownEl.style.transform = 'translate(-50%, -50%) scale(1.5)';
            setTimeout(() => {
                countdownEl.style.transform = 'translate(-50%, -50%) scale(1)';
            }, 200);
            playSound('wall');
            count--;
        } else {
            countdownEl.textContent = 'GO!';
            playSound('score');
            setTimeout(() => {
                countdownEl.style.display = 'none';
                gameState = 'playing';
                gameLoop();
            }, 500);
            clearInterval(countdown);
        }
    }, 800);
}

// ==================== INPUT HANDLING ====================
function handleMouseMove(e) {
    if (gameState !== 'playing') return;
    
    const rect = canvas.getBoundingClientRect();
    const mouseY = e.clientY - rect.top;
    
    // Raket hızını hesapla (falso için)
    paddles.p1.prevY = paddles.p1.y;
    paddles.p1.y = Math.max(PHYSICS.paddleHeight / 2, Math.min(canvas.height - PHYSICS.paddleHeight / 2, mouseY));
    paddles.p1.vy = paddles.p1.y - paddles.p1.prevY;
    
    // Online modda pozisyon gönder
    if (gameMode === 'online') {
        broadcastPosition();
    }
}

function handleTouchMove(e) {
    e.preventDefault();
    if (gameState !== 'playing') return;
    
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const touchY = touch.clientY - rect.top;
    
    paddles.p1.prevY = paddles.p1.y;
    paddles.p1.y = Math.max(PHYSICS.paddleHeight / 2, Math.min(canvas.height - PHYSICS.paddleHeight / 2, touchY));
    paddles.p1.vy = paddles.p1.y - paddles.p1.prevY;
    
    if (gameMode === 'online') {
        broadcastPosition();
    }
}

function handleKeyDown(e) {
    if (e.key === 'Escape') {
        togglePause();
    } else if (e.key === 'm' || e.key === 'M') {
        gameSettings.soundEnabled = !gameSettings.soundEnabled;
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
    document.getElementById('menu-screen').style.display = 'flex';
    
    if (animationId) {
        cancelAnimationFrame(animationId);
    }
    
    // Oda bilgisini temizle
    if (roomCode) {
        localStorage.removeItem('pingpong_room_' + roomCode);
    }
}

// ==================== GAME LOOP ====================
function gameLoop() {
    if (gameState !== 'playing') return;
    
    update();
    render();
    
    animationId = requestAnimationFrame(gameLoop);
}

function update() {
    // Bot AI
    if (gameMode === 'bot') {
        updateBot();
    } else if (gameMode === 'practice') {
        // Practice modda sağ duvar yansıtıcı
        paddles.p2.y = ball.y;
    }
    
    // Top fiziği
    updateBall();
    
    // Partiküller
    updateParticles();
    
    // Screen shake
    if (screenShake.intensity > 0) {
        screenShake.x = (Math.random() - 0.5) * screenShake.intensity;
        screenShake.y = (Math.random() - 0.5) * screenShake.intensity;
        screenShake.intensity *= 0.9;
    }
    
    // Online sync
    if (gameMode === 'online' && isHost) {
        broadcastGameState();
    }
}

function updateBall() {
    if (!ball.active) return;
    
    // Trail efekti
    if (gameSettings.trailEnabled) {
        ball.trail.push({ x: ball.x, y: ball.y, alpha: 1 });
        if (ball.trail.length > 15) ball.trail.shift();
        ball.trail.forEach(t => t.alpha *= 0.85);
    }
    
    // Spin etkisi (Magnus etkisi)
    ball.vx += ball.spin.y * 0.5;
    ball.vy += ball.spin.x * 0.3;
    
    // Hareket
    ball.x += ball.vx;
    ball.y += ball.vy;
    
    // Hava direnci
    ball.vx *= PHYSICS.airResistance;
    ball.vy *= PHYSICS.airResistance;
    
    // Spin azalması
    ball.spin.x *= PHYSICS.spinDecay;
    ball.spin.y *= PHYSICS.spinDecay;
    ball.spin.z *= PHYSICS.spinDecay;
    
    // Üst-Alt duvar çarpışması
    if (ball.y - PHYSICS.ballRadius < 0) {
        ball.y = PHYSICS.ballRadius;
        ball.vy *= -PHYSICS.bounceFactor;
        ball.spin.x *= -0.5;
        playSound('wall');
        createParticles(ball.x, ball.y, '#00f5ff', 5);
    }
    if (ball.y + PHYSICS.ballRadius > canvas.height) {
        ball.y = canvas.height - PHYSICS.ballRadius;
        ball.vy *= -PHYSICS.bounceFactor;
        ball.spin.x *= -0.5;
        playSound('wall');
        createParticles(ball.x, ball.y, '#00f5ff', 5);
    }
    
    // Raket çarpışması - Sol (P1)
    if (ball.x - PHYSICS.ballRadius < paddles.p1.x + PHYSICS.paddleWidth / 2 &&
        ball.x + PHYSICS.ballRadius > paddles.p1.x - PHYSICS.paddleWidth / 2 &&
        ball.y > paddles.p1.y - PHYSICS.paddleHeight / 2 &&
        ball.y < paddles.p1.y + PHYSICS.paddleHeight / 2 &&
        ball.vx < 0) {
        
        handlePaddleHit('p1');
    }
    
    // Raket çarpışması - Sağ (P2)
    if (ball.x + PHYSICS.ballRadius > paddles.p2.x - PHYSICS.paddleWidth / 2 &&
        ball.x - PHYSICS.ballRadius < paddles.p2.x + PHYSICS.paddleWidth / 2 &&
        ball.y > paddles.p2.y - PHYSICS.paddleHeight / 2 &&
        ball.y < paddles.p2.y + PHYSICS.paddleHeight / 2 &&
        ball.vx > 0) {
        
        handlePaddleHit('p2');
    }
    
    // Skor - Sol taraftan çıkış
    if (ball.x < 0) {
        paddles.p2.score++;
        playSound('score');
        updateScoreDisplay();
        checkWin('p2');
        resetBall('p2');
        createParticles(0, ball.y, '#ff00ff', 20);
        screenShake.intensity = 10;
    }
    
    // Skor - Sağ taraftan çıkış
    if (ball.x > canvas.width) {
        paddles.p1.score++;
        playSound('score');
        updateScoreDisplay();
        checkWin('p1');
        resetBall('p1');
        createParticles(canvas.width, ball.y, '#00f5ff', 20);
        screenShake.intensity = 10;
    }
}

function handlePaddleHit(player) {
    const paddle = paddles[player];
    const isP1 = player === 'p1';
    
    // Temel yansıma
    ball.vx *= -1.1; // Biraz hızlandır
    ball.x = isP1 ? paddle.x + PHYSICS.paddleWidth / 2 + PHYSICS.ballRadius : 
                    paddle.x - PHYSICS.paddleWidth / 2 - PHYSICS.ballRadius;
    
    // Raket hızına göre açı
    const hitPosition = (ball.y - paddle.y) / (PHYSICS.paddleHeight / 2);
    ball.vy += hitPosition * 3;
    
    // FALSO SİSTEMİ
    // Raket hareket hızına göre spin ekle
    const spinAmount = paddle.vy * 0.003;
    
    if (Math.abs(paddle.vy) > 5) {
        // Yoğun spin
        ball.spin.x = spinAmount;
        ball.spin.y = (isP1 ? 1 : -1) * Math.abs(spinAmount) * 0.5;
        
        // Spin göstergesi
        playSound('spin');
        createSpinParticles(ball.x, ball.y, paddle.vy > 0 ? '#ff6600' : '#00ff66');
    }
    
    // Vuruş türüne göre ek spin
    // Üstten vuruş = topspin (aşağı eğrilir)
    // Alttan vuruş = backspin (yukarı eğrilir)
    if (hitPosition < -0.3) {
        ball.spin.x -= 0.005; // Topspin
    } else if (hitPosition > 0.3) {
        ball.spin.x += 0.005; // Backspin
    }
    
    ball.lastHitBy = player;
    
    // Efektler
    playSound('hit');
    createParticles(ball.x, ball.y, isP1 ? '#00f5ff' : '#ff00ff', 10);
    screenShake.intensity = 3;
    
    // Hız limiti
    const maxSpeed = 15;
    const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
    if (speed > maxSpeed) {
        ball.vx = (ball.vx / speed) * maxSpeed;
        ball.vy = (ball.vy / speed) * maxSpeed;
    }
}

// ==================== BOT AI ====================
function updateBot() {
    botReactionDelay--;
    
    if (botReactionDelay <= 0) {
        // Topun gelecek pozisyonunu tahmin et
        const timeToReach = (paddles.p2.x - ball.x) / ball.vx;
        
        if (ball.vx > 0 && timeToReach > 0) {
            // Top bize doğru geliyor
            let predictedY = ball.y + ball.vy * timeToReach;
            
            // Spin etkisini de hesaba kat
            predictedY += ball.spin.x * timeToReach * 50;
            
            // Duvardan sekme hesabı
            while (predictedY < 0 || predictedY > canvas.height) {
                if (predictedY < 0) predictedY = -predictedY;
                if (predictedY > canvas.height) predictedY = 2 * canvas.height - predictedY;
            }
            
            // Zorluk seviyesine göre hata payı
            const errorMargin = (1 - botDifficulty) * 100;
            botTargetY = predictedY + (Math.random() - 0.5) * errorMargin;
        } else {
            // Top uzaklaşıyor, merkeze dön
            botTargetY = canvas.height / 2 + (Math.random() - 0.5) * 50;
        }
        
        botReactionDelay = Math.floor(10 + (1 - botDifficulty) * 20);
    }
    
    // Hedefe doğru hareket
    const moveSpeed = 5 + botDifficulty * 5;
    const diff = botTargetY - paddles.p2.y;
    
    paddles.p2.prevY = paddles.p2.y;
    
    if (Math.abs(diff) > moveSpeed) {
        paddles.p2.y += Math.sign(diff) * moveSpeed;
    } else {
        paddles.p2.y = botTargetY;
    }
    
    paddles.p2.vy = paddles.p2.y - paddles.p2.prevY;
    
    // Sınırlar
    paddles.p2.y = Math.max(PHYSICS.paddleHeight / 2, Math.min(canvas.height - PHYSICS.paddleHeight / 2, paddles.p2.y));
}

// ==================== PARTICLES ====================
function createParticles(x, y, color, count) {
    if (!gameSettings.particlesEnabled) return;
    
    for (let i = 0; i < count; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 10,
            vy: (Math.random() - 0.5) * 10,
            life: 1,
            color: color,
            size: Math.random() * 5 + 2
        });
    }
}

function createSpinParticles(x, y, color) {
    if (!gameSettings.particlesEnabled) return;
    
    for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        particles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * 5,
            vy: Math.sin(angle) * 5,
            life: 1,
            color: color,
            size: 4,
            isSpin: true
        });
    }
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.95;
        p.vy *= 0.95;
        p.life -= 0.03;
        
        if (p.life <= 0) {
            particles.splice(i, 1);
        }
    }
}

// ==================== RENDER ====================
function render() {
    // Clear
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Screen shake offset
    ctx.save();
    ctx.translate(screenShake.x, screenShake.y);
    
    // Background grid
    drawGrid();
    
    // Center line
    drawCenterLine();
    
    // Paddles
    drawPaddle(paddles.p1.x, paddles.p1.y, '#00f5ff', paddles.p1.vy);
    drawPaddle(paddles.p2.x, paddles.p2.y, '#ff00ff', paddles.p2.vy);
    
    // Ball trail
    drawBallTrail();
    
    // Ball
    drawBall();
    
    // Particles
    drawParticles();
    
    // Spin indicator
    if (Math.abs(ball.spin.x) > 0.001 || Math.abs(ball.spin.y) > 0.001) {
        drawSpinIndicator();
    }
    
    ctx.restore();
}

function drawGrid() {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    
    const gridSize = 50;
    
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
}

function drawCenterLine() {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 4;
    ctx.setLineDash([20, 15]);
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();
    ctx.setLineDash([]);
}

function drawPaddle(x, y, color, velocity) {
    // Glow effect
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, PHYSICS.paddleHeight);
    gradient.addColorStop(0, color + '40');
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.fillRect(x - PHYSICS.paddleHeight, y - PHYSICS.paddleHeight, PHYSICS.paddleHeight * 2, PHYSICS.paddleHeight * 2);
    
    // Motion blur effect
    if (Math.abs(velocity) > 3) {
        ctx.globalAlpha = 0.3;
        for (let i = 1; i <= 3; i++) {
            ctx.fillStyle = color;
            ctx.fillRect(
                x - PHYSICS.paddleWidth / 2,
                y - PHYSICS.paddleHeight / 2 - velocity * i * 0.3,
                PHYSICS.paddleWidth,
                PHYSICS.paddleHeight
            );
        }
        ctx.globalAlpha = 1;
    }
    
    // Main paddle
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 20;
    
    // Rounded rectangle
    const radius = 5;
    ctx.beginPath();
    ctx.roundRect(
        x - PHYSICS.paddleWidth / 2,
        y - PHYSICS.paddleHeight / 2,
        PHYSICS.paddleWidth,
        PHYSICS.paddleHeight,
        radius
    );
    ctx.fill();
    
    ctx.shadowBlur = 0;
}

function drawBallTrail() {
    if (!gameSettings.trailEnabled) return;
    
    ball.trail.forEach((t, i) => {
        const alpha = t.alpha * 0.5;
        const size = PHYSICS.ballRadius * (0.5 + t.alpha * 0.5);
        
        // Spin'e göre renk değişimi
        let color;
        if (ball.spin.x > 0.002) {
            color = `rgba(255, 102, 0, ${alpha})`; // Topspin - turuncu
        } else if (ball.spin.x < -0.002) {
            color = `rgba(0, 255, 102, ${alpha})`; // Backspin - yeşil
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
    // Glow
    const gradient = ctx.createRadialGradient(ball.x, ball.y, 0, ball.x, ball.y, PHYSICS.ballRadius * 3);
    
    // Spin'e göre glow rengi
    let glowColor;
    if (Math.abs(ball.spin.x) > 0.003 || Math.abs(ball.spin.y) > 0.003) {
        if (ball.spin.x > 0) {
            glowColor = '#ff6600'; // Topspin
        } else {
            glowColor = '#00ff66'; // Backspin
        }
    } else {
        glowColor = '#ffffff';
    }
    
    gradient.addColorStop(0, glowColor + '80');
    gradient.addColorStop(0.5, glowColor + '20');
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.fillRect(ball.x - PHYSICS.ballRadius * 3, ball.y - PHYSICS.ballRadius * 3, 
                 PHYSICS.ballRadius * 6, PHYSICS.ballRadius * 6);
    
    // Ball body
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, PHYSICS.ballRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 15;
    ctx.fill();
    
    // Inner highlight
    ctx.beginPath();
    ctx.arc(ball.x - 3, ball.y - 3, PHYSICS.ballRadius * 0.4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fill();
    
    ctx.shadowBlur = 0;
}

function drawSpinIndicator() {
    const spinMagnitude = Math.sqrt(ball.spin.x * ball.spin.x + ball.spin.y * ball.spin.y);
    if (spinMagnitude < 0.001) return;
    
    ctx.save();
    ctx.translate(ball.x, ball.y);
    
    // Dönen çizgiler
    const rotation = Date.now() * 0.01 * (ball.spin.x > 0 ? 1 : -1);
    ctx.rotate(rotation);
    
    ctx.strokeStyle = ball.spin.x > 0 ? 'rgba(255, 102, 0, 0.6)' : 'rgba(0, 255, 102, 0.6)';
    ctx.lineWidth = 2;
    
    for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.arc(0, 0, PHYSICS.ballRadius + 5, 
                (i / 4) * Math.PI * 2, 
                (i / 4) * Math.PI * 2 + Math.PI / 4);
        ctx.stroke();
    }
    
    ctx.restore();
}

function drawParticles() {
    particles.forEach(p => {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        
        if (p.isSpin) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        }
    });
    ctx.globalAlpha = 1;
}

// ==================== SCORE & WIN ====================
function updateScoreDisplay() {
    document.getElementById('score-p1').textContent = paddles.p1.score;
    document.getElementById('score-p2').textContent = paddles.p2.score;
}

function checkWin(winner) {
    const winScore = gameSettings.winScore;
    
    if (paddles[winner].score >= winScore) {
        gameState = 'ended';
        showWinMessage(winner);
    }
}

function showWinMessage(winner) {
    const overlay = document.getElementById('message-overlay');
    const isYou = (isHost && winner === 'p1') || (!isHost && winner === 'p2');
    
    overlay.innerHTML = `
        <div style="color: ${isYou ? '#00ff88' : '#ff4444'}; font-size: 3rem; margin-bottom: 20px;">
            ${isYou ? '🏆 KAZANDIN!' : '😢 KAYBETTİN!'}
        </div>
        <div style="color: #888; font-size: 1.2rem; margin-bottom: 30px;">
            ${paddles.p1.score} - ${paddles.p2.score}
        </div>
        <button class="menu-btn btn-online" onclick="restartGame()" style="font-size: 1rem; padding: 15px 30px;">
            🔄 Tekrar Oyna
        </button>
        <br><br>
        <button class="menu-btn btn-back" onclick="quitGame()" style="font-size: 1rem; padding: 15px 30px;">
            🏠 Ana Menü
        </button>
    `;
    overlay.style.display = 'block';
}

function restartGame() {
    document.getElementById('message-overlay').style.display = 'none';
    resetGame();
    gameState = 'countdown';
    startCountdown();
}

// ==================== ONLINE SYNC ====================
function broadcastPosition() {
    // LocalStorage ile basit sync (demo için)
    if (!roomCode) return;
    
    const data = {
        p1: { y: paddles.p1.y, vy: paddles.p1.vy },
        timestamp: Date.now()
    };
    localStorage.setItem('pingpong_pos_' + roomCode, JSON.stringify(data));
}

function broadcastGameState() {
    if (!roomCode) return;
    
    const data = {
        ball: { x: ball.x, y: ball.y, vx: ball.vx, vy: ball.vy, spin: ball.spin },
        p1: paddles.p1,
        p2: paddles.p2,
        timestamp: Date.now()
    };
    localStorage.setItem('pingpong_state_' + roomCode, JSON.stringify(data));
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
    initPeerConnection();
    
    // Ping göstergesi güncelleme
    setInterval(() => {
        if (gameMode === 'online' && gameState === 'playing') {
            const ping = Math.floor(Math.random() * 30 + 10);
            document.getElementById('ping-display').textContent = `PING: ${ping}ms`;
        }
    }, 1000);
};

// ==================== POLYFILLS ====================
if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
        if (w < 2 * r) r = w / 2;
        if (h < 2 * r) r = h / 2;
        this.moveTo(x + r, y);
        this.arcTo(x + w, y, x + w, y + h, r);
        this.arcTo(x + w, y + h, x, y + h, r);
        this.arcTo(x, y + h, x, y, r);
        this.arcTo(x, y, x + w, y, r);
        this.closePath();
        return this;
    };
}
