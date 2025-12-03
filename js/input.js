// ==================== INPUT.JS ====================
// Mouse ve klavye kontrolü

import { initAudio } from './sound.js';

// Mouse durumu
let mouse = { x: 0, y: 0, prevX: 0, prevY: 0, down: false };
let mouseVel = { x: 0, y: 0 };

// Callback'ler
let onServeStart = null;
let onPause = null;

// Event listener'ları kur
export function setupInputEvents(callbacks = {}) {
    onServeStart = callbacks.onServeStart || null;
    onPause = callbacks.onPause || null;
    
    // Mouse hareket
    document.addEventListener('mousemove', handleMouseMove);
    
    // Mouse tıklama
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp);
    
    // Klavye
    document.addEventListener('keydown', handleKeyDown);
    
    // Touch
    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
}

// Mouse hareket
function handleMouseMove(e) {
    mouse.prevX = mouse.x;
    mouse.prevY = mouse.y;
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    
    // Custom cursor güncelle
    const cursor = document.getElementById('custom-cursor');
    if (cursor) {
        cursor.style.left = e.clientX + 'px';
        cursor.style.top = e.clientY + 'px';
    }
}

// Mouse basıldı
function handleMouseDown(e) {
    mouse.down = true;
    initAudio();
    
    if (onServeStart) onServeStart();
}

// Mouse bırakıldı
function handleMouseUp() {
    mouse.down = false;
}

// Klavye
function handleKeyDown(e) {
    if (e.key === ' ') {
        if (onServeStart) onServeStart();
    }
    if (e.key === 'Escape') {
        if (onPause) onPause();
    }
}

// Touch başladı
function handleTouchStart(e) {
    mouse.down = true;
    initAudio();
    handleTouchPosition(e);
    
    if (onServeStart) onServeStart();
}

// Touch hareket
function handleTouchMove(e) {
    e.preventDefault();
    handleTouchPosition(e);
}

// Touch pozisyon
function handleTouchPosition(e) {
    const touch = e.touches[0];
    mouse.prevX = mouse.x;
    mouse.prevY = mouse.y;
    mouse.x = (touch.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(touch.clientY / window.innerHeight) * 2 + 1;
}

// Touch bitti
function handleTouchEnd() {
    mouse.down = false;
}

// Mouse hızını güncelle (her frame çağrılmalı)
export function updateMouseVelocity() {
    mouseVel.x = (mouse.x - mouse.prevX) * 60;
    mouseVel.y = (mouse.y - mouse.prevY) * 60;
}

// Hit efekti göster
export function showHitEffect() {
    const cursor = document.getElementById('custom-cursor');
    if (cursor) {
        cursor.classList.add('hitting');
        setTimeout(() => cursor.classList.remove('hitting'), 300);
    }
}

// Getter'lar
export function getMouse() { return { ...mouse }; }
export function getMouseVel() { return { ...mouseVel }; }
export function isMouseDown() { return mouse.down; }
