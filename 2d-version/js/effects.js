// ==================== SCREEN EFFECTS ====================

const Effects = {
    screenShake: { x: 0, y: 0, intensity: 0 },
    flash: { active: false, color: '#fff', alpha: 0 },

    shake(intensity) {
        this.screenShake.intensity = intensity * CONFIG.VISUALS.shakeIntensity;
    },

    flashScreen(color, alpha = 0.4) {
        this.flash = { active: true, color: color, alpha: alpha };
    },

    update() {
        // Screen shake
        if (this.screenShake.intensity > 0.1) {
            this.screenShake.x = (Math.random() - 0.5) * this.screenShake.intensity;
            this.screenShake.y = (Math.random() - 0.5) * this.screenShake.intensity;
            this.screenShake.intensity *= 0.9;
        } else {
            this.screenShake.x = 0;
            this.screenShake.y = 0;
            this.screenShake.intensity = 0;
        }

        // Flash
        if (this.flash.active) {
            this.flash.alpha *= CONFIG.VISUALS.flashDuration;
            if (this.flash.alpha < 0.01) {
                this.flash.active = false;
            }
        }
    },

    applyShake(ctx) {
        ctx.translate(this.screenShake.x, this.screenShake.y);
    },

    renderFlash(ctx, canvasWidth, canvasHeight) {
        if (this.flash.active) {
            ctx.fillStyle = this.flash.color;
            ctx.globalAlpha = this.flash.alpha;
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);
            ctx.globalAlpha = 1;
        }
    },

    reset() {
        this.screenShake = { x: 0, y: 0, intensity: 0 };
        this.flash = { active: false, color: '#fff', alpha: 0 };
    }
};
