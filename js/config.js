// ==================== CONFIG.JS ====================
// Oyun sabitleri ve ayarları

// MASA - gerçekçi oranlar (metre cinsinden)
export const TABLE = { 
    length: 2.74,      // 274cm uzunluk
    width: 1.525,      // 152.5cm genişlik
    height: 0.76,      // 76cm yükseklik
    netHeight: 0.1525  // 15.25cm file yüksekliği
};

// FİZİK - gerçekçi masa tenisi parametreleri
export const PHYSICS = { 
    gravity: -9.8,       // Yerçekimi (m/s²)
    ballRadius: 0.02,    // 40mm top
    paddleRadius: 0.085, // 17cm raket çapı
    bounce: 0.85,        // Sekme katsayısı
    friction: 0.98,      // Sürtünme
    spinEffect: 0.4      // Spin/falso etkisi
};

// OYUN AYARLARI
export const GAME_SETTINGS = {
    winScore: 11,        // Kazanma skoru
    minScoreDiff: 2,     // Minimum skor farkı
    serveChangeEvery: 2  // Her X serviste değişim
};
