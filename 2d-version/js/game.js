// ==================== PING PONG - MAIN GAME ====================

// Global değişkenler
let canvas, ctx;
let gameState = GameState.MENU;
let gameMode = GameMode.BOT;
let animationId;
let lastTime = 0;

// Oyuncular
let paddle1, paddle2;
let isHost = true;

// Online
let roomCode = '';
let socket = null;

// ==================== INITIALIZATION ====================
function initGame() {
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Input listeners
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('keydown', handleKeyDown);
    
    // Paddles oluştur
    paddle1 = new Paddle(true);
    paddle2 = new Paddle(false);
    
    SoundSystem.init();
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    if (paddle1 && paddle2) {
        paddle1.setPosition(canvas.width, canvas.height);
        paddle2.setPosition(canvas.width, canvas.height);
    }
}

// ==================== GAME START ====================
function startBotGame() {
    gameMode = GameMode.BOT;
    isHost = true;
    document.getElementById('p1-name').textContent = 'SEN';
    document.getElementById('p2-name').textContent = 'BOT';
    document.getElementById('ping-display').style.display = 'none';
    
    startGame();
}

function startPractice() {
    gameMode = GameMode.PRACTICE;
    isHost = true;
    document.getElementById('p1-name').textContent = 'SEN';
    document.getElementById('p2-name').textContent = 'DUVAR';
    document.getElementById('ping-display').style.display = 'none';
    
    startGame();
}

function startGame() {
    document.getElementById('menu-screen').style.display = 'none';
    document.getElementById('lobby-screen').style.display = 'none';
    document.getElementById('game-screen').style.display = 'block';
    
    initGame();
    resetGame();
    
    gameState = GameState.COUNTDOWN;
    startCountdown();
}

function resetGame() {
    paddle1.reset(canvas.height);
    paddle2.reset(canvas.height);
    paddle1.setPosition(canvas.width, canvas.height);
    paddle2.setPosition(canvas.width, canvas.height);
    
    Ball.reset(canvas.width, canvas.height, 'p1');
    PowerShot.reset();
    ParticleSystem.clear();
    Effects.reset();
    
    updateScoreDisplay();
}

function startCountdown() {
    let count = CONFIG.GAME.countdownTime;
    const countdownEl = document.getElementById('countdown');
    countdownEl.style.display = 'block';
    
    const countdown = setInterval(() => {
        if (count > 0) {
            countdownEl.textContent = count;
            countdownEl.style.animation = 'none';
            countdownEl.offsetHeight;
            countdownEl.style.animation = 'countdownPop 0.5s ease';
            SoundSystem.play('countdown');
            count--;
        } else {
            countdownEl.textContent = 'GO!';
            countdownEl.style.color = '#00ff88';
            SoundSystem.play('score');
            
            setTimeout(() => {
                countdownEl.style.display = 'none';
                countdownEl.style.color = '#00f5ff';
                gameState = GameState.PLAYING;
                lastTime = performance.now();
                gameLoop();
            }, 500);
            
            clearInterval(countdown);
        }
    }, 700);
}

// ==================== INPUT ====================
function handleMouseMove(e) {
    if (gameState !== GameState.PLAYING) return;
    
    const rect = canvas.getBoundingClientRect();
    const mouseY = e.clientY - rect.top;
    
    const paddle = isHost ? paddle1 : paddle2;
    paddle.moveTo(mouseY, canvas.height);
}

function handleTouchMove(e) {
    e.preventDefault();
    if (gameState !== GameState.PLAYING) return;
    
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const touchY = touch.clientY - rect.top;
    
    const paddle = isHost ? paddle1 : paddle2;
    paddle.moveTo(touchY, canvas.height);
}

function handleKeyDown(e) {
    switch(e.key) {
        case 'Escape':
            togglePause();
            break;
        case 'm':
        case 'M':
            CONFIG.SOUND.enabled = !CONFIG.SOUND.enabled;
            break;
        case ' ':
            e.preventDefault();
            if (gameState === GameState.PLAYING) {
                if (PowerShot.activate()) {
                    Effects.flashScreen('#ffff00', 0.3);
                }
            }
            break;
    }
}

function togglePause() {
    if (gameState === GameState.PLAYING) {
        gameState = GameState.PAUSED;
        document.getElementById('pause-menu').style.display = 'flex';
    } else if (gameState === GameState.PAUSED) {
        resumeGame();
    }
}

function resumeGame() {
    gameState = GameState.PLAYING;
    document.getElementById('pause-menu').style.display = 'none';
    lastTime = performance.now();
    gameLoop();
}

function quitGame() {
    gameState = GameState.MENU;
    document.getElementById('pause-menu').style.display = 'none';
    document.getElementById('game-screen').style.display = 'none';
    document.getElementById('message-overlay').style.display = 'none';
    document.getElementById('menu-screen').style.display = 'flex';
    
    if (animationId) {
        cancelAnimationFrame(animationId);
    }
    
    ParticleSystem.clear();
}

// ==================== GAME LOOP ====================
function gameLoop() {
    if (gameState !== GameState.PLAYING) return;
    
    const currentTime = performance.now();
    const deltaTime = currentTime - lastTime;
    lastTime = currentTime;
    
    update(deltaTime);
    render();
    
    animationId = requestAnimationFrame(gameLoop);
}

function update(deltaTime) {
    // Power shot
    PowerShot.update(deltaTime);
    
    // Bot / Practice AI
    if (gameMode === GameMode.BOT) {
        BotAI.update(paddle2, Ball, canvas.height);
    } else if (gameMode === GameMode.PRACTICE) {
        // Basit duvar modu
        const targetY = Ball.y + Ball.vy * 4;
        paddle2.moveTo(paddle2.y + (targetY - paddle2.y) * 0.12, canvas.height);
    }
    
    // Top güncelle
    const hitWall = Ball.update(canvas.width, canvas.height);
    if (hitWall) {
        SoundSystem.play('wall');
        ParticleSystem.create(Ball.x, Ball.y, '#00f5ff', 8);
    }
    
    // Paddle çarpışmaları
    if (Ball.checkPaddleCollision(paddle1, -1)) {
        const hitInfo = Ball.handlePaddleHit(paddle1, true, PowerShot.active);
        onPaddleHit(paddle1, hitInfo);
    }
    
    if (Ball.checkPaddleCollision(paddle2, 1)) {
        const hitInfo = Ball.handlePaddleHit(paddle2, false, PowerShot.active);
        onPaddleHit(paddle2, hitInfo);
    }
    
    // Skor kontrolü
    if (Ball.isOutLeft()) {
        scorePoint('p2');
    }
    if (Ball.isOutRight(canvas.width)) {
        scorePoint('p1');
    }
    
    // Efektler
    ParticleSystem.update();
    Effects.update();
}

function onPaddleHit(paddle, hitInfo) {
    const { absSpeed, spinMultiplier, isPowerShot } = hitInfo;
    
    if (isPowerShot) {
        SoundSystem.play('powerHit');
        ParticleSystem.createPowerHitEffect(Ball.x, Ball.y);
        Effects.shake(20);
        Effects.flashScreen('#ffff00', 0.5);
    } else {
        SoundSystem.play('hit');
        
        // Vuruş gücüne göre efekt
        const power = 0.5 + absSpeed / 20;
        ParticleSystem.createHitEffect(Ball.x, Ball.y, paddle.color, power);
        Effects.shake(5 + absSpeed * 0.5);
        
        // Spin efekti
        if (spinMultiplier > 1.5) {
            SoundSystem.play('spin');
            const spinColor = paddle.vy > 0 ? '#ff6600' : '#00ff66';
            ParticleSystem.createSpinEffect(Ball.x, Ball.y, spinColor, 12, Math.sign(paddle.vy));
        }
    }
}

function scorePoint(scorer) {
    const scoringPaddle = scorer === 'p1' ? paddle1 : paddle2;
    scoringPaddle.score++;
    
    SoundSystem.play('score');
    updateScoreDisplay();
    
    // Efektler
    const side = scorer === 'p1' ? canvas.width : 0;
    ParticleSystem.create(side, Ball.y, scoringPaddle.color, 40, { speedMin: 5, speedMax: 20 });
    Effects.shake(18);
    Effects.flashScreen(scoringPaddle.color, 0.5);
    
    // Kazanan kontrolü
    if (checkWin(scorer)) return;
    
    // Yeni servis
    setTimeout(() => {
        Ball.reset(canvas.width, canvas.height, scorer);
    }, CONFIG.GAME.pointDelay);
}

function checkWin(winner) {
    const score = winner === 'p1' ? paddle1.score : paddle2.score;
    
    console.log(`Skor: P1=${paddle1.score}, P2=${paddle2.score}, WinScore=${CONFIG.GAME.winScore}`);
    
    if (score >= CONFIG.GAME.winScore) {
        gameState = GameState.ENDED;
        showWinScreen(winner);
        return true;
    }
    return false;
}

function showWinScreen(winner) {
    const isP1Win = winner === 'p1';
    let isYou;
    
    if (gameMode === GameMode.BOT || gameMode === GameMode.PRACTICE) {
        isYou = isP1Win;
    } else {
        isYou = (isHost && isP1Win) || (!isHost && !isP1Win);
    }
    
    const winColor = isYou ? '#00ff88' : '#ff4444';
    const winText = isYou ? '🏆 KAZANDIN!' : '😢 KAYBETTİN!';
    
    if (isYou) {
        SoundSystem.play('win');
    } else {
        SoundSystem.play('lose');
    }
    
    const overlay = document.getElementById('message-overlay');
    overlay.innerHTML = `
        <div class="win-screen" style="animation: fadeInUp 0.6s ease;">
            <div style="color: ${winColor}; font-size: 4rem; margin-bottom: 25px; text-shadow: 0 0 40px ${winColor};">
                ${winText}
            </div>
            <div style="color: #888; font-size: 1.3rem; margin-bottom: 15px;">
                Final Skor
            </div>
            <div style="font-size: 3rem; margin-bottom: 40px;">
                <span style="color: #00f5ff;">${paddle1.score}</span>
                <span style="color: #555;"> - </span>
                <span style="color: #ff00ff;">${paddle2.score}</span>
            </div>
            <div style="display: flex; gap: 20px; justify-content: center; flex-wrap: wrap;">
                <button class="menu-btn btn-online" onclick="restartGame()" style="font-size: 1.1rem; padding: 18px 50px;">
                    🔄 Tekrar Oyna
                </button>
                <button class="menu-btn btn-back" onclick="quitGame()" style="font-size: 1.1rem; padding: 18px 50px;">
                    🏠 Ana Menü
                </button>
            </div>
        </div>
    `;
    overlay.style.display = 'flex';
}

function restartGame() {
    document.getElementById('message-overlay').style.display = 'none';
    resetGame();
    gameState = GameState.COUNTDOWN;
    startCountdown();
}

function updateScoreDisplay() {
    document.getElementById('score-p1').textContent = paddle1.score;
    document.getElementById('score-p2').textContent = paddle2.score;
}

// ==================== RENDER ====================
function render() {
    // Clear
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.save();
    Effects.applyShake(ctx);
    
    // Arkaplan
    Renderer.drawBackground(ctx, canvas.width, canvas.height);
    Renderer.drawCenterLine(ctx, canvas.width, canvas.height);
    
    // Oyun objeleri
    paddle1.render(ctx);
    paddle2.render(ctx);
    Ball.render(ctx);
    
    // Partiküller
    ParticleSystem.render(ctx);
    
    // UI
    Renderer.drawSpinIndicator(ctx, Ball, canvas.width);
    PowerShot.render(ctx, canvas.width, canvas.height);
    
    ctx.restore();
    
    // Flash efekti
    Effects.renderFlash(ctx, canvas.width, canvas.height);
}

// ==================== MENU FUNCTIONS ====================
function showLobby() {
    document.getElementById('menu-screen').style.display = 'none';
    document.getElementById('lobby-screen').style.display = 'flex';
    SoundSystem.init();
}

function backToMenu() {
    document.getElementById('lobby-screen').style.display = 'none';
    document.getElementById('menu-screen').style.display = 'flex';
}

// ==================== WINDOW LOAD ====================
window.onload = function() {
    // Animasyon stilleri
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
        .win-screen {
            text-align: center;
            padding: 40px;
        }
    `;
    document.head.appendChild(style);
};
