// ==================== BALL.JS ====================
// Top fiziği ve yönetimi

import * as THREE from 'three';
import { TABLE, PHYSICS } from './config.js';
import { SOUNDS } from './sound.js';

let ballMesh;
let ballPos = { x: 0, y: TABLE.height + 0.3, z: 0 };
let ballVel = { x: 0, y: 0, z: 0 };
let ballSpin = { x: 0, y: 0, z: 0 };

// Sekme sayaçları
let bounceCount = { player: 0, opponent: 0 };
let lastBounceZone = null;
let lastHitter = null;
let rallyCount = 0;

// Top mesh'i oluştur
export function createBall(scene) {
    const geo = new THREE.SphereGeometry(PHYSICS.ballRadius, 32, 32);
    const mat = new THREE.MeshStandardMaterial({ 
        color: 0xff6600,
        emissive: 0xff3300,
        emissiveIntensity: 0.2,
        roughness: 0.3
    });
    ballMesh = new THREE.Mesh(geo, mat);
    ballMesh.castShadow = true;
    ballMesh.visible = false;
    scene.add(ballMesh);
    
    return ballMesh;
}

// Topu güncelle
export function updateBall(dt, paddlePos, paddleVel, paddleAngleX, oppPos, scoreCallback) {
    // Yerçekimi
    ballVel.y += PHYSICS.gravity * dt;
    
    // Hava direnci
    ballVel.x *= 0.998;
    ballVel.z *= 0.998;
    
    // Magnus etkisi (falso)
    const magnus = PHYSICS.spinEffect;
    ballVel.x += ballSpin.z * magnus * dt * 3;
    ballVel.z -= ballSpin.x * magnus * dt * 2;
    ballVel.y += ballSpin.x * magnus * dt * 1.5;
    
    // Spin azalması
    ballSpin.x *= 0.995;
    ballSpin.y *= 0.995;
    ballSpin.z *= 0.995;
    
    // Pozisyon güncelle
    ballPos.x += ballVel.x * dt;
    ballPos.y += ballVel.y * dt;
    ballPos.z += ballVel.z * dt;
    
    // Masa sekmesi
    const bounceResult = checkTableBounce();
    if (bounceResult) {
        return bounceResult; // { type: 'score', winner: 'player'|'opponent' }
    }
    
    // File çarpması
    checkNetCollision();
    
    // Oyuncu raket çarpışması
    const playerHit = checkPaddleCollision(paddlePos, paddleVel, paddleAngleX, 'player');
    if (playerHit) return null;
    
    // Rakip raket çarpışması
    const oppHit = checkOpponentPaddleCollision(oppPos);
    if (oppHit) return null;
    
    // Sınır kontrolü
    const outResult = checkOutOfBounds();
    if (outResult) return outResult;
    
    // Mesh güncelle
    updateMesh(dt);
    
    return null;
}

// Masa sekmesi kontrolü
function checkTableBounce() {
    if (ballPos.y <= TABLE.height + PHYSICS.ballRadius && ballVel.y < 0) {
        if (Math.abs(ballPos.x) <= TABLE.width/2 + 0.05 && 
            Math.abs(ballPos.z) <= TABLE.length/2 + 0.05) {
            
            const zone = ballPos.z > 0 ? 'player' : 'opponent';
            
            // Aynı bölgede 2. sekme = sayı
            if (zone === lastBounceZone) {
                if (zone === 'player') {
                    return { type: 'score', winner: 'opponent', msg: '⚠️ 2. sekme! Rakip sayı!' };
                } else {
                    return { type: 'score', winner: 'player', msg: '✅ Rakip 2. sekme yaptı!' };
                }
            }
            
            lastBounceZone = zone;
            bounceCount[zone]++;
            
            // Sıçrama fiziği
            ballPos.y = TABLE.height + PHYSICS.ballRadius + 0.01;
            ballVel.y = Math.abs(ballVel.y) * PHYSICS.bounce;
            if (ballVel.y < 1.5) ballVel.y = 1.5;
            
            // Spin etkisi
            ballVel.x += ballSpin.z * 0.15;
            ballVel.z -= ballSpin.x * 0.12;
            
            SOUNDS.bounce();
        }
    }
    return null;
}

// File çarpışması
function checkNetCollision() {
    if (Math.abs(ballPos.z) < 0.06 && 
        ballPos.y < TABLE.height + TABLE.netHeight + PHYSICS.ballRadius && 
        ballPos.y > TABLE.height) {
        
        ballVel.z *= -0.2;
        ballVel.y *= 0.4;
        ballPos.z = Math.sign(ballPos.z) * 0.07;
        SOUNDS.net();
    }
}

// Oyuncu raketi çarpışması
function checkPaddleCollision(paddlePos, paddleVel, paddleAngleX, who) {
    const dx = ballPos.x - paddlePos.x;
    const dy = ballPos.y - paddlePos.y;
    const dz = ballPos.z - paddlePos.z;
    
    const hitX = Math.abs(dx) < PHYSICS.paddleRadius + PHYSICS.ballRadius + 0.03;
    const hitY = Math.abs(dy) < PHYSICS.paddleRadius * 1.1 + PHYSICS.ballRadius + 0.03;
    const hitZ = Math.abs(dz) < 0.12;
    
    if (hitX && hitY && hitZ && ballVel.z > 0 && lastHitter !== 'player') {
        lastHitter = 'player';
        lastBounceZone = null;
        bounceCount = { player: 0, opponent: 0 };
        rallyCount++;
        
        SOUNDS.hit();
        
        const hitPosX = dx / PHYSICS.paddleRadius;
        const hitPosY = dy / (PHYSICS.paddleRadius * 1.1);
        
        const basePower = 3.8;
        const swingPower = Math.min(Math.sqrt(paddleVel.x*paddleVel.x + paddleVel.y*paddleVel.y), 4.0) * 0.35;
        const totalPower = basePower + swingPower;
        
        ballVel.x = hitPosX * 1.8 + paddleVel.x * 0.4;
        ballVel.y = 2.5 + hitPosY * 0.5;
        ballVel.z = -totalPower;
        
        ballSpin.x = -paddleVel.y * 0.4;
        ballSpin.z = -paddleVel.x * 0.5 + paddleAngleX * 3;
        
        return true;
    }
    return false;
}

// Rakip raketi çarpışması
function checkOpponentPaddleCollision(oppPos) {
    const odx = ballPos.x - oppPos.x;
    const ody = ballPos.y - oppPos.y;
    const odz = ballPos.z - oppPos.z;
    
    const oppHitX = Math.abs(odx) < PHYSICS.paddleRadius + PHYSICS.ballRadius + 0.03;
    const oppHitY = Math.abs(ody) < PHYSICS.paddleRadius * 1.1 + PHYSICS.ballRadius + 0.03;
    const oppHitZ = Math.abs(odz) < 0.12;
    
    if (oppHitX && oppHitY && oppHitZ && ballVel.z < 0 && lastHitter !== 'opponent') {
        lastHitter = 'opponent';
        lastBounceZone = null;
        bounceCount = { player: 0, opponent: 0 };
        rallyCount++;
        
        SOUNDS.hit();
        
        const targetX = (Math.random()-0.5) * TABLE.width * 0.6;
        const power = 3.2 + Math.random() * 0.8;
        
        ballVel.x = (targetX - ballPos.x) * 0.4;
        ballVel.y = 2.3;
        ballVel.z = power;
        
        ballSpin.x = (Math.random()-0.5) * 2.5;
        ballSpin.z = (Math.random()-0.5) * 2.5;
        
        return true;
    }
    return false;
}

// Sınır dışı kontrolü
function checkOutOfBounds() {
    // Oyuncu tarafından çıktı
    if (ballPos.z > TABLE.length/2 + 0.3) {
        if (bounceCount.player === 0) {
            return { type: 'score', winner: 'opponent', msg: '❌ Masana değmedi!' };
        }
    }
    
    // Rakip tarafından çıktı
    if (ballPos.z < -TABLE.length/2 - 0.3) {
        if (bounceCount.opponent === 0) {
            return { type: 'score', winner: 'player', msg: '✅ Rakip masasına değmedi!' };
        }
    }
    
    // Tamamen dışarı
    if (ballPos.z > TABLE.length/2 + 1.5) {
        return { type: 'score', winner: 'opponent', msg: '⚠️ Top dışarı!' };
    }
    if (ballPos.z < -TABLE.length/2 - 1.5) {
        return { type: 'score', winner: 'player', msg: '✅ Sayı!' };
    }
    
    // Yere düştü
    if (ballPos.y < TABLE.height - 0.5) {
        if (lastHitter === 'player') {
            return { type: 'score', winner: 'opponent', msg: '❌ Top yere düştü!' };
        } else {
            return { type: 'score', winner: 'player', msg: '✅ Rakip topu kaçırdı!' };
        }
    }
    
    // Yan dışarı
    if (Math.abs(ballPos.x) > TABLE.width + 1.0) {
        if (lastHitter === 'player') {
            return { type: 'score', winner: 'opponent', msg: '❌ Yan dışarı!' };
        } else {
            return { type: 'score', winner: 'player', msg: '✅ Rakip yan dışarı attı!' };
        }
    }
    
    return null;
}

// Mesh güncelle
function updateMesh(dt) {
    if (!ballMesh) return;
    
    ballMesh.position.set(ballPos.x, ballPos.y, ballPos.z);
    ballMesh.rotation.x += ballSpin.x * dt * 3;
    ballMesh.rotation.y += ballSpin.y * dt * 3;
    ballMesh.rotation.z += ballSpin.z * dt * 3;
}

// Top pozisyonunu ayarla
export function setBallPosition(x, y, z) {
    ballPos.x = x;
    ballPos.y = y;
    ballPos.z = z;
}

// Top hızını ayarla
export function setBallVelocity(vx, vy, vz) {
    ballVel.x = vx;
    ballVel.y = vy;
    ballVel.z = vz;
}

// Spin ayarla
export function setBallSpin(sx, sy, sz) {
    ballSpin.x = sx;
    ballSpin.y = sy;
    ballSpin.z = sz;
}

// Sayaçları sıfırla
export function resetBounceCounters() {
    bounceCount = { player: 0, opponent: 0 };
    lastBounceZone = null;
    lastHitter = null;
}

// Topu göster/gizle
export function setBallVisible(visible) {
    if (ballMesh) ballMesh.visible = visible;
}

// Setter'lar
export function setLastHitter(who) { lastHitter = who; }

// Getter'lar
export function getBallPos() { return { ...ballPos }; }
export function getBallVel() { return { ...ballVel }; }
export function getBallSpin() { return { ...ballSpin }; }
export function getBallMesh() { return ballMesh; }
export function getRallyCount() { return rallyCount; }
export function getBounceCount() { return { ...bounceCount }; }
