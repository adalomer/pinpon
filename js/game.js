// ==================== GAME.JS ====================
// Ana oyun mantığı ve döngüsü

import * as THREE from 'three';
import { TABLE, PHYSICS, GAME_SETTINGS } from './config.js';
import { initAudio, SOUNDS } from './sound.js';
import { createScene, createEnvironment, handleResize, getScene, getCamera, getRenderer } from './scene.js';
import { createTable, createNet } from './table.js';
import { createBall, updateBall, setBallPosition, setBallVelocity, setBallSpin, 
         resetBounceCounters, setBallVisible, setLastHitter, getBallPos, getBallVel, getBallSpin } from './ball.js';
import { createPaddles, updatePlayerPaddle, updateOpponentAI, 
         getPaddlePos, getPaddleVel, getPaddleAngleX, getOppPos } from './paddle.js';
import { setupInputEvents, updateMouseVelocity, getMouse, getMouseVel, showHitEffect } from './input.js';
import { initUI, showMenu, showGameUI, updateScore, showMessage, hideMessage, 
         appendToMessage, showPauseScreen } from './ui.js';

// Oyun durumu
let gameState = 'menu'; // menu, serving, playing, scoring, paused, ended
let gameMode = 'bot';   // bot, practice, online
let scores = { player: 0, opponent: 0 };
let servingPlayer = 'player';
let servePhase = 0;

// Animation
let lastTime = 0;

// Oyunu başlat
export function initGame() {
    console.log('🏓 Game initializing...');
    
    // Canvas al
    const canvas = document.getElementById('game-canvas');
    
    // Sahne oluştur
    const { scene, camera, renderer } = createScene(canvas);
    
    // Çevre
    createEnvironment(scene);
    
    // Masa ve file
    createTable(scene);
    createNet(scene);
    
    // Top ve raketler
    createBall(scene);
    createPaddles(scene);
    
    // UI
    initUI();
    
    // Input
    setupInputEvents({
        onServeStart: handleServeStart,
        onPause: togglePause
    });
    
    // Resize
    window.addEventListener('resize', () => handleResize(camera, renderer));
    
    // Butonlar
    setupButtons();
    
    // Animation başlat
    animate(0);
    
    console.log('✅ Game initialized!');
}

// Butonları ayarla
function setupButtons() {
    document.getElementById('btn-bot')?.addEventListener('click', () => {
        gameMode = 'bot';
        startGame();
    });
    
    document.getElementById('btn-practice')?.addEventListener('click', () => {
        gameMode = 'practice';
        startGame();
    });
    
    document.getElementById('btn-online')?.addEventListener('click', () => {
        alert('Online mod yakında!');
    });
    
    document.getElementById('btn-resume')?.addEventListener('click', () => {
        gameState = 'playing';
        showPauseScreen(false);
    });
    
    document.getElementById('btn-quit')?.addEventListener('click', () => {
        location.reload();
    });
}

// Oyunu başlat
function startGame() {
    console.log('Starting game, mode:', gameMode);
    
    showMenu(false);
    showGameUI(true);
    
    scores = { player: 0, opponent: 0 };
    updateScore(0, 0);
    
    servingPlayer = 'player';
    prepareServe();
}

// Servis hazırla
function prepareServe() {
    gameState = 'serving';
    servePhase = 0;
    
    resetBounceCounters();
    setBallVisible(true);
    
    const paddlePos = getPaddlePos();
    
    if (servingPlayer === 'player') {
        setBallPosition(paddlePos.x, paddlePos.y + 0.1, paddlePos.z - 0.15);
        setBallVelocity(0, 0, 0);
        setBallSpin(0, 0, 0);
        showMessage('🏓 TIKLA veya SPACE = Servis!', 3000);
    } else {
        const oppPos = getOppPos();
        setBallPosition(oppPos.x, TABLE.height + 0.2, -TABLE.length/2 + 0.3);
        setBallVelocity(0, 0, 0);
        showMessage('🤖 Rakip servis...', 1000);
        setTimeout(() => {
            if (gameState === 'serving') opponentServe();
        }, 1500);
    }
}

// Servis başlat (oyuncu)
function handleServeStart() {
    if (gameState === 'serving' && servingPlayer === 'player' && servePhase === 0) {
        servePhase = 1;
        setBallVelocity(0, 3.5, -0.3);
        SOUNDS.serve();
        showMessage('🎯 Raketinle vur!', 2000);
    }
}

// Oyuncu servisi (vurduktan sonra)
function playerServe() {
    servePhase = 2;
    gameState = 'playing';
    setLastHitter('player');
    resetBounceCounters();
    SOUNDS.hit();
    
    const paddleVel = getPaddleVel();
    
    // Önce kendi sahaya sekmeli
    setBallVelocity(
        paddleVel.x * 0.2,
        1.5,
        -1.2
    );
    setBallSpin(
        -paddleVel.y * 0.2,
        0,
        -paddleVel.x * 0.2
    );
}

// Rakip servisi
function opponentServe() {
    servePhase = 2;
    gameState = 'playing';
    setLastHitter('opponent');
    resetBounceCounters();
    SOUNDS.hit();
    
    setBallVelocity(
        (Math.random() - 0.5) * 0.3,
        1.5,
        1.2
    );
    setBallSpin(
        (Math.random() - 0.5) * 1.0,
        0,
        (Math.random() - 0.5) * 1.0
    );
}

// Sayı
function handleScore(winner, msg) {
    if (gameState !== 'playing') return;
    
    gameState = 'scoring';
    scores[winner]++;
    updateScore(scores.player, scores.opponent);
    
    if (winner === 'player') {
        SOUNDS.score();
    } else {
        SOUNDS.lose();
    }
    
    showMessage(msg || (winner === 'player' ? '✅ SAYIN!' : '❌ Rakip Sayı!'), 1500);
    
    // Oyun bitti mi?
    if ((scores.player >= GAME_SETTINGS.winScore || scores.opponent >= GAME_SETTINGS.winScore) && 
        Math.abs(scores.player - scores.opponent) >= GAME_SETTINGS.minScoreDiff) {
        endGame();
        return;
    }
    
    // Sıradaki servis
    servingPlayer = servingPlayer === 'player' ? 'opponent' : 'player';
    setTimeout(() => {
        if (gameState !== 'menu' && gameState !== 'ended') {
            prepareServe();
        }
    }, 2000);
}

// Oyun bitti
function endGame() {
    gameState = 'ended';
    const won = scores.player > scores.opponent;
    
    showMessage(won ? '🎉 KAZANDIN!' : '😢 KAYBETTİN', 0);
    
    if (won) {
        SOUNDS.win();
    } else {
        SOUNDS.gameOver();
    }
    
    setTimeout(() => {
        appendToMessage('<br><br><button class="menu-btn btn-bot" onclick="location.reload()">🔄 Tekrar</button>');
    }, 500);
}

// Pause toggle
function togglePause() {
    if (gameState === 'playing') {
        gameState = 'paused';
        showPauseScreen(true);
    } else if (gameState === 'paused') {
        gameState = 'playing';
        showPauseScreen(false);
    }
}

// Ana güncelleme
function update(dt) {
    if (!dt || dt > 0.1) dt = 0.016;
    
    const mouse = getMouse();
    updateMouseVelocity();
    const mouseVel = getMouseVel();
    
    // Raket güncelle
    updatePlayerPaddle(mouse, mouseVel, dt);
    
    // Rakip AI
    if (gameState === 'playing') {
        updateOpponentAI(getBallPos(), getBallVel(), getBallSpin(), gameMode);
    }
    
    // Oyun durumuna göre
    if (gameState === 'playing') {
        const result = updateBall(
            dt, 
            getPaddlePos(), 
            getPaddleVel(), 
            getPaddleAngleX(),
            getOppPos()
        );
        
        if (result && result.type === 'score') {
            handleScore(result.winner, result.msg);
        }
    }
    
    // Servis sırasında
    if (gameState === 'serving' && servingPlayer === 'player') {
        const paddlePos = getPaddlePos();
        
        if (servePhase === 0) {
            // Top raket önünde bekler
            setBallPosition(paddlePos.x, paddlePos.y + 0.08, paddlePos.z - 0.1);
        } else if (servePhase === 1) {
            // Top atıldı
            let ballVel = getBallVel();
            let ballPos = getBallPos();
            
            ballVel.y += PHYSICS.gravity * dt;
            ballPos.x += ballVel.x * dt;
            ballPos.y += ballVel.y * dt;
            ballPos.z += ballVel.z * dt;
            
            setBallPosition(ballPos.x, ballPos.y, ballPos.z);
            setBallVelocity(ballVel.x, ballVel.y, ballVel.z);
            
            // Raket çarpışma kontrolü
            const dx = ballPos.x - paddlePos.x;
            const dy = ballPos.y - paddlePos.y;
            const dz = ballPos.z - paddlePos.z;
            
            const hitX = Math.abs(dx) < PHYSICS.paddleRadius + 0.05;
            const hitY = Math.abs(dy) < PHYSICS.paddleRadius * 1.1 + 0.05;
            const hitZ = Math.abs(dz) < 0.15;
            
            if (hitX && hitY && hitZ) {
                showHitEffect();
                playerServe();
            }
            
            // Top düştü
            if (ballPos.y < TABLE.height - 0.1) {
                showMessage('❌ Kaçırdın! Tekrar dene.', 1500);
                setTimeout(prepareServe, 1200);
            }
        }
    }
}

// Animation döngüsü
function animate(time) {
    requestAnimationFrame(animate);
    
    const dt = Math.min((time - lastTime) / 1000, 0.05) || 0.016;
    lastTime = time;
    
    update(dt);
    
    const renderer = getRenderer();
    const scene = getScene();
    const camera = getCamera();
    
    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }
}

// Export state getters
export function getGameState() { return gameState; }
export function getGameMode() { return gameMode; }
export function getScores() { return { ...scores }; }
