// ==================== PARTICLE SYSTEM ====================

const ParticleSystem = {
    particles: [],
    spinParticles: [],

    create(x, y, color, count, options = {}) {
        const {
            speedMin = 3,
            speedMax = 12,
            sizeMin = 3,
            sizeMax = 8,
            lifetime = 1
        } = options;

        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * (speedMax - speedMin) + speedMin;

            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: Math.random() * (sizeMax - sizeMin) + sizeMin,
                color: color,
                alpha: 1,
                decay: 0.02 + Math.random() * 0.02
            });
        }
    },

    createSpinEffect(x, y, color, count, direction) {
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const speed = 4 + Math.random() * 4;

            this.spinParticles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed * direction,
                vy: Math.sin(angle) * speed,
                size: 3 + Math.random() * 3,
                color: color,
                alpha: 1,
                rotation: angle,
                decay: 0.03
            });
        }
    },

    createHitEffect(x, y, color, power = 1) {
        // Ana patlama
        this.create(x, y, color, Math.floor(15 * power), {
            speedMin: 5 * power,
            speedMax: 15 * power,
            sizeMin: 4,
            sizeMax: 10
        });

        // Kıvılcımlar
        this.create(x, y, '#fff', Math.floor(8 * power), {
            speedMin: 8 * power,
            speedMax: 20 * power,
            sizeMin: 2,
            sizeMax: 4
        });
    },

    createPowerHitEffect(x, y) {
        // Büyük patlama
        this.create(x, y, '#ffff00', 30, {
            speedMin: 10,
            speedMax: 25,
            sizeMin: 5,
            sizeMax: 15
        });

        // Kırmızı kıvılcımlar
        this.create(x, y, '#ff4400', 20, {
            speedMin: 8,
            speedMax: 20,
            sizeMin: 3,
            sizeMax: 8
        });

        // Beyaz çekirdek
        this.create(x, y, '#ffffff', 15, {
            speedMin: 15,
            speedMax: 30,
            sizeMin: 2,
            sizeMax: 5
        });
    },

    update() {
        // Normal particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vx *= 0.96;
            p.vy *= 0.96;
            p.alpha -= p.decay;
            p.size *= 0.97;

            if (p.alpha <= 0 || p.size < 0.5) {
                this.particles.splice(i, 1);
            }
        }

        // Spin particles
        for (let i = this.spinParticles.length - 1; i >= 0; i--) {
            const p = this.spinParticles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.rotation += 0.2;
            p.alpha -= p.decay;
            p.size *= 0.95;

            if (p.alpha <= 0) {
                this.spinParticles.splice(i, 1);
            }
        }
    },

    render(ctx) {
        // Normal particles
        this.particles.forEach(p => {
            ctx.save();
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = p.color;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });

        // Spin particles
        this.spinParticles.forEach(p => {
            ctx.save();
            ctx.globalAlpha = p.alpha;
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation);
            ctx.fillStyle = p.color;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 8;
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
            ctx.restore();
        });
    },

    clear() {
        this.particles = [];
        this.spinParticles = [];
    }
};
