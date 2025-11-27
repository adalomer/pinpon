// ==================== RENDERER ====================

const Renderer = {
    drawBackground(ctx, canvasWidth, canvasHeight) {
        // Grid
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
        ctx.lineWidth = 1;

        const gridSize = 50;
        for (let x = 0; x < canvasWidth; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvasHeight);
            ctx.stroke();
        }
        for (let y = 0; y < canvasHeight; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvasWidth, y);
            ctx.stroke();
        }

        // Sol kenar
        const leftGrad = ctx.createLinearGradient(0, 0, 120, 0);
        leftGrad.addColorStop(0, 'rgba(0, 245, 255, 0.12)');
        leftGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = leftGrad;
        ctx.fillRect(0, 0, 120, canvasHeight);

        // Sağ kenar
        const rightGrad = ctx.createLinearGradient(canvasWidth, 0, canvasWidth - 120, 0);
        rightGrad.addColorStop(0, 'rgba(255, 0, 255, 0.12)');
        rightGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = rightGrad;
        ctx.fillRect(canvasWidth - 120, 0, 120, canvasHeight);
    },

    drawCenterLine(ctx, canvasWidth, canvasHeight) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 4;
        ctx.setLineDash([20, 15]);
        ctx.beginPath();
        ctx.moveTo(canvasWidth / 2, 0);
        ctx.lineTo(canvasWidth / 2, canvasHeight);
        ctx.stroke();
        ctx.setLineDash([]);
    },

    drawSpinIndicator(ctx, ball, canvasWidth) {
        const spinMag = Math.abs(ball.spin.x) + Math.abs(ball.spin.y);
        if (spinMag < 0.005) return;

        // Sol üst köşe
        const x = 30;
        const y = 80;

        ctx.fillStyle = '#fff';
        ctx.font = '14px Orbitron, Arial';
        ctx.textAlign = 'left';
        ctx.fillText('FALSO', x, y);

        // Spin barı
        const barWidth = 100;
        const barHeight = 8;
        const spinPercent = Math.min(1, spinMag / CONFIG.PHYSICS.maxSpin);

        ctx.fillStyle = '#333';
        ctx.fillRect(x, y + 8, barWidth, barHeight);

        const spinColor = ball.spin.x > 0 ? '#ff6600' : '#00ff66';
        ctx.fillStyle = spinColor;
        ctx.shadowColor = spinColor;
        ctx.shadowBlur = 10;
        ctx.fillRect(x, y + 8, barWidth * spinPercent, barHeight);
        ctx.shadowBlur = 0;

        // Yön
        ctx.fillStyle = '#888';
        ctx.font = '11px Arial';
        const direction = ball.spin.x > 0 ? '↓ Topspin' : '↑ Backspin';
        ctx.fillText(direction, x, y + 30);
    }
};
