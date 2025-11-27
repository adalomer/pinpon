// ==================== BOT AI ====================

const BotAI = {
    difficulty: 0.75,
    reactionDelay: 0,
    targetY: 0,

    update(paddle, ball, canvasHeight) {
        this.reactionDelay--;

        if (this.reactionDelay <= 0) {
            if (ball.vx > 0) {
                // Top bota doğru geliyor
                const timeToReach = Math.abs((paddle.x - ball.x) / ball.vx);

                // Y pozisyonu tahmin et
                let predictedY = ball.y + ball.vy * timeToReach;
                
                // Spin etkisi
                predictedY += ball.spin.x * timeToReach * 60;

                // Duvar sekmeleri
                let bounces = 0;
                while ((predictedY < 0 || predictedY > canvasHeight) && bounces < 5) {
                    if (predictedY < 0) predictedY = -predictedY;
                    if (predictedY > canvasHeight) predictedY = 2 * canvasHeight - predictedY;
                    bounces++;
                }

                // Hata payı
                const errorRange = (1 - this.difficulty) * 100;
                const randomError = (Math.random() - 0.5) * errorRange;

                this.targetY = predictedY + randomError;
            } else {
                // Top uzaklaşıyor - merkeze dön
                this.targetY = canvasHeight / 2 + (Math.random() - 0.5) * 80;
            }

            // Reaksiyon gecikmesi
            this.reactionDelay = Math.floor(4 + (1 - this.difficulty) * 12);
        }

        // Hareketi uygula
        const maxSpeed = 7 + this.difficulty * 7;
        const diff = this.targetY - paddle.y;

        paddle.prevY = paddle.y;

        if (Math.abs(diff) > 3) {
            const moveSpeed = Math.min(Math.abs(diff), maxSpeed);
            const direction = Math.sign(diff);

            // Agresif mod - top yaklaşınca hızlan
            if (this.difficulty > 0.6 && ball.vx > 0 && Math.abs(ball.x - paddle.x) < 250) {
                paddle.y += direction * (moveSpeed + 4);
            } else {
                paddle.y += direction * moveSpeed;
            }
        }

        paddle.vy = paddle.y - paddle.prevY;

        // Sınırlar
        const ph = CONFIG.PHYSICS.paddleHeight;
        paddle.y = Math.max(ph / 2, Math.min(canvasHeight - ph / 2, paddle.y));
    },

    setDifficulty(level) {
        this.difficulty = Math.max(0, Math.min(1, level));
    }
};
