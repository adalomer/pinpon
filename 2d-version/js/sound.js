// ==================== SOUND SYSTEM ====================

const SoundSystem = {
    audioCtx: null,

    init() {
        if (!this.audioCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioCtx = new AudioContext();
        }
    },

    play(type, volume = 1) {
        if (!CONFIG.SOUND.enabled || !this.audioCtx) return;

        try {
            const oscillator = this.audioCtx.createOscillator();
            const gainNode = this.audioCtx.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.audioCtx.destination);

            const vol = Math.min(1, volume * CONFIG.SOUND.volume);

            switch (type) {
                case 'hit':
                    // GÜÇLÜ VURUŞ SESİ
                    oscillator.frequency.value = 380 + Math.random() * 100;
                    oscillator.type = 'sine';
                    gainNode.gain.setValueAtTime(vol * 0.4, this.audioCtx.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.12);
                    oscillator.start();
                    oscillator.stop(this.audioCtx.currentTime + 0.12);
                    
                    // İkinci katman - bas
                    const osc2 = this.audioCtx.createOscillator();
                    const gain2 = this.audioCtx.createGain();
                    osc2.connect(gain2);
                    gain2.connect(this.audioCtx.destination);
                    osc2.frequency.value = 120;
                    osc2.type = 'sine';
                    gain2.gain.setValueAtTime(vol * 0.3, this.audioCtx.currentTime);
                    gain2.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.08);
                    osc2.start();
                    osc2.stop(this.audioCtx.currentTime + 0.08);
                    break;

                case 'powerHit':
                    // POWER SHOT SESİ
                    oscillator.frequency.value = 200;
                    oscillator.type = 'sawtooth';
                    gainNode.gain.setValueAtTime(vol * 0.5, this.audioCtx.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.3);
                    oscillator.frequency.linearRampToValueAtTime(80, this.audioCtx.currentTime + 0.3);
                    oscillator.start();
                    oscillator.stop(this.audioCtx.currentTime + 0.3);
                    break;

                case 'wall':
                    oscillator.frequency.value = 180;
                    oscillator.type = 'triangle';
                    gainNode.gain.setValueAtTime(vol * 0.2, this.audioCtx.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.05);
                    oscillator.start();
                    oscillator.stop(this.audioCtx.currentTime + 0.05);
                    break;

                case 'score':
                    oscillator.frequency.value = 523.25;
                    oscillator.type = 'sine';
                    gainNode.gain.setValueAtTime(vol * 0.4, this.audioCtx.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.5);
                    oscillator.frequency.setValueAtTime(659.25, this.audioCtx.currentTime + 0.15);
                    oscillator.frequency.setValueAtTime(783.99, this.audioCtx.currentTime + 0.3);
                    oscillator.start();
                    oscillator.stop(this.audioCtx.currentTime + 0.5);
                    break;

                case 'spin':
                    oscillator.frequency.value = 700;
                    oscillator.type = 'sine';
                    gainNode.gain.setValueAtTime(vol * 0.15, this.audioCtx.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.15);
                    oscillator.frequency.linearRampToValueAtTime(1200, this.audioCtx.currentTime + 0.15);
                    oscillator.start();
                    oscillator.stop(this.audioCtx.currentTime + 0.15);
                    break;

                case 'countdown':
                    oscillator.frequency.value = 600;
                    oscillator.type = 'sine';
                    gainNode.gain.setValueAtTime(vol * 0.35, this.audioCtx.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.2);
                    oscillator.start();
                    oscillator.stop(this.audioCtx.currentTime + 0.2);
                    break;

                case 'win':
                    oscillator.frequency.value = 440;
                    oscillator.type = 'sine';
                    gainNode.gain.setValueAtTime(vol * 0.4, this.audioCtx.currentTime);
                    oscillator.frequency.setValueAtTime(554.37, this.audioCtx.currentTime + 0.2);
                    oscillator.frequency.setValueAtTime(659.25, this.audioCtx.currentTime + 0.4);
                    oscillator.frequency.setValueAtTime(880, this.audioCtx.currentTime + 0.6);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.8);
                    oscillator.start();
                    oscillator.stop(this.audioCtx.currentTime + 0.8);
                    break;

                case 'lose':
                    oscillator.frequency.value = 300;
                    oscillator.type = 'sine';
                    gainNode.gain.setValueAtTime(vol * 0.35, this.audioCtx.currentTime);
                    oscillator.frequency.linearRampToValueAtTime(150, this.audioCtx.currentTime + 0.5);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.5);
                    oscillator.start();
                    oscillator.stop(this.audioCtx.currentTime + 0.5);
                    break;
            }
        } catch (e) {
            console.log('Sound error:', e);
        }
    }
};
