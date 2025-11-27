// ==================== PADDLE ====================

class Paddle {
    constructor(isLeft) {
        this.isLeft = isLeft;
        this.x = 0;
        this.y = 0;
        this.prevY = 0;
        this.vy = 0;
        this.score = 0;
        this.color = isLeft ? '#00f5ff' : '#ff00ff';
    }

    setPosition(canvasWidth, canvasHeight) {
        this.x = this.isLeft ? 70 : canvasWidth - 70;
        this.y = canvasHeight / 2;
        this.prevY = this.y;
    }

    moveTo(targetY, canvasHeight) {
        const ph = CONFIG.PHYSICS.paddleHeight;

        this.prevY = this.y;
        this.y = Math.max(ph / 2, Math.min(canvasHeight - ph / 2, targetY));
        this.vy = this.y - this.prevY;
    }

    reset(canvasHeight) {
        this.y = canvasHeight / 2;
        this.prevY = this.y;
        this.vy = 0;
        this.score = 0;
    }

    render(ctx) {
        const pw = CONFIG.PHYSICS.paddleWidth;
        const ph = CONFIG.PHYSICS.paddleHeight;

        // Glow efekti - hıza göre güçlenir
        const glowIntensity = 60 + Math.abs(this.vy) * 8;
        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, glowIntensity);
        gradient.addColorStop(0, this.color + '40');
        gradient.addColorStop(0.5, this.color + '15');
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.fillRect(this.x - glowIntensity, this.y - glowIntensity, glowIntensity * 2, glowIntensity * 2);

        // Paddle gövdesi
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 20 + Math.abs(this.vy) * 2;

        // Yuvarlatılmış dikdörtgen
        const radius = pw / 2;
        ctx.beginPath();
        ctx.roundRect(this.x - pw / 2, this.y - ph / 2, pw, ph, radius);
        ctx.fill();

        // İç gradient
        const innerGradient = ctx.createLinearGradient(
            this.x - pw / 2, this.y,
            this.x + pw / 2, this.y
        );
        innerGradient.addColorStop(0, 'rgba(255,255,255,0.3)');
        innerGradient.addColorStop(0.5, 'rgba(255,255,255,0.1)');
        innerGradient.addColorStop(1, 'rgba(0,0,0,0.2)');

        ctx.fillStyle = innerGradient;
        ctx.beginPath();
        ctx.roundRect(this.x - pw / 2, this.y - ph / 2, pw, ph, radius);
        ctx.fill();

        ctx.shadowBlur = 0;

        // Hız çizgileri
        if (Math.abs(this.vy) > 5) {
            const lineCount = Math.min(5, Math.floor(Math.abs(this.vy) / 3));
            ctx.strokeStyle = this.color + '60';
            ctx.lineWidth = 2;

            for (let i = 0; i < lineCount; i++) {
                const offset = (i + 1) * 8 * Math.sign(this.vy);
                ctx.beginPath();
                ctx.moveTo(this.x - pw / 2, this.y - offset);
                ctx.lineTo(this.x + pw / 2, this.y - offset);
                ctx.globalAlpha = 0.5 - i * 0.1;
                ctx.stroke();
            }
            ctx.globalAlpha = 1;
        }
    }
}
