const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Static dosyaları sun
app.use(express.static(__dirname));

// Odalar ve oyuncular
const rooms = new Map();

// Oda sınıfı
class GameRoom {
    constructor(code, hostId) {
        this.code = code;
        this.host = hostId;
        this.guest = null;
        this.gameState = 'waiting';
        this.ball = {
            x: 0.5,
            y: 0.5,
            vx: 0.005,
            vy: 0,
            spin: { x: 0, y: 0 }
        };
        this.paddles = {
            p1: { y: 0.5, vy: 0 },
            p2: { y: 0.5, vy: 0 }
        };
        this.scores = { p1: 0, p2: 0 };
        this.lastUpdate = Date.now();
    }

    isFull() {
        return this.host && this.guest;
    }

    getPlayerRole(socketId) {
        if (socketId === this.host) return 'p1';
        if (socketId === this.guest) return 'p2';
        return null;
    }
}

// Socket.io bağlantı yönetimi
io.on('connection', (socket) => {
    console.log('Oyuncu bağlandı:', socket.id);

    // Oda oluştur
    socket.on('create-room', (callback) => {
        const code = generateRoomCode();
        const room = new GameRoom(code, socket.id);
        rooms.set(code, room);
        
        socket.join(code);
        console.log(`Oda oluşturuldu: ${code} by ${socket.id}`);
        
        callback({ success: true, roomCode: code, role: 'host' });
    });

    // Odaya katıl
    socket.on('join-room', (roomCode, callback) => {
        const room = rooms.get(roomCode);
        
        if (!room) {
            callback({ success: false, error: 'Oda bulunamadı!' });
            return;
        }
        
        if (room.isFull()) {
            callback({ success: false, error: 'Oda dolu!' });
            return;
        }
        
        room.guest = socket.id;
        socket.join(roomCode);
        
        console.log(`Oyuncu katıldı: ${socket.id} -> ${roomCode}`);
        
        // Host'a bildir
        io.to(room.host).emit('opponent-joined', { opponentId: socket.id });
        
        callback({ success: true, roomCode: roomCode, role: 'guest' });
        
        // Oyunu başlat
        setTimeout(() => {
            startGame(roomCode);
        }, 2000);
    });

    // Raket pozisyonu güncelleme
    socket.on('paddle-move', (data) => {
        const { roomCode, y, vy } = data;
        const room = rooms.get(roomCode);
        
        if (!room) return;
        
        const role = room.getPlayerRole(socket.id);
        if (!role) return;
        
        room.paddles[role].y = y;
        room.paddles[role].vy = vy;
        
        // Rakibe bildir
        socket.to(roomCode).emit('opponent-move', {
            y: y,
            vy: vy,
            role: role
        });
    });

    // Top vurma (client-side prediction için)
    socket.on('ball-hit', (data) => {
        const { roomCode, ballState } = data;
        const room = rooms.get(roomCode);
        
        if (!room) return;
        
        // Top durumunu güncelle ve sync et
        room.ball = ballState;
        io.to(roomCode).emit('ball-update', ballState);
    });

    // Skor güncelleme
    socket.on('score-update', (data) => {
        const { roomCode, scorer } = data;
        const room = rooms.get(roomCode);
        
        if (!room) return;
        
        room.scores[scorer]++;
        
        io.to(roomCode).emit('score-changed', {
            scores: room.scores,
            scorer: scorer
        });
        
        // Kazanan kontrolü
        if (room.scores[scorer] >= 11) {
            io.to(roomCode).emit('game-over', {
                winner: scorer,
                scores: room.scores
            });
            room.gameState = 'ended';
        }
    });

    // Bağlantı kopması
    socket.on('disconnect', () => {
        console.log('Oyuncu ayrıldı:', socket.id);
        
        // Oyuncunun odalarını bul ve temizle
        rooms.forEach((room, code) => {
            if (room.host === socket.id || room.guest === socket.id) {
                io.to(code).emit('opponent-disconnected');
                rooms.delete(code);
                console.log(`Oda silindi: ${code}`);
            }
        });
    });

    // Ping/Pong için latency ölçümü
    socket.on('ping-check', (timestamp, callback) => {
        callback(timestamp);
    });
});

// Oyunu başlat
function startGame(roomCode) {
    const room = rooms.get(roomCode);
    if (!room || !room.isFull()) return;
    
    room.gameState = 'playing';
    
    // Countdown
    let count = 3;
    const countdown = setInterval(() => {
        io.to(roomCode).emit('countdown', count);
        count--;
        
        if (count < 0) {
            clearInterval(countdown);
            io.to(roomCode).emit('game-start');
            
            // Server-side game loop başlat
            startGameLoop(roomCode);
        }
    }, 1000);
}

// Server-side game loop (authoritative)
function startGameLoop(roomCode) {
    const room = rooms.get(roomCode);
    if (!room) return;
    
    const gameLoop = setInterval(() => {
        if (room.gameState !== 'playing') {
            clearInterval(gameLoop);
            return;
        }
        
        // Top fiziğini server'da hesapla (opsiyonel - daha güvenilir)
        updateBallPhysics(room);
        
        // State'i broadcast et
        io.to(roomCode).emit('game-state', {
            ball: room.ball,
            paddles: room.paddles,
            scores: room.scores,
            timestamp: Date.now()
        });
        
    }, 1000 / 60); // 60 FPS
}

function updateBallPhysics(room) {
    // Bu fonksiyon opsiyonel - client-side prediction ile de çalışabilir
    // Server authoritative olması için burası aktif edilebilir
}

// Oda kodu oluştur
function generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code;
    do {
        code = '';
        for (let i = 0; i < 4; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
    } while (rooms.has(code));
    return code;
}

// Oda temizleme (eski odaları sil)
setInterval(() => {
    const now = Date.now();
    rooms.forEach((room, code) => {
        if (now - room.lastUpdate > 300000) { // 5 dakika
            rooms.delete(code);
            console.log(`Eski oda temizlendi: ${code}`);
        }
    });
}, 60000);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🏓 Ping Pong Server çalışıyor: http://localhost:${PORT}`);
});
