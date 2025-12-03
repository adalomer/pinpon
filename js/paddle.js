// ==================== PADDLE.JS ====================
// Raket oluşturma ve kontrolü

import * as THREE from 'three';
import { TABLE, PHYSICS } from './config.js';

let playerPaddle, opponentPaddle;

// Oyuncu raket pozisyonu ve hızı
let paddlePos = { x: 0, y: TABLE.height + 0.2, z: TABLE.length/2 + 0.3 };
let paddlePrev = { x: 0, y: TABLE.height + 0.2, z: TABLE.length/2 + 0.3 };
let paddleVel = { x: 0, y: 0, z: 0 };
let paddleAngleX = 0;
let paddleAngleY = 0;

// Rakip pozisyonu
let oppPos = { x: 0, y: TABLE.height + 0.2, z: -TABLE.length/2 - 0.3 };

// Raketleri oluştur
export function createPaddles(scene) {
    const r = PHYSICS.paddleRadius;
    
    // Oyuncu raketi - KIRMIZI
    const paddleGeo = new THREE.CylinderGeometry(r, r, 0.01, 32);
    const pMat = new THREE.MeshStandardMaterial({ 
        color: 0xcc2222,
        roughness: 0.4
    });
    playerPaddle = new THREE.Mesh(paddleGeo, pMat);
    playerPaddle.castShadow = true;
    
    // Sap
    const handleGeo = new THREE.CylinderGeometry(0.012, 0.015, 0.1, 16);
    const handleMat = new THREE.MeshStandardMaterial({ color: 0x5c3a21 });
    const handle = new THREE.Mesh(handleGeo, handleMat);
    handle.position.set(0, -(r + 0.05), 0);
    playerPaddle.add(handle);
    
    scene.add(playerPaddle);
    
    // Rakip raketi - MAVİ
    const oMat = new THREE.MeshStandardMaterial({ 
        color: 0x2255cc,
        roughness: 0.4
    });
    opponentPaddle = new THREE.Mesh(paddleGeo.clone(), oMat);
    opponentPaddle.castShadow = true;
    
    const oppHandle = new THREE.Mesh(handleGeo.clone(), handleMat);
    oppHandle.position.set(0, (r + 0.05), 0);
    opponentPaddle.add(oppHandle);
    
    scene.add(opponentPaddle);
    
    return { playerPaddle, opponentPaddle };
}

// Oyuncu raketini güncelle
export function updatePlayerPaddle(mouse, mouseVel, dt) {
    // Önceki pozisyonu kaydet
    paddlePrev.x = paddlePos.x;
    paddlePrev.y = paddlePos.y;
    paddlePrev.z = paddlePos.z;
    
    // Mouse'tan hedef pozisyon
    const targetX = mouse.x * (TABLE.width * 0.8);
    const targetY = TABLE.height + 0.15 + (mouse.y + 0.5) * 0.4;
    
    // Yumuşak takip
    paddlePos.x += (targetX - paddlePos.x) * 0.25;
    paddlePos.y += (targetY - paddlePos.y) * 0.25;
    paddlePos.z = TABLE.length/2 + 0.2;
    
    // Sınırlar
    paddlePos.x = Math.max(-TABLE.width * 0.9, Math.min(TABLE.width * 0.9, paddlePos.x));
    paddlePos.y = Math.max(TABLE.height + 0.05, Math.min(TABLE.height + 0.6, paddlePos.y));
    
    // Hız hesapla
    paddleVel.x = (paddlePos.x - paddlePrev.x) / dt;
    paddleVel.y = (paddlePos.y - paddlePrev.y) / dt;
    paddleVel.z = (paddlePos.z - paddlePrev.z) / dt;
    
    // Eğim
    const targetAngleX = -mouseVel.x * 0.12;
    const targetAngleY = mouseVel.y * 0.08;
    
    paddleAngleX += (targetAngleX - paddleAngleX) * 0.4;
    paddleAngleY += (targetAngleY - paddleAngleY) * 0.4;
    
    paddleAngleX = Math.max(-0.4, Math.min(0.4, paddleAngleX));
    paddleAngleY = Math.max(-0.25, Math.min(0.25, paddleAngleY));
    
    // Mesh güncelle
    if (playerPaddle) {
        playerPaddle.position.set(paddlePos.x, paddlePos.y, paddlePos.z);
        playerPaddle.rotation.set(Math.PI/2 + paddleAngleY, 0, paddleAngleX);
    }
}

// Rakip AI'ı güncelle
export function updateOpponentAI(ballPos, ballVel, ballSpin, gameMode) {
    if (ballVel.z < 0) {
        const timeToReach = Math.abs((oppPos.z - ballPos.z) / (ballVel.z || 0.1));
        let predictedX = ballPos.x + ballVel.x * timeToReach * 0.9;
        predictedX += ballSpin.z * timeToReach * 0.2;
        
        const aiSpeed = gameMode === 'practice' ? 0.03 : 0.06;
        oppPos.x += (predictedX - oppPos.x) * aiSpeed;
        oppPos.x = Math.max(-TABLE.width/2 + 0.1, Math.min(TABLE.width/2 - 0.1, oppPos.x));
    }
    
    // Mesh güncelle
    if (opponentPaddle) {
        opponentPaddle.position.set(oppPos.x, oppPos.y, oppPos.z);
        opponentPaddle.rotation.set(-Math.PI/2, 0, 0);
    }
}

// Getter'lar
export function getPaddlePos() { return { ...paddlePos }; }
export function getPaddleVel() { return { ...paddleVel }; }
export function getPaddleAngleX() { return paddleAngleX; }
export function getPaddleAngleY() { return paddleAngleY; }
export function getOppPos() { return { ...oppPos }; }
export function getPlayerPaddle() { return playerPaddle; }
export function getOpponentPaddle() { return opponentPaddle; }
