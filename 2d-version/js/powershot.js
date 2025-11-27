// ==================== POWER SHOT SYSTEM ====================

const PowerShot = {
    active: false,
    timeLeft: 0,
    cooldown: 0,

    activate() {
        if (this.cooldown > 0 || this.active) return false;

        this.active = true;
        this.timeLeft = CONFIG.POWER_SHOT.duration;
        SoundSystem.play('powerHit');
        return true;
    },

    update(deltaTime) {
        if (this.active) {
            this.timeLeft -= deltaTime;
            if (this.timeLeft <= 0) {
                this.active = false;
                this.cooldown = CONFIG.POWER_SHOT.cooldown;
            }
        }

        if (this.cooldown > 0) {
            this.cooldown -= deltaTime;
            if (this.cooldown < 0) this.cooldown = 0;
        }
    },

    isReady() {
        return !this.active && this.cooldown <= 0;
    },

    reset() {
        this.active = false;
        this.timeLeft = 0;
        this.cooldown = 0;
    },

    render(ctx, canvasWidth, canvasHeight) {
        const barWidth = 220;
        const barHeight = 24;
        const x = canvasWidth / 2 - barWidth / 2;
        const y = canvasHeight - 55;

        // Arkaplan
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.beginPath();
        ctx.roundRect(x - 8, y - 8, barWidth + 16, barHeight + 16, 8);
        ctx.fill();

        // Bar çerçeve
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 4);
        ctx.stroke();

        if (this.active) {
            // Aktif - sarı bar
            const fillWidth = (this.timeLeft / CONFIG.POWER_SHOT.duration) * barWidth;

            ctx.shadowColor = '#ffff00';
            ctx.shadowBlur = 20;
            ctx.fillStyle = '#ffff00';
            ctx.beginPath();
            ctx.roundRect(x, y, fillWidth, barHeight, 4);
            ctx.fill();
            ctx.shadowBlur = 0;

            // Metin
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 16px Orbitron, Arial';
            ctx.textAlign = 'center';
            ctx.fillText('⚡ POWER SHOT! ⚡', canvasWidth / 2, y - 12);

        } else if (this.cooldown > 0) {
            // Cooldown - dolum
            const fillWidth = (1 - this.cooldown / CONFIG.POWER_SHOT.cooldown) * barWidth;

            ctx.fillStyle = '#ff4444';
            ctx.beginPath();
            ctx.roundRect(x, y, fillWidth, barHeight, 4);
            ctx.fill();

            // Metin
            ctx.fillStyle = '#ff6666';
            ctx.font = 'bold 14px Orbitron, Arial';
            ctx.textAlign = 'center';
            const secs = Math.ceil(this.cooldown / 1000);
            ctx.fillText(`Bekleniyor... ${secs}s`, canvasWidth / 2, y - 12);

        } else {
            // Hazır - yeşil
            ctx.shadowColor = '#00ff00';
            ctx.shadowBlur = 15;
            ctx.fillStyle = '#00ff00';
            ctx.beginPath();
            ctx.roundRect(x, y, barWidth, barHeight, 4);
            ctx.fill();
            ctx.shadowBlur = 0;

            // Metin
            ctx.fillStyle = '#00ff00';
            ctx.font = 'bold 14px Orbitron, Arial';
            ctx.textAlign = 'center';
            ctx.fillText('🚀 [SPACE] GÜÇLÜ VURUŞ', canvasWidth / 2, y - 12);
        }
    }
};
