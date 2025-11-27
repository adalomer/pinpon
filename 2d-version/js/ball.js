// ==================== BALL PHYSICS ====================

const Ball = {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    spin: { x: 0, y: 0 },
    trail: [],
    lastHitBy: null,

    reset(canvasWidth, canvasHeight, server = 'p1') {
        this.x = canvasWidth / 2;
        this.y = canvasHeight / 2;

        const direction = server === 'p1' ? 1 : -1;
        const speed = CONFIG.PHYSICS.minBallSpeed;
        const angle = (Math.random() - 0.5) * Math.PI / 6;

        this.vx = speed * direction * Math.cos(angle);
        this.vy = speed * Math.sin(angle);

        this.spin = { x: 0, y: 0 };
        this.trail = [];
        this.lastHitBy = null;
    },

    update(canvasWidth, canvasHeight) {
        // Trail ekle
        this.trail.push({ x: this.x, y: this.y, alpha: 1 });
        if (this.trail.length > CONFIG.VISUALS.trailLength) {
            this.trail.shift();
        }
        this.trail.forEach(t => t.alpha *= 0.88);

        // Magnus etkisi (Falso)
        const magnusX = this.spin.y * CONFIG.PHYSICS.magnusStrength;
        const magnusY = this.spin.x * CONFIG.PHYSICS.magnusStrength;

        // Yönü koru
        const originalDir = Math.sign(this.vx);

        this.vx += magnusX;
        this.vy += magnusY;

        // Geri dönme önle
        if (Math.sign(this.vx) !== originalDir && originalDir !== 0) {
            this.vx = originalDir * Math.abs(this.vx);
        }

        // Hareket
        this.x += this.vx;
        this.y += this.vy;

        // Hava direnci
        this.vx *= CONFIG.PHYSICS.airResistance;
        this.vy *= CONFIG.PHYSICS.airResistance;

        // Spin azalması
        this.spin.x *= CONFIG.PHYSICS.spinDecay;
        this.spin.y *= CONFIG.PHYSICS.spinDecay;

        // Duvar çarpışması
        return this.checkWallCollision(canvasHeight);
    },

    checkWallCollision(canvasHeight) {
        const r = CONFIG.PHYSICS.ballRadius;
        let hitWall = false;

        if (this.y - r < 0) {
            this.y = r;
            this.vy *= -CONFIG.PHYSICS.bounceFactor;
            // Duvara çarpınca spin biter
            this.spin.x = 0;
            this.spin.y = 0;
            hitWall = true;
        }

        if (this.y + r > canvasHeight) {
            this.y = canvasHeight - r;
            this.vy *= -CONFIG.PHYSICS.bounceFactor;
            this.spin.x = 0;
            this.spin.y = 0;
            hitWall = true;
        }

        return hitWall;
    },

    checkPaddleCollision(paddle, direction) {
        const pw = CONFIG.PHYSICS.paddleWidth;
        const ph = CONFIG.PHYSICS.paddleHeight;
        const r = CONFIG.PHYSICS.ballRadius;

        const paddleLeft = paddle.x - pw / 2;
        const paddleRight = paddle.x + pw / 2;
        const paddleTop = paddle.y - ph / 2;
        const paddleBottom = paddle.y + ph / 2;

        if (this.x + r > paddleLeft && this.x - r < paddleRight &&
            this.y + r > paddleTop && this.y - r < paddleBottom) {
            if ((direction === -1 && this.vx < 0) || (direction === 1 && this.vx > 0)) {
                return true;
            }
        }
        return false;
    },

    handlePaddleHit(paddle, isP1, isPowerShot) {
        const pw = CONFIG.PHYSICS.paddleWidth;
        const ph = CONFIG.PHYSICS.paddleHeight;
        const r = CONFIG.PHYSICS.ballRadius;

        // Pozisyon düzelt
        this.x = isP1 ?
            paddle.x + pw / 2 + r + 2 :
            paddle.x - pw / 2 - r - 2;

        // Vuruş pozisyonu (-1 ile 1 arası)
        const hitPos = (this.y - paddle.y) / (ph / 2);
        const clampedHit = Math.max(-1, Math.min(1, hitPos));

        // Paddle hızı
        const paddleSpeed = paddle.vy;
        const absSpeed = Math.abs(paddleSpeed);

        // ==================== FALSO HESAPLAMA ====================
        // Ne kadar hızlı çekersen o kadar falso!
        let spinMultiplier = 1;
        if (absSpeed > 2) spinMultiplier = 1.5;
        if (absSpeed > 5) spinMultiplier = 2.5;
        if (absSpeed > 8) spinMultiplier = 4;
        if (absSpeed > 12) spinMultiplier = 6;
        if (absSpeed > 18) spinMultiplier = 8;

        const spinPower = paddleSpeed * CONFIG.PHYSICS.spinTransfer * spinMultiplier;

        this.spin.x = Math.max(-CONFIG.PHYSICS.maxSpin, Math.min(CONFIG.PHYSICS.maxSpin, spinPower));
        this.spin.y = clampedHit * absSpeed * 0.004 * spinMultiplier * (isP1 ? 1 : -1);
        this.spin.y = Math.max(-CONFIG.PHYSICS.maxSpin, Math.min(CONFIG.PHYSICS.maxSpin, this.spin.y));

        // ==================== HIZ HESAPLAMA ====================
        this.vx *= -1;

        // Hız artışı
        let speedBoost = 1.1 + absSpeed * 0.015;

        // Power shot
        if (isPowerShot) {
            speedBoost *= CONFIG.POWER_SHOT.speedMultiplier;
            this.spin.x *= CONFIG.POWER_SHOT.spinMultiplier;
        }

        this.vx *= speedBoost;

        // Dikey yön
        this.vy += clampedHit * 6;
        this.vy += paddleSpeed * 0.5;

        // Hız limitleri
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        if (speed > CONFIG.PHYSICS.maxBallSpeed) {
            const scale = CONFIG.PHYSICS.maxBallSpeed / speed;
            this.vx *= scale;
            this.vy *= scale;
        }
        if (speed < CONFIG.PHYSICS.minBallSpeed) {
            const scale = CONFIG.PHYSICS.minBallSpeed / speed;
            this.vx *= scale;
            this.vy *= scale;
        }

        // Yön garantisi
        if (isP1 && this.vx < 0) this.vx = Math.abs(this.vx);
        if (!isP1 && this.vx > 0) this.vx = -Math.abs(this.vx);

        this.lastHitBy = isP1 ? 'p1' : 'p2';

        return { absSpeed, spinMultiplier, isPowerShot };
    },

    isOutLeft() {
        return this.x < -CONFIG.PHYSICS.ballRadius * 3;
    },

    isOutRight(canvasWidth) {
        return this.x > canvasWidth + CONFIG.PHYSICS.ballRadius * 3;
    },

    render(ctx) {
        const r = CONFIG.PHYSICS.ballRadius;

        // Trail
        this.trail.forEach((t, i) => {
            ctx.beginPath();
            ctx.arc(t.x, t.y, r * (i / this.trail.length) * 0.8, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${t.alpha * 0.3})`;
            ctx.fill();
        });

        // Glow
        const glowGradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, r * 3);
        glowGradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
        glowGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.1)');
        glowGradient.addColorStop(1, 'transparent');
        ctx.fillStyle = glowGradient;
        ctx.fillRect(this.x - r * 3, this.y - r * 3, r * 6, r * 6);

        // Top
        ctx.beginPath();
        ctx.arc(this.x, this.y, r, 0, Math.PI * 2);

        const gradient = ctx.createRadialGradient(
            this.x - r * 0.3, this.y - r * 0.3, 0,
            this.x, this.y, r
        );
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(0.7, '#f0f0f0');
        gradient.addColorStop(1, '#cccccc');

        ctx.fillStyle = gradient;
        ctx.fill();

        // Spin göstergesi
        if (Math.abs(this.spin.x) > 0.01 || Math.abs(this.spin.y) > 0.01) {
            ctx.strokeStyle = this.spin.x > 0 ? '#ff6600' : '#00ff66';
            ctx.lineWidth = 2;
            ctx.globalAlpha = Math.min(1, (Math.abs(this.spin.x) + Math.abs(this.spin.y)) * 10);
            ctx.stroke();
            ctx.globalAlpha = 1;
        }
    }
};
