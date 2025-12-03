// ==================== SOUND.JS ====================
// Ses efektleri yönetimi

let audioCtx = null;

// Ses sistemini başlat
export function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioCtx;
}

// Basit beep sesi çal
export function playSound(freq, duration = 0.15, volume = 0.2) {
    if (!audioCtx) return;
    
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.frequency.value = freq;
    gain.gain.value = volume;
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
    
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
}

// Önceden tanımlı ses efektleri
export const SOUNDS = {
    hit: () => playSound(900),       // Raket vuruşu
    bounce: () => playSound(600),     // Masa sekmesi
    net: () => playSound(200),        // File çarpması
    score: () => playSound(700),      // Sayı kazanma
    lose: () => playSound(250),       // Sayı kaybetme
    serve: () => playSound(400),      // Servis
    win: () => playSound(880),        // Oyun kazanma
    gameOver: () => playSound(220)    // Oyun kaybetme
};
