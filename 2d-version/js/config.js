// ==================== GAME CONFIGURATION ====================

const CONFIG = {
    // Fizik sabitleri
    PHYSICS: {
        gravity: 0.001,
        airResistance: 0.9997,      // Çok az direnç
        bounceFactor: 0.88,
        spinDecay: 0.985,           // Spin hızlı azalır
        maxSpin: 0.12,              // Yüksek spin
        ballRadius: 14,
        paddleWidth: 24,
        paddleHeight: 160,          // Büyük paddle
        maxBallSpeed: 45,           // Çok hızlı
        minBallSpeed: 20,           // Hızlı başlangıç
        magnusStrength: 1.5,        // Güçlü falso
        spinTransfer: 0.012         // Güçlü spin aktarımı
    },

    // Oyun ayarları
    GAME: {
        winScore: 11,               // 11'de biter
        countdownTime: 3,
        pointDelay: 1000
    },

    // Power Shot ayarları
    POWER_SHOT: {
        duration: 1500,             // 1.5 saniye aktif
        cooldown: 6000,             // 6 saniye bekleme
        speedMultiplier: 1.7,       // %70 daha hızlı
        spinMultiplier: 1.5
    },

    // Görsel ayarlar
    VISUALS: {
        trailLength: 25,
        particleCount: 15,
        shakeIntensity: 1.2,
        flashDuration: 0.9
    },

    // Ses ayarları
    SOUND: {
        enabled: true,
        volume: 0.5
    }
};

// Oyun durumu
const GameState = {
    MENU: 'menu',
    LOBBY: 'lobby',
    COUNTDOWN: 'countdown',
    PLAYING: 'playing',
    PAUSED: 'paused',
    ENDED: 'ended'
};

// Oyun modları
const GameMode = {
    ONLINE: 'online',
    BOT: 'bot',
    PRACTICE: 'practice'
};
