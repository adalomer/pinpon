// ==================== 3D PING PONG - REALISTIC ====================

let scene, camera, renderer;
let table, net, ball, paddle, opponentPaddle;
let gameState = 'menu';
let gameMode = 'bot';
let roomCode = '';
let servingPlayer = 'player';
let serveCount = 0;
let servePhase = 0; // 0: holding, 1: tossed, 2: hit

// Table dimensions (meters)
const TABLE = {
    length: 2.74,
    width: 1.525,
    height: 0.76,
    netHeight: 0.1525
};

// Physics
const PHYSICS = {
    gravity: -9.8,
    ballRadius: 0.02,
    paddleRadius: 0.085,
    bounceFactor: 0.9,
    spinFactor: 0.4,
    airResistance: 0.998
};

// Ball
let ballPos = { x: 0, y: TABLE.height + 0.2, z: 0.8 };
let ballVel = { x: 0, y: 0, z: 0 };
let ballSpin = { x: 0, y: 0, z: 0 };
let mustBounceOnMySide = true;
let bouncedOnMySide = false;
let bouncedOnOpponentSide = false;

// Paddle
let paddlePos = { x: 0, y: TABLE.height + 0.12, z: TABLE.length / 2 + 0.15 };
let paddlePrev = { x: 0, y: TABLE.height + 0.12 };
let paddleVel = { x: 0, y: 0 };

// Opponent
let oppPos = { x: 0, y: TABLE.height + 0.12, z: -TABLE.length / 2 - 0.15 };
let oppTarget = { x: 0, y: TABLE.height + 0.12 };

// Mouse
let mouse = { x: 0, y: 0, rawX: 0, rawY: 0 };

// Score
let scores = { player: 0, opponent: 0 };
const WIN_SCORE = 11;

// Audio
let audioCtx = null;

// ==================== INITIALIZATION ====================
function init() {
    console.log('Initializing 3D Ping Pong...');
    
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    
    // Camera - behind player view
    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, TABLE.height + 0.8, TABLE.length / 2 + 2);
    camera.lookAt(0, TABLE.height, -0.5);
    
    // Renderer
    const canvas = document.getElementById('game-canvas');
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    createScene();
    setupEvents();
    animate();
    
    console.log('Game ready!');
}

function createScene() {
    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambient);
    
    const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
    mainLight.position.set(3, 8, 5);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 20;
    mainLight.shadow.camera.left = -5;
    mainLight.shadow.camera.right = 5;
    mainLight.shadow.camera.top = 5;
    mainLight.shadow.camera.bottom = -5;
    scene.add(mainLight);
    
    const backLight = new THREE.DirectionalLight(0x6688ff, 0.3);
    backLight.position.set(-2, 4, -5);
    scene.add(backLight);
    
    // Floor
    const floorGeo = new THREE.PlaneGeometry(20, 20);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x2a2a4a });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = true;
    scene.add(floor);
    
    // Back wall
    const wallGeo = new THREE.PlaneGeometry(20, 10);
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x1a1a3a });
    const wall = new THREE.Mesh(wallGeo, wallMat);
    wall.position.set(0, 5, -6);
    scene.add(wall);
    
    // Table
    createTable();
    
    // Net - VISIBLE
    createNet();
    
    // Ball
    createBall();
    
    // Paddles
    createPaddles();
}

function createTable() {
    // Table top
    const tableGeo = new THREE.BoxGeometry(TABLE.width, 0.03, TABLE.length);
    const tableMat = new THREE.MeshStandardMaterial({ 
        color: 0x0d6b32, 
        roughness: 0.4,
        metalness: 0.1
    });
    table = new THREE.Mesh(tableGeo, tableMat);
    table.position.set(0, TABLE.height, 0);
    table.receiveShadow = true;
    table.castShadow = true;
    scene.add(table);
    
    // White lines
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    
    // Center line
    const centerLine = new THREE.Mesh(
        new THREE.BoxGeometry(0.02, 0.005, TABLE.length),
        lineMat
    );
    centerLine.position.set(0, TABLE.height + 0.02, 0);
    scene.add(centerLine);
    
    // End lines
    [-1, 1].forEach(side => {
        const endLine = new THREE.Mesh(
            new THREE.BoxGeometry(TABLE.width + 0.04, 0.005, 0.02),
            lineMat
        );
        endLine.position.set(0, TABLE.height + 0.02, side * TABLE.length / 2);
        scene.add(endLine);
    });
    
    // Side lines
    [-1, 1].forEach(side => {
        const sideLine = new THREE.Mesh(
            new THREE.BoxGeometry(0.02, 0.005, TABLE.length + 0.04),
            lineMat
        );
        sideLine.position.set(side * TABLE.width / 2, TABLE.height + 0.02, 0);
        scene.add(sideLine);
    });
    
    // Table legs
    const legGeo = new THREE.BoxGeometry(0.05, TABLE.height, 0.05);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
    [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([x, z]) => {
        const leg = new THREE.Mesh(legGeo, legMat);
        leg.position.set(
            x * (TABLE.width / 2 - 0.1),
            TABLE.height / 2,
            z * (TABLE.length / 2 - 0.2)
        );
        leg.castShadow = true;
        scene.add(leg);
    });
}

function createNet() {
    // Net posts - TALL AND VISIBLE
    const postGeo = new THREE.CylinderGeometry(0.015, 0.015, TABLE.netHeight + 0.05);
    const postMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.5 });
    
    [-1, 1].forEach(side => {
        const post = new THREE.Mesh(postGeo, postMat);
        post.position.set(
            side * (TABLE.width / 2 + 0.02),
            TABLE.height + (TABLE.netHeight + 0.05) / 2,
            0
        );
        post.castShadow = true;
        scene.add(post);
    });
    
    // Net mesh - WHITE AND VISIBLE
    const netGeo = new THREE.BoxGeometry(TABLE.width + 0.04, TABLE.netHeight, 0.01);
    const netMat = new THREE.MeshStandardMaterial({ 
        color: 0xffffff,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide
    });
    net = new THREE.Mesh(netGeo, netMat);
    net.position.set(0, TABLE.height + TABLE.netHeight / 2 + 0.015, 0);
    scene.add(net);
    
    // Net top line
    const topLineGeo = new THREE.BoxGeometry(TABLE.width + 0.04, 0.015, 0.015);
    const topLineMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const topLine = new THREE.Mesh(topLineGeo, topLineMat);
    topLine.position.set(0, TABLE.height + TABLE.netHeight + 0.02, 0);
    scene.add(topLine);
}

function createBall() {
    const ballGeo = new THREE.SphereGeometry(PHYSICS.ballRadius, 32, 32);
    const ballMat = new THREE.MeshStandardMaterial({ 
        color: 0xff6600,
        emissive: 0xff3300,
        emissiveIntensity: 0.3,
        roughness: 0.3
    });
    ball = new THREE.Mesh(ballGeo, ballMat);
    ball.castShadow = true;
    ball.position.set(ballPos.x, ballPos.y, ballPos.z);
    scene.add(ball);
}

function createPaddles() {
    // Player paddle - RED with rubber texture look
    const paddleGeo = new THREE.CylinderGeometry(PHYSICS.paddleRadius, PHYSICS.paddleRadius, 0.01, 32);
    const playerMat = new THREE.MeshStandardMaterial({ 
        color: 0xcc0000,
        roughness: 0.6,
        metalness: 0.1
    });
    paddle = new THREE.Mesh(paddleGeo, playerMat);
    paddle.rotation.x = Math.PI / 2;
    paddle.castShadow = true;
    scene.add(paddle);
    
    // Handle
    const handleGeo = new THREE.CylinderGeometry(0.012, 0.018, 0.08, 16);
    const handleMat = new THREE.MeshStandardMaterial({ color: 0x4a3020 });
    const handle = new THREE.Mesh(handleGeo, handleMat);
    handle.rotation.x = Math.PI / 2;
    handle.position.z = 0.05;
    paddle.add(handle);
    
    // Opponent paddle - BLUE
    const oppMat = new THREE.MeshStandardMaterial({ 
        color: 0x0066cc,
        roughness: 0.6,
        metalness: 0.1
    });
    opponentPaddle = new THREE.Mesh(paddleGeo.clone(), oppMat);
    opponentPaddle.rotation.x = Math.PI / 2;
    opponentPaddle.castShadow = true;
    scene.add(opponentPaddle);
    
    const oppHandle = new THREE.Mesh(handleGeo.clone(), handleMat);
    oppHandle.rotation.x = Math.PI / 2;
    oppHandle.position.z = -0.05;
    opponentPaddle.add(oppHandle);
}

// ==================== EVENTS ====================
function setupEvents() {
    document.addEventListener('mousemove', (e) => {
        mouse.rawX = e.clientX;
        mouse.rawY = e.clientY;
        mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    });
    
    document.addEventListener('click', () => {
        initAudio();
        if (gameState === 'serving' && servingPlayer === 'player') {
            if (servePhase === 0) {
                // Toss the ball up
                tossBall();
            }
        }
    });
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') togglePause();
        if (e.key === ' ' && gameState === 'serving' && servingPlayer === 'player' && servePhase === 0) {
            tossBall();
        }
    });
    
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

// ==================== GAME LOGIC ====================
function startGame() {
    console.log('Starting game...');
    document.getElementById('menu-screen').style.display = 'none';
    document.getElementById('lobby-screen').style.display = 'none';
    document.getElementById('pause-menu').style.display = 'none';
    document.getElementById('game-screen').style.display = 'block';
    document.getElementById('game-canvas').classList.add('active');
    
    scores = { player: 0, opponent: 0 };
    updateScoreDisplay();
    
    servingPlayer = 'player'; // Always start with player serve
    serveCount = 0;
    prepareServe();
}

function prepareServe() {
    gameState = 'serving';
    servePhase = 0;
    mustBounceOnMySide = true;
    bouncedOnMySide = false;
    bouncedOnOpponentSide = false;
    
    if (servingPlayer === 'player') {
        // Ball in front of paddle, ready for toss
        ballPos = { 
            x: 0, 
            y: TABLE.height + 0.15, 
            z: TABLE.length / 2 - 0.2 // In front on MY side of table
        };
        ballVel = { x: 0, y: 0, z: 0 };
        ballSpin = { x: 0, y: 0, z: 0 };
        showMessage('🏓 SPACE veya TIKLA - Topu at!', 3000);
    } else {
        // Opponent serves
        ballPos = { 
            x: oppPos.x, 
            y: TABLE.height + 0.15, 
            z: -TABLE.length / 2 + 0.2 
        };
        ballVel = { x: 0, y: 0, z: 0 };
        showMessage('🤖 Rakip servis...', 1000);
        setTimeout(() => {
            if (gameState === 'serving') opponentServe();
        }, 1200);
    }
    
    ball.position.set(ballPos.x, ballPos.y, ballPos.z);
}

function tossBall() {
    if (servePhase !== 0) return;
    servePhase = 1;
    
    // Toss ball up
    ballVel = { x: 0, y: 3, z: 0 };
    playSound('toss');
    showMessage('Raketle vur!', 1500);
}

function playerServeHit() {
    servePhase = 2;
    gameState = 'playing';
    playSound('hit');
    
    // Calculate spin from paddle movement
    const spinX = paddleVel.y * 2;  // Topspin/backspin from vertical movement
    const spinZ = paddleVel.x * 2;  // Sidespin from horizontal movement
    
    // Ball goes DOWN to bounce on MY side first, then over net
    ballVel = {
        x: paddleVel.x * 0.5 + (Math.random() - 0.5) * 0.5,
        y: -2,  // Downward to hit my side
        z: -3   // Toward opponent but slow
    };
    
    ballSpin = { x: spinX, y: 0, z: spinZ };
    mustBounceOnMySide = true;
    bouncedOnMySide = false;
    bouncedOnOpponentSide = false;
}

function opponentServe() {
    servePhase = 2;
    gameState = 'playing';
    playSound('hit');
    
    // Opponent serve - bounces on their side, then comes to player
    ballVel = {
        x: (Math.random() - 0.5) * 2,
        y: -2,
        z: 3
    };
    
    ballSpin = { 
        x: (Math.random() - 0.5) * 3, 
        y: 0, 
        z: (Math.random() - 0.5) * 3 
    };
    
    mustBounceOnMySide = false; // Opponent's serve bounces on their side first
    bouncedOnMySide = false;
    bouncedOnOpponentSide = false;
}

function update(dt) {
    if (!dt || dt > 0.1) dt = 0.016;
    
    // Update paddle position
    updatePaddle(dt);
    
    // Update opponent
    updateOpponent(dt);
    
    // Update ball
    if (gameState === 'playing') {
        updateBall(dt);
    } else if (gameState === 'serving') {
        if (servingPlayer === 'player') {
            if (servePhase === 0) {
                // Ball follows in front of paddle
                ballPos.x = paddlePos.x * 0.5;
                ballPos.z = TABLE.length / 2 - 0.2;
            } else if (servePhase === 1) {
                // Ball tossed - apply physics
                ballVel.y += PHYSICS.gravity * dt;
                ballPos.y += ballVel.y * dt;
                
                // Check if paddle hits tossed ball
                const dist = Math.sqrt(
                    (ballPos.x - paddlePos.x) ** 2 +
                    (ballPos.y - paddlePos.y) ** 2 +
                    (ballPos.z - paddlePos.z) ** 2
                );
                
                if (dist < PHYSICS.paddleRadius + PHYSICS.ballRadius + 0.02) {
                    playerServeHit();
                }
                
                // Ball fell too low - reset serve
                if (ballPos.y < TABLE.height) {
                    prepareServe();
                }
            }
        }
    }
    
    // Update 3D positions
    paddle.position.set(paddlePos.x, paddlePos.y, paddlePos.z);
    opponentPaddle.position.set(oppPos.x, oppPos.y, oppPos.z);
    ball.position.set(ballPos.x, ballPos.y, ballPos.z);
    
    // Ball rotation from spin
    if (ball) {
        ball.rotation.x += ballSpin.x * dt * 2;
        ball.rotation.z += ballSpin.z * dt * 2;
    }
}

function updatePaddle(dt) {
    // Store previous
    paddlePrev.x = paddlePos.x;
    paddlePrev.y = paddlePos.y;
    
    // Target from mouse - CONSTRAINED to reachable area
    const targetX = mouse.x * (TABLE.width / 2 + 0.1);
    const targetY = TABLE.height + 0.05 + (mouse.y + 1) * 0.2;
    
    // Smooth movement
    paddlePos.x += (targetX - paddlePos.x) * 0.25;
    paddlePos.y += (targetY - paddlePos.y) * 0.25;
    
    // Clamp
    paddlePos.x = Math.max(-TABLE.width / 2 - 0.1, Math.min(TABLE.width / 2 + 0.1, paddlePos.x));
    paddlePos.y = Math.max(TABLE.height + 0.03, Math.min(TABLE.height + 0.4, paddlePos.y));
    
    // Calculate velocity for spin
    paddleVel.x = (paddlePos.x - paddlePrev.x) / dt;
    paddleVel.y = (paddlePos.y - paddlePrev.y) / dt;
}

function updateOpponent(dt) {
    if (gameState !== 'playing') return;
    
    // Predict where ball will arrive
    if (ballVel.z > 0) {
        // Ball coming toward player, opponent returns to center
        oppTarget.x = 0;
        oppTarget.y = TABLE.height + 0.12;
    } else {
        // Ball going to opponent
        const timeToArrive = Math.abs((oppPos.z - ballPos.z) / ballVel.z);
        if (timeToArrive < 2) {
            oppTarget.x = ballPos.x + ballVel.x * timeToArrive * 0.8;
            // Add some prediction error
            oppTarget.x += (Math.random() - 0.5) * 0.1;
        }
    }
    
    // Move toward target
    const speed = 2.5;
    const dx = oppTarget.x - oppPos.x;
    const dy = oppTarget.y - oppPos.y;
    
    oppPos.x += Math.sign(dx) * Math.min(Math.abs(dx), speed * dt);
    oppPos.y += Math.sign(dy) * Math.min(Math.abs(dy), speed * dt);
    
    // Clamp
    oppPos.x = Math.max(-TABLE.width / 2, Math.min(TABLE.width / 2, oppPos.x));
    oppPos.y = Math.max(TABLE.height + 0.05, Math.min(TABLE.height + 0.35, oppPos.y));
}

function updateBall(dt) {
    // Gravity
    ballVel.y += PHYSICS.gravity * dt;
    
    // Air resistance
    ballVel.x *= PHYSICS.airResistance;
    ballVel.z *= PHYSICS.airResistance;
    
    // Spin effect (Magnus)
    ballVel.x += ballSpin.z * PHYSICS.spinFactor * dt;
    ballVel.z -= ballSpin.x * PHYSICS.spinFactor * dt;
    
    // Decay spin
    ballSpin.x *= 0.995;
    ballSpin.z *= 0.995;
    
    // Update position
    ballPos.x += ballVel.x * dt;
    ballPos.y += ballVel.y * dt;
    ballPos.z += ballVel.z * dt;
    
    // Table bounce
    if (ballPos.y <= TABLE.height + PHYSICS.ballRadius && ballVel.y < 0) {
        if (Math.abs(ballPos.x) <= TABLE.width / 2 + 0.02 && 
            Math.abs(ballPos.z) <= TABLE.length / 2 + 0.02) {
            
            ballPos.y = TABLE.height + PHYSICS.ballRadius;
            ballVel.y = -ballVel.y * PHYSICS.bounceFactor;
            
            // Track bounces
            if (ballPos.z > 0) {
                bouncedOnMySide = true;
            } else {
                bouncedOnOpponentSide = true;
            }
            
            // Apply spin on bounce
            ballVel.x += ballSpin.z * 0.15;
            ballVel.z -= ballSpin.x * 0.15;
            
            playSound('bounce');
        }
    }
    
    // Net collision
    if (Math.abs(ballPos.z) < 0.03 && 
        ballPos.y < TABLE.height + TABLE.netHeight + PHYSICS.ballRadius &&
        ballPos.y > TABLE.height) {
        
        playSound('net');
        ballVel.z *= -0.4;
        ballVel.y = Math.abs(ballVel.y) * 0.3;
        ballPos.z = Math.sign(ballPos.z) * 0.04;
    }
    
    // Player paddle collision
    const pDist = Math.sqrt(
        (ballPos.x - paddlePos.x) ** 2 +
        (ballPos.y - paddlePos.y) ** 2 +
        (ballPos.z - paddlePos.z) ** 2
    );
    
    if (pDist < PHYSICS.paddleRadius + PHYSICS.ballRadius && ballVel.z > 0) {
        playSound('hit');
        
        // Hit position affects direction
        const hitX = (ballPos.x - paddlePos.x) / PHYSICS.paddleRadius;
        const hitY = (ballPos.y - paddlePos.y) / PHYSICS.paddleRadius;
        
        // Calculate new velocity based on paddle movement and hit position
        const power = Math.min(Math.sqrt(paddleVel.x ** 2 + paddleVel.y ** 2) * 0.3 + 4, 10);
        
        ballVel.x = hitX * 3 + paddleVel.x * 0.4;
        ballVel.y = 2 + hitY * 2 + paddleVel.y * 0.3;
        ballVel.z = -power;
        
        // Spin from paddle movement
        ballSpin.x = paddleVel.y * PHYSICS.spinFactor * 3;
        ballSpin.z = paddleVel.x * PHYSICS.spinFactor * 3;
        
        // Reset tracking
        bouncedOnMySide = false;
        bouncedOnOpponentSide = false;
        mustBounceOnMySide = false;
    }
    
    // Opponent paddle collision
    const oDist = Math.sqrt(
        (ballPos.x - oppPos.x) ** 2 +
        (ballPos.y - oppPos.y) ** 2 +
        (ballPos.z - oppPos.z) ** 2
    );
    
    if (oDist < PHYSICS.paddleRadius + PHYSICS.ballRadius && ballVel.z < 0) {
        playSound('hit');
        
        const hitX = (ballPos.x - oppPos.x) / PHYSICS.paddleRadius;
        
        // Opponent always aims toward player's reachable area
        const targetX = (Math.random() - 0.5) * TABLE.width * 0.6;
        
        ballVel.x = (targetX - ballPos.x) * 0.8 + (Math.random() - 0.5);
        ballVel.y = 2.5 + Math.random();
        ballVel.z = 4 + Math.random() * 2;
        
        // Random spin
        ballSpin.x = (Math.random() - 0.5) * 4;
        ballSpin.z = (Math.random() - 0.5) * 4;
        
        bouncedOnMySide = false;
        bouncedOnOpponentSide = false;
    }
    
    // Out of bounds checks
    checkOutOfBounds();
}

function checkOutOfBounds() {
    // Ball past player
    if (ballPos.z > TABLE.length / 2 + 0.8) {
        scorePoint('opponent');
        return;
    }
    
    // Ball past opponent
    if (ballPos.z < -TABLE.length / 2 - 0.8) {
        scorePoint('player');
        return;
    }
    
    // Ball fell off table
    if (ballPos.y < TABLE.height - 0.5) {
        // Determine who gets point
        if (ballPos.z > 0) {
            // Fell on player side
            if (mustBounceOnMySide && !bouncedOnMySide) {
                // Server's fault - didn't bounce on own side
                scorePoint('opponent');
            } else if (!bouncedOnMySide && bouncedOnOpponentSide) {
                // Good shot by opponent, player missed
                scorePoint('opponent');
            } else {
                scorePoint('opponent');
            }
        } else {
            // Fell on opponent side
            if (!bouncedOnOpponentSide) {
                // Didn't bounce on opponent side - player's fault
                scorePoint('opponent');
            } else {
                // Bounced and opponent missed
                scorePoint('player');
            }
        }
        return;
    }
    
    // Ball went too far sideways
    if (Math.abs(ballPos.x) > TABLE.width + 1) {
        scorePoint(ballPos.z > 0 ? 'opponent' : 'player');
    }
}

function scorePoint(scorer) {
    if (gameState !== 'playing') return;
    gameState = 'scoring';
    
    scores[scorer]++;
    updateScoreDisplay();
    
    playSound(scorer === 'player' ? 'score' : 'lose');
    showMessage(scorer === 'player' ? '✅ SAYIN!' : '❌ Rakip Sayı!', 1500);
    
    // Check win
    if ((scores.player >= WIN_SCORE || scores.opponent >= WIN_SCORE) && 
        Math.abs(scores.player - scores.opponent) >= 2) {
        endGame();
        return;
    }
    
    // Change serve every 2 points
    serveCount++;
    if (serveCount >= 2) {
        serveCount = 0;
        servingPlayer = servingPlayer === 'player' ? 'opponent' : 'player';
    }
    
    setTimeout(() => {
        if (gameState !== 'menu' && gameState !== 'gameOver') {
            prepareServe();
        }
    }, 2000);
}

function endGame() {
    gameState = 'gameOver';
    const won = scores.player > scores.opponent;
    
    const overlay = document.getElementById('message-overlay');
    overlay.innerHTML = `
        <div style="font-size: 3.5rem; margin-bottom: 20px;">
            ${won ? '🎉 KAZANDIN!' : '😢 KAYBETTİN'}
        </div>
        <div style="font-size: 2rem; color: #888; margin-bottom: 30px;">
            ${scores.player} - ${scores.opponent}
        </div>
        <button class="menu-btn btn-online" onclick="restartGame()">🔄 Tekrar Oyna</button>
        <br><br>
        <button class="menu-btn btn-back" onclick="quitToMenu()">🏠 Ana Menü</button>
    `;
    overlay.style.display = 'block';
    
    playSound(won ? 'win' : 'lose');
}

function showMessage(text, duration) {
    const overlay = document.getElementById('message-overlay');
    overlay.innerHTML = `<div style="font-size: 2rem; text-shadow: 0 0 20px rgba(0,245,255,0.8);">${text}</div>`;
    overlay.style.display = 'block';
    
    if (duration) {
        setTimeout(() => {
            if (gameState !== 'gameOver') {
                overlay.style.display = 'none';
            }
        }, duration);
    }
}

function updateScoreDisplay() {
    document.getElementById('score-p1').textContent = scores.player;
    document.getElementById('score-p2').textContent = scores.opponent;
}

function togglePause() {
    if (gameState === 'playing') {
        gameState = 'paused';
        document.getElementById('pause-menu').style.display = 'flex';
    } else if (gameState === 'paused') {
        gameState = 'playing';
        document.getElementById('pause-menu').style.display = 'none';
    }
}

// ==================== AUDIO ====================
function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function playSound(type) {
    if (!audioCtx) return;
    
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    const sounds = {
        hit: { freq: 800, dur: 0.08, type: 'sine' },
        bounce: { freq: 500, dur: 0.06, type: 'sine' },
        net: { freq: 200, dur: 0.15, type: 'triangle' },
        score: { freq: 700, dur: 0.2, type: 'sine' },
        lose: { freq: 250, dur: 0.3, type: 'sawtooth' },
        win: { freq: 880, dur: 0.4, type: 'sine' },
        toss: { freq: 400, dur: 0.1, type: 'sine' }
    };
    
    const s = sounds[type] || sounds.hit;
    osc.frequency.value = s.freq;
    osc.type = s.type;
    gain.gain.value = 0.2;
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + s.dur);
    
    osc.start();
    osc.stop(audioCtx.currentTime + s.dur + 0.1);
}

// ==================== MENU FUNCTIONS ====================
function showLobby() {
    document.getElementById('menu-screen').style.display = 'none';
    document.getElementById('lobby-screen').style.display = 'flex';
    initAudio();
}

function backToMenu() {
    document.getElementById('lobby-screen').style.display = 'none';
    document.getElementById('menu-screen').style.display = 'flex';
    document.getElementById('create-room-section').style.display = 'block';
    document.getElementById('room-created-section').style.display = 'none';
}

function createRoom() {
    roomCode = generateRoomCode();
    document.getElementById('create-room-section').style.display = 'none';
    document.getElementById('room-created-section').style.display = 'block';
    document.getElementById('room-code').textContent = roomCode;
    localStorage.setItem('pp3d_' + roomCode, JSON.stringify({ host: Date.now() }));
    checkForPlayer();
}

function joinRoom() {
    const code = document.getElementById('join-room-input').value.toUpperCase();
    if (code.length !== 4) { alert('4 haneli kod girin!'); return; }
    const room = localStorage.getItem('pp3d_' + code);
    if (!room) { alert('Oda bulunamadı!'); return; }
    const data = JSON.parse(room);
    if (data.guest) { alert('Oda dolu!'); return; }
    data.guest = Date.now();
    localStorage.setItem('pp3d_' + code, JSON.stringify(data));
    roomCode = code;
    gameMode = 'online';
    document.getElementById('waiting-text').textContent = 'Bağlanıldı!';
    setTimeout(startGame, 1000);
}

function copyRoomCode() {
    navigator.clipboard.writeText(roomCode);
    const btn = document.querySelector('.copy-btn');
    btn.textContent = '✅ Kopyalandı!';
    setTimeout(() => btn.textContent = '📋 Kopyala', 2000);
}

function startBotGame() {
    gameMode = 'bot';
    initAudio();
    document.getElementById('p1-name').textContent = 'SEN';
    document.getElementById('p2-name').textContent = 'BOT';
    startGame();
}

function startPractice() {
    gameMode = 'bot';
    initAudio();
    document.getElementById('p1-name').textContent = 'SEN';
    document.getElementById('p2-name').textContent = 'ANTRENMAN';
    startGame();
}

function restartGame() {
    document.getElementById('message-overlay').style.display = 'none';
    scores = { player: 0, opponent: 0 };
    updateScoreDisplay();
    servingPlayer = 'player';
    serveCount = 0;
    prepareServe();
}

function quitToMenu() {
    gameState = 'menu';
    document.getElementById('game-screen').style.display = 'none';
    document.getElementById('message-overlay').style.display = 'none';
    document.getElementById('pause-menu').style.display = 'none';
    document.getElementById('menu-screen').style.display = 'flex';
    document.getElementById('game-canvas').classList.remove('active');
}

function resumeGame() {
    gameState = 'playing';
    document.getElementById('pause-menu').style.display = 'none';
}

function quitGame() { quitToMenu(); }

function generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
}

function checkForPlayer() {
    if (gameState !== 'menu') return;
    const room = localStorage.getItem('pp3d_' + roomCode);
    if (room) {
        const data = JSON.parse(room);
        if (data.guest) {
            document.getElementById('waiting-text').textContent = 'Rakip bulundu!';
            gameMode = 'online';
            setTimeout(startGame, 1000);
            return;
        }
    }
    setTimeout(checkForPlayer, 500);
}

// ==================== EXPOSE GLOBALLY ====================
window.showLobby = showLobby;
window.backToMenu = backToMenu;
window.createRoom = createRoom;
window.joinRoom = joinRoom;
window.copyRoomCode = copyRoomCode;
window.startBotGame = startBotGame;
window.startPractice = startPractice;
window.restartGame = restartGame;
window.quitToMenu = quitToMenu;
window.resumeGame = resumeGame;
window.quitGame = quitGame;

// ==================== ANIMATION LOOP ====================
let lastTime = 0;

function animate(time) {
    requestAnimationFrame(animate);
    
    const dt = Math.min((time - lastTime) / 1000, 0.05) || 0.016;
    lastTime = time;
    
    update(dt);
    
    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }
}

// ==================== START ====================
function setupButtons() {
    console.log('Setting up buttons...');
    
    // Menu buttons
    const btnOnline = document.getElementById('btn-online');
    const btnBot = document.getElementById('btn-bot');
    const btnPractice = document.getElementById('btn-practice');
    
    if (btnOnline) {
        btnOnline.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Online clicked');
            showLobby();
        });
    }
    
    if (btnBot) {
        btnBot.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Bot clicked');
            startBotGame();
        });
    }
    
    if (btnPractice) {
        btnPractice.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Practice clicked');
            startPractice();
        });
    }
    
    console.log('Buttons ready!');
}

function initGame() {
    console.log('Initializing everything...');
    init();
    setupButtons();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGame);
} else {
    initGame();
}
