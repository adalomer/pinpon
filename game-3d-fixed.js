// ==================== 3D PING PONG - THREE.JS ====================

// ==================== GLOBAL VARIABLES ====================
let scene, camera, renderer;
let table, net, ball, paddle, opponentPaddle;
let gameState = 'menu';
let gameMode = 'bot';
let isHost = true;
let roomCode = '';

// Physics
const PHYSICS = {
    gravity: -9.8,
    ballRadius: 0.02,
    paddleWidth: 0.15,
    paddleHeight: 0.12,
    tableLength: 2.74,
    tableWidth: 1.525,
    tableHeight: 0.76,
    netHeight: 0.1525,
    bounceFactor: 0.9,
    spinFactor: 0.015,
    airResistance: 0.998,
    maxBallSpeed: 15
};

// Ball state
let ballState = {
    position: new THREE.Vector3(0, PHYSICS.tableHeight + 0.3, 0),
    velocity: new THREE.Vector3(0, 0, 0),
    spin: new THREE.Vector3(0, 0, 0),
    active: true,
    lastHitBy: null
};

// Paddle state
let paddleState = {
    position: new THREE.Vector3(0, PHYSICS.tableHeight + 0.1, PHYSICS.tableLength / 2 - 0.2),
    velocity: new THREE.Vector3(0, 0, 0),
    prevPosition: new THREE.Vector3(0, 0, 0),
    angle: 0
};

let opponentState = {
    position: new THREE.Vector3(0, PHYSICS.tableHeight + 0.1, -PHYSICS.tableLength / 2 + 0.2),
    velocity: new THREE.Vector3(0, 0, 0),
    targetY: 0,
    targetX: 0
};

// Score
let scores = { player: 0, opponent: 0 };
const WIN_SCORE = 11;

// Camera
let cameraTarget = new THREE.Vector3(0, PHYSICS.tableHeight + 0.5, 0);
let cameraOffset = new THREE.Vector3(0, 1.5, 2.5);

// Mouse
let mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
let mouseSpeed = { x: 0, y: 0, prevX: 0, prevY: 0 };

// Effects
let particles = [];
let trailPoints = [];

// Audio
let audioCtx = null;

// Bot AI
let botDifficulty = 0.7;
let botReactionDelay = 0;
let botTargetPos = new THREE.Vector3();

// ==================== INITIALIZATION ====================
function init() {
    console.log('Initializing 3D Ping Pong...');
    
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a1a);
    scene.fog = new THREE.Fog(0x0a0a1a, 5, 15);

    // Camera
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 2, 3.5);
    camera.lookAt(0, PHYSICS.tableHeight, 0);

    // Renderer
    renderer = new THREE.WebGLRenderer({ 
        canvas: document.getElementById('game-canvas'),
        antialias: true 
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Lights
    setupLights();

    // Create game objects
    createTable();
    createNet();
    createBall();
    createPaddles();
    createEnvironment();

    // Events
    window.addEventListener('resize', onWindowResize);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('keydown', onKeyDown);

    console.log('Initialization complete!');
    
    // Start render loop
    animate();
}

function setupLights() {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0x404060, 0.5);
    scene.add(ambientLight);

    // Main spotlight
    const mainLight = new THREE.SpotLight(0xffffff, 1.5);
    mainLight.position.set(0, 5, 0);
    mainLight.angle = Math.PI / 4;
    mainLight.penumbra = 0.5;
    mainLight.decay = 1;
    mainLight.distance = 15;
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 1024;
    mainLight.shadow.mapSize.height = 1024;
    scene.add(mainLight);

    // Cyan accent light (player side)
    const cyanLight = new THREE.PointLight(0x00f5ff, 0.8, 5);
    cyanLight.position.set(0, 1, 2);
    scene.add(cyanLight);

    // Magenta accent light (opponent side)
    const magentaLight = new THREE.PointLight(0xff00ff, 0.8, 5);
    magentaLight.position.set(0, 1, -2);
    scene.add(magentaLight);
}

// ==================== CREATE GAME OBJECTS ====================
function createTable() {
    // Table top
    const tableGeometry = new THREE.BoxGeometry(
        PHYSICS.tableWidth, 
        0.03, 
        PHYSICS.tableLength
    );
    
    const tableMaterial = new THREE.MeshStandardMaterial({
        color: 0x0d4d0d,
        roughness: 0.3,
        metalness: 0.1
    });
    
    table = new THREE.Mesh(tableGeometry, tableMaterial);
    table.position.y = PHYSICS.tableHeight;
    table.receiveShadow = true;
    scene.add(table);

    // White lines
    const lineMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    
    // Center line
    const centerLineGeo = new THREE.BoxGeometry(0.01, 0.001, PHYSICS.tableLength);
    const centerLine = new THREE.Mesh(centerLineGeo, lineMaterial);
    centerLine.position.y = PHYSICS.tableHeight + 0.016;
    scene.add(centerLine);

    // Edge lines
    const edgeLineGeo = new THREE.BoxGeometry(0.02, 0.001, PHYSICS.tableLength);
    
    const leftLine = new THREE.Mesh(edgeLineGeo, lineMaterial);
    leftLine.position.set(-PHYSICS.tableWidth / 2 + 0.01, PHYSICS.tableHeight + 0.016, 0);
    scene.add(leftLine);
    
    const rightLine = new THREE.Mesh(edgeLineGeo, lineMaterial);
    rightLine.position.set(PHYSICS.tableWidth / 2 - 0.01, PHYSICS.tableHeight + 0.016, 0);
    scene.add(rightLine);

    // End lines
    const endLineGeo = new THREE.BoxGeometry(PHYSICS.tableWidth, 0.001, 0.02);
    
    const nearLine = new THREE.Mesh(endLineGeo, lineMaterial);
    nearLine.position.set(0, PHYSICS.tableHeight + 0.016, PHYSICS.tableLength / 2 - 0.01);
    scene.add(nearLine);
    
    const farLine = new THREE.Mesh(endLineGeo, lineMaterial);
    farLine.position.set(0, PHYSICS.tableHeight + 0.016, -PHYSICS.tableLength / 2 + 0.01);
    scene.add(farLine);

    // Table legs
    const legGeometry = new THREE.CylinderGeometry(0.04, 0.04, PHYSICS.tableHeight - 0.02);
    const legMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
    
    const legPositions = [
        [-PHYSICS.tableWidth / 2 + 0.1, -PHYSICS.tableLength / 2 + 0.2],
        [PHYSICS.tableWidth / 2 - 0.1, -PHYSICS.tableLength / 2 + 0.2],
        [-PHYSICS.tableWidth / 2 + 0.1, PHYSICS.tableLength / 2 - 0.2],
        [PHYSICS.tableWidth / 2 - 0.1, PHYSICS.tableLength / 2 - 0.2]
    ];
    
    legPositions.forEach(pos => {
        const leg = new THREE.Mesh(legGeometry, legMaterial);
        leg.position.set(pos[0], (PHYSICS.tableHeight - 0.02) / 2, pos[1]);
        leg.castShadow = true;
        scene.add(leg);
    });
}

function createNet() {
    // Net posts
    const postGeometry = new THREE.CylinderGeometry(0.015, 0.015, PHYSICS.netHeight + 0.02);
    const postMaterial = new THREE.MeshStandardMaterial({ color: 0x888888 });
    
    const leftPost = new THREE.Mesh(postGeometry, postMaterial);
    leftPost.position.set(-PHYSICS.tableWidth / 2 - 0.02, PHYSICS.tableHeight + PHYSICS.netHeight / 2, 0);
    scene.add(leftPost);
    
    const rightPost = new THREE.Mesh(postGeometry, postMaterial);
    rightPost.position.set(PHYSICS.tableWidth / 2 + 0.02, PHYSICS.tableHeight + PHYSICS.netHeight / 2, 0);
    scene.add(rightPost);

    // Net mesh
    const netGeometry = new THREE.PlaneGeometry(PHYSICS.tableWidth + 0.04, PHYSICS.netHeight, 20, 8);
    const netMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide,
        wireframe: true
    });
    
    net = new THREE.Mesh(netGeometry, netMaterial);
    net.position.set(0, PHYSICS.tableHeight + PHYSICS.netHeight / 2 + 0.01, 0);
    net.rotation.y = Math.PI / 2;
    scene.add(net);

    // Top bar
    const barGeometry = new THREE.CylinderGeometry(0.005, 0.005, PHYSICS.tableWidth + 0.04);
    const barMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const topBar = new THREE.Mesh(barGeometry, barMaterial);
    topBar.rotation.z = Math.PI / 2;
    topBar.position.set(0, PHYSICS.tableHeight + PHYSICS.netHeight + 0.01, 0);
    scene.add(topBar);
}

function createBall() {
    const ballGeometry = new THREE.SphereGeometry(PHYSICS.ballRadius, 32, 32);
    const ballMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.2,
        metalness: 0.1,
        emissive: 0xffffff,
        emissiveIntensity: 0.1
    });
    
    ball = new THREE.Mesh(ballGeometry, ballMaterial);
    ball.position.copy(ballState.position);
    ball.castShadow = true;
    scene.add(ball);

    // Ball glow
    const glowGeometry = new THREE.SphereGeometry(PHYSICS.ballRadius * 1.5, 16, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.2
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    ball.add(glow);
}

function createPaddles() {
    // Player paddle
    paddle = new THREE.Group();
    
    // Blade
    const bladeGeometry = new THREE.BoxGeometry(PHYSICS.paddleWidth, 0.01, PHYSICS.paddleHeight);
    const bladeMaterial = new THREE.MeshStandardMaterial({
        color: 0xff0000,
        roughness: 0.8,
        metalness: 0
    });
    const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
    paddle.add(blade);
    
    // Black rubber side
    const blackGeometry = new THREE.BoxGeometry(PHYSICS.paddleWidth, 0.01, PHYSICS.paddleHeight);
    const blackMaterial = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
    const blackRubber = new THREE.Mesh(blackGeometry, blackMaterial);
    blackRubber.position.y = -0.011;
    paddle.add(blackRubber);
    
    // Handle
    const handleGeometry = new THREE.CylinderGeometry(0.015, 0.02, 0.1, 8);
    const handleMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
    const handle = new THREE.Mesh(handleGeometry, handleMaterial);
    handle.rotation.x = Math.PI / 2;
    handle.position.z = PHYSICS.paddleHeight / 2 + 0.05;
    paddle.add(handle);
    
    paddle.position.copy(paddleState.position);
    paddle.castShadow = true;
    scene.add(paddle);

    // Paddle glow
    const paddleGlow = new THREE.PointLight(0x00f5ff, 0.5, 0.5);
    paddle.add(paddleGlow);

    // Opponent paddle
    opponentPaddle = new THREE.Group();
    
    const oppBlade = new THREE.Mesh(bladeGeometry, bladeMaterial);
    opponentPaddle.add(oppBlade);
    
    const oppBlack = new THREE.Mesh(blackGeometry, blackMaterial);
    oppBlack.position.y = -0.011;
    opponentPaddle.add(oppBlack);
    
    const oppHandle = new THREE.Mesh(handleGeometry, handleMaterial);
    oppHandle.rotation.x = Math.PI / 2;
    oppHandle.position.z = -PHYSICS.paddleHeight / 2 - 0.05;
    opponentPaddle.add(oppHandle);
    
    opponentPaddle.position.copy(opponentState.position);
    opponentPaddle.rotation.y = Math.PI;
    scene.add(opponentPaddle);

    // Opponent glow
    const opponentGlow = new THREE.PointLight(0xff00ff, 0.5, 0.5);
    opponentPaddle.add(opponentGlow);
}

function createEnvironment() {
    // Floor
    const floorGeometry = new THREE.PlaneGeometry(20, 20);
    const floorMaterial = new THREE.MeshStandardMaterial({
        color: 0x111122,
        roughness: 0.8
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = true;
    scene.add(floor);

    // Grid on floor
    const gridHelper = new THREE.GridHelper(20, 40, 0x00f5ff, 0x1a1a3a);
    gridHelper.position.y = 0.01;
    scene.add(gridHelper);

    // Background particles (stars)
    const starsGeometry = new THREE.BufferGeometry();
    const starCount = 500;
    const positions = new Float32Array(starCount * 3);
    
    for (let i = 0; i < starCount * 3; i += 3) {
        positions[i] = (Math.random() - 0.5) * 30;
        positions[i + 1] = Math.random() * 10 + 2;
        positions[i + 2] = (Math.random() - 0.5) * 30;
    }
    
    starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const starsMaterial = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.05,
        transparent: true,
        opacity: 0.6
    });
    
    const stars = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(stars);
}

// ==================== GAME LOGIC ====================
function startGame() {
    console.log('Starting game...');
    document.getElementById('menu-screen').style.display = 'none';
    document.getElementById('lobby-screen').style.display = 'none';
    document.getElementById('game-screen').style.display = 'block';
    
    resetBall('player');
    scores = { player: 0, opponent: 0 };
    updateScoreDisplay();
    
    gameState = 'countdown';
    startCountdown();
}

function startCountdown() {
    let count = 3;
    const countdownEl = document.getElementById('countdown');
    countdownEl.style.display = 'block';
    
    const interval = setInterval(() => {
        if (count > 0) {
            countdownEl.textContent = count;
            playSound('countdown');
            count--;
        } else {
            countdownEl.textContent = 'GO!';
            playSound('score');
            setTimeout(() => {
                countdownEl.style.display = 'none';
                gameState = 'playing';
            }, 500);
            clearInterval(interval);
        }
    }, 800);
}

function resetBall(server) {
    const side = server === 'player' ? 1 : -1;
    
    ballState.position.set(
        0,
        PHYSICS.tableHeight + 0.3,
        side * (PHYSICS.tableLength / 4)
    );
    
    const speed = 3;
    const angle = (Math.random() - 0.5) * 0.5;
    
    ballState.velocity.set(
        Math.sin(angle) * speed * 0.3,
        2,
        -side * speed
    );
    
    ballState.spin.set(0, 0, 0);
    ballState.active = true;
    ballState.lastHitBy = null;
    
    ball.position.copy(ballState.position);
    trailPoints = [];
}

function update(deltaTime) {
    if (gameState !== 'playing') return;
    
    updatePaddle(deltaTime);
    updateBall(deltaTime);
    updateBot(deltaTime);
    updateCamera(deltaTime);
    updateEffects(deltaTime);
}

function updatePaddle(deltaTime) {
    paddleState.prevPosition.copy(paddleState.position);
    
    const targetX = ((mouse.x / window.innerWidth) * 2 - 1) * (PHYSICS.tableWidth / 2 - 0.1);
    const targetZ = PHYSICS.tableLength / 2 - 0.3 + ((mouse.y / window.innerHeight) - 0.5) * 0.3;
    
    paddleState.position.x += (targetX - paddleState.position.x) * 0.15;
    paddleState.position.z = Math.max(
        PHYSICS.tableLength / 4,
        Math.min(PHYSICS.tableLength / 2 - 0.1, 
        paddleState.position.z + (targetZ - paddleState.position.z) * 0.1)
    );
    
    paddleState.velocity.subVectors(paddleState.position, paddleState.prevPosition);
    if (deltaTime > 0) {
        paddleState.velocity.multiplyScalar(1 / deltaTime);
    }
    
    paddle.position.copy(paddleState.position);
    
    const tiltX = Math.max(-0.3, Math.min(0.3, paddleState.velocity.x * 0.1));
    const tiltZ = Math.max(-0.2, Math.min(0.2, paddleState.velocity.z * 0.05));
    paddle.rotation.z = -tiltX;
    paddle.rotation.x = tiltZ;
}

function updateBall(deltaTime) {
    if (!ballState.active) return;
    
    const dt = Math.min(deltaTime, 0.02);
    
    if (trailPoints.length > 30) trailPoints.shift();
    trailPoints.push(ballState.position.clone());
    
    ballState.velocity.y += PHYSICS.gravity * dt;
    
    const magnusForce = new THREE.Vector3();
    magnusForce.crossVectors(ballState.spin, ballState.velocity);
    magnusForce.multiplyScalar(PHYSICS.spinFactor);
    ballState.velocity.add(magnusForce);
    
    ballState.velocity.multiplyScalar(PHYSICS.airResistance);
    ballState.spin.multiplyScalar(0.998);
    
    ballState.position.add(ballState.velocity.clone().multiplyScalar(dt));
    
    checkTableCollision();
    checkNetCollision();
    checkPaddleCollision();
    checkOutOfBounds();
    
    ball.position.copy(ballState.position);
    
    ball.rotation.x += ballState.spin.x * dt * 10;
    ball.rotation.y += ballState.spin.y * dt * 10;
    
    updateBallGlow();
}

function checkTableCollision() {
    const tableTop = PHYSICS.tableHeight + 0.015;
    const halfWidth = PHYSICS.tableWidth / 2;
    const halfLength = PHYSICS.tableLength / 2;
    
    if (Math.abs(ballState.position.x) < halfWidth &&
        Math.abs(ballState.position.z) < halfLength) {
        
        if (ballState.position.y - PHYSICS.ballRadius < tableTop && ballState.velocity.y < 0) {
            ballState.position.y = tableTop + PHYSICS.ballRadius;
            ballState.velocity.y *= -PHYSICS.bounceFactor;
            
            ballState.velocity.x += ballState.spin.y * 0.5;
            ballState.velocity.z += ballState.spin.x * 0.5;
            
            playSound('hit');
            createHitParticles(ballState.position.clone(), 0xffffff);
        }
    }
}

function checkNetCollision() {
    const netTop = PHYSICS.tableHeight + PHYSICS.netHeight;
    const halfWidth = PHYSICS.tableWidth / 2 + 0.02;
    
    if (Math.abs(ballState.position.z) < 0.05 && 
        Math.abs(ballState.position.x) < halfWidth &&
        ballState.position.y < netTop &&
        ballState.position.y > PHYSICS.tableHeight) {
        
        if ((ballState.velocity.z > 0 && ballState.position.z < 0) ||
            (ballState.velocity.z < 0 && ballState.position.z > 0)) {
            
            ballState.velocity.z *= -0.3;
            ballState.velocity.y *= 0.5;
            playSound('net');
        }
    }
}

function checkPaddleCollision() {
    // Player paddle collision
    const paddleDist = ballState.position.distanceTo(paddleState.position);
    
    if (paddleDist < 0.15 && ballState.velocity.z > 0) {
        handlePaddleHit(paddleState, 'player');
    }
    
    // Opponent paddle collision
    const oppDist = ballState.position.distanceTo(opponentState.position);
    
    if (oppDist < 0.15 && ballState.velocity.z < 0) {
        handlePaddleHit(opponentState, 'opponent');
    }
}

function handlePaddleHit(paddleData, player) {
    const isPlayer = player === 'player';
    const direction = isPlayer ? -1 : 1;
    
    const hitX = (ballState.position.x - paddleData.position.x) / (PHYSICS.paddleWidth / 2);
    
    const speed = Math.max(5, ballState.velocity.length() * 1.05);
    
    const angleX = hitX * 0.8;
    const angleY = 0.3 + Math.random() * 0.2;
    
    ballState.velocity.set(
        angleX * speed,
        angleY * speed,
        direction * speed
    );
    
    if (isPlayer) {
        const paddleVelX = paddleState.velocity.x;
        const paddleVelZ = paddleState.velocity.z;
        
        const topspinAmount = -paddleVelZ * 2;
        const sidespinAmount = paddleVelX * 2;
        
        ballState.spin.x = Math.max(-1, Math.min(1, topspinAmount));
        ballState.spin.y = Math.max(-1, Math.min(1, sidespinAmount));
        
        if (Math.abs(topspinAmount) > 0.3 || Math.abs(sidespinAmount) > 0.3) {
            playSound('spin');
            createSpinParticles(ballState.position.clone(), ballState.spin);
        }
    } else {
        ballState.spin.x = (Math.random() - 0.5) * 0.5 * botDifficulty;
        ballState.spin.y = (Math.random() - 0.5) * 0.3 * botDifficulty;
    }
    
    if (ballState.velocity.length() > PHYSICS.maxBallSpeed) {
        ballState.velocity.normalize().multiplyScalar(PHYSICS.maxBallSpeed);
    }
    
    ballState.lastHitBy = player;
    
    playSound('paddle');
    createHitParticles(ballState.position.clone(), isPlayer ? 0x00f5ff : 0xff00ff);
}

function checkOutOfBounds() {
    const halfLength = PHYSICS.tableLength / 2 + 1;
    
    if (ballState.position.z > halfLength) {
        scores.opponent++;
        updateScoreDisplay();
        playSound('score');
        
        if (checkWin()) return;
        
        ballState.active = false;
        setTimeout(() => resetBall('opponent'), 1500);
    }
    
    if (ballState.position.z < -halfLength) {
        scores.player++;
        updateScoreDisplay();
        playSound('score');
        
        if (checkWin()) return;
        
        ballState.active = false;
        setTimeout(() => resetBall('player'), 1500);
    }
    
    if (Math.abs(ballState.position.x) > 3 || ballState.position.y < -1) {
        if (ballState.lastHitBy === 'player') {
            scores.opponent++;
        } else {
            scores.player++;
        }
        updateScoreDisplay();
        
        if (checkWin()) return;
        
        ballState.active = false;
        setTimeout(() => resetBall(ballState.lastHitBy === 'player' ? 'opponent' : 'player'), 1500);
    }
}

function checkWin() {
    if (scores.player >= WIN_SCORE || scores.opponent >= WIN_SCORE) {
        gameState = 'ended';
        showWinMessage(scores.player >= WIN_SCORE ? 'player' : 'opponent');
        return true;
    }
    return false;
}

// ==================== BOT AI ====================
function updateBot(deltaTime) {
    if (gameMode !== 'bot') return;
    
    botReactionDelay -= deltaTime;
    
    if (botReactionDelay <= 0) {
        if (ballState.velocity.z < 0) {
            const timeToReach = Math.abs((opponentState.position.z - ballState.position.z) / ballState.velocity.z);
            
            let predictedX = ballState.position.x + ballState.velocity.x * timeToReach;
            predictedX += ballState.spin.y * timeToReach * 2;
            
            const error = (1 - botDifficulty) * 0.3;
            predictedX += (Math.random() - 0.5) * error;
            
            botTargetPos.x = Math.max(-PHYSICS.tableWidth / 2 + 0.1, 
                            Math.min(PHYSICS.tableWidth / 2 - 0.1, predictedX));
        } else {
            botTargetPos.x = (Math.random() - 0.5) * 0.2;
        }
        
        botReactionDelay = 0.05 + (1 - botDifficulty) * 0.1;
    }
    
    const speed = 3 + botDifficulty * 3;
    const diff = botTargetPos.x - opponentState.position.x;
    
    opponentState.velocity.x = Math.sign(diff) * Math.min(Math.abs(diff) * speed, speed);
    opponentState.position.x += opponentState.velocity.x * deltaTime;
    
    opponentState.position.x = Math.max(-PHYSICS.tableWidth / 2 + 0.1,
                                Math.min(PHYSICS.tableWidth / 2 - 0.1, opponentState.position.x));
    
    opponentPaddle.position.copy(opponentState.position);
    opponentPaddle.rotation.z = -opponentState.velocity.x * 0.05;
}

// ==================== CAMERA ====================
function updateCamera(deltaTime) {
    const targetX = paddleState.position.x * 0.3 + ballState.position.x * 0.1;
    
    cameraTarget.x += (targetX - cameraTarget.x) * 0.05;
    cameraTarget.z = ballState.position.z * 0.1;
    
    const targetY = PHYSICS.tableHeight + 0.5 + Math.max(0, (ballState.position.y - PHYSICS.tableHeight) * 0.3);
    cameraTarget.y += (targetY - cameraTarget.y) * 0.05;
    
    camera.position.x += (cameraTarget.x + cameraOffset.x - camera.position.x) * 0.05;
    camera.position.y += (cameraTarget.y + cameraOffset.y - camera.position.y) * 0.03;
    
    camera.lookAt(cameraTarget);
}

// ==================== EFFECTS ====================
function updateBallGlow() {
    const spinMagnitude = ballState.spin.length();
    const ballGlow = ball.children[0];
    
    if (ballGlow && spinMagnitude > 0.2) {
        let color;
        if (ballState.spin.x > 0.2) {
            color = new THREE.Color(0xff6600);
        } else if (ballState.spin.x < -0.2) {
            color = new THREE.Color(0x00ff66);
        } else if (Math.abs(ballState.spin.y) > 0.2) {
            color = new THREE.Color(0xffff00);
        } else {
            color = new THREE.Color(0xffffff);
        }
        
        ballGlow.material.color = color;
        ballGlow.material.opacity = 0.3 + spinMagnitude * 0.3;
        ball.material.emissive = color;
        ball.material.emissiveIntensity = 0.2 + spinMagnitude * 0.2;
    } else if (ballGlow) {
        ballGlow.material.color.set(0xffffff);
        ballGlow.material.opacity = 0.2;
        ball.material.emissive.set(0xffffff);
        ball.material.emissiveIntensity = 0.1;
    }
}

function createHitParticles(position, color) {
    const particleCount = 15;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = [];
    
    for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = position.x;
        positions[i * 3 + 1] = position.y;
        positions[i * 3 + 2] = position.z;
        
        velocities.push(new THREE.Vector3(
            (Math.random() - 0.5) * 2,
            Math.random() * 2,
            (Math.random() - 0.5) * 2
        ));
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const material = new THREE.PointsMaterial({
        color: color,
        size: 0.03,
        transparent: true,
        opacity: 1
    });
    
    const particleSystem = new THREE.Points(geometry, material);
    scene.add(particleSystem);
    
    particles.push({
        system: particleSystem,
        velocities: velocities,
        life: 1
    });
}

function createSpinParticles(position, spin) {
    let color;
    if (spin.x > 0.2) {
        color = 0xff6600;
    } else if (spin.x < -0.2) {
        color = 0x00ff66;
    } else {
        color = 0xffff00;
    }
    
    createHitParticles(position, color);
}

function updateEffects(deltaTime) {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life -= deltaTime * 2;
        
        if (p.life <= 0) {
            scene.remove(p.system);
            particles.splice(i, 1);
            continue;
        }
        
        p.system.material.opacity = p.life;
        
        const positions = p.system.geometry.attributes.position.array;
        for (let j = 0; j < p.velocities.length; j++) {
            positions[j * 3] += p.velocities[j].x * deltaTime;
            positions[j * 3 + 1] += p.velocities[j].y * deltaTime;
            positions[j * 3 + 2] += p.velocities[j].z * deltaTime;
            p.velocities[j].y -= 5 * deltaTime;
        }
        p.system.geometry.attributes.position.needsUpdate = true;
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
    
    try {
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        switch(type) {
            case 'paddle':
                oscillator.frequency.value = 400;
                oscillator.type = 'sine';
                gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
                oscillator.start();
                oscillator.stop(audioCtx.currentTime + 0.1);
                break;
            case 'hit':
                oscillator.frequency.value = 300;
                oscillator.type = 'triangle';
                gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05);
                oscillator.start();
                oscillator.stop(audioCtx.currentTime + 0.05);
                break;
            case 'net':
                oscillator.frequency.value = 150;
                oscillator.type = 'sawtooth';
                gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
                oscillator.start();
                oscillator.stop(audioCtx.currentTime + 0.15);
                break;
            case 'spin':
                oscillator.frequency.value = 800;
                oscillator.type = 'sine';
                gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
                oscillator.start();
                oscillator.stop(audioCtx.currentTime + 0.1);
                break;
            case 'score':
                oscillator.frequency.value = 523;
                oscillator.type = 'sine';
                gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
                oscillator.frequency.setValueAtTime(659, audioCtx.currentTime + 0.1);
                oscillator.frequency.setValueAtTime(784, audioCtx.currentTime + 0.2);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
                oscillator.start();
                oscillator.stop(audioCtx.currentTime + 0.4);
                break;
            case 'countdown':
                oscillator.frequency.value = 600;
                oscillator.type = 'sine';
                gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
                oscillator.start();
                oscillator.stop(audioCtx.currentTime + 0.15);
                break;
        }
    } catch(e) {
        console.log('Audio error:', e);
    }
}

// ==================== UI ====================
function updateScoreDisplay() {
    document.getElementById('score-p1').textContent = scores.player;
    document.getElementById('score-p2').textContent = scores.opponent;
}

function showWinMessage(winner) {
    const overlay = document.getElementById('message-overlay');
    const isPlayer = winner === 'player';
    
    overlay.innerHTML = `
        <div style="animation: fadeInUp 0.5s ease;">
            <div style="color: ${isPlayer ? '#00ff88' : '#ff4444'}; font-size: 3rem; margin-bottom: 20px;">
                ${isPlayer ? '🏆 KAZANDIN!' : '😢 KAYBETTİN!'}
            </div>
            <div style="color: #888; font-size: 1.5rem; margin-bottom: 30px;">
                ${scores.player} - ${scores.opponent}
            </div>
            <button class="menu-btn btn-online" onclick="restartGame()">🔄 Tekrar Oyna</button>
            <br><br>
            <button class="menu-btn btn-back" onclick="quitToMenu()">🏠 Ana Menü</button>
        </div>
    `;
    overlay.style.display = 'block';
}

// ==================== EVENT HANDLERS ====================
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function onMouseMove(event) {
    mouseSpeed.prevX = mouse.x;
    mouseSpeed.prevY = mouse.y;
    
    mouse.x = event.clientX;
    mouse.y = event.clientY;
    
    mouseSpeed.x = mouse.x - mouseSpeed.prevX;
    mouseSpeed.y = mouse.y - mouseSpeed.prevY;
}

function onKeyDown(event) {
    if (event.key === 'Escape') {
        togglePause();
    }
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

// ==================== MENU FUNCTIONS (GLOBAL) ====================
function showLobby() {
    console.log('showLobby called');
    document.getElementById('menu-screen').style.display = 'none';
    document.getElementById('lobby-screen').style.display = 'flex';
    initAudio();
}

function backToMenu() {
    console.log('backToMenu called');
    document.getElementById('lobby-screen').style.display = 'none';
    document.getElementById('menu-screen').style.display = 'flex';
    document.getElementById('create-room-section').style.display = 'block';
    document.getElementById('room-created-section').style.display = 'none';
}

function createRoom() {
    console.log('createRoom called');
    roomCode = generateRoomCode();
    isHost = true;
    document.getElementById('create-room-section').style.display = 'none';
    document.getElementById('room-created-section').style.display = 'block';
    document.getElementById('room-code').textContent = roomCode;
    
    localStorage.setItem('pingpong3d_room_' + roomCode, JSON.stringify({
        host: Date.now(),
        status: 'waiting'
    }));
    
    checkForPlayer();
}

function joinRoom() {
    console.log('joinRoom called');
    const code = document.getElementById('join-room-input').value.toUpperCase();
    if (code.length !== 4) {
        alert('4 haneli kod girin!');
        return;
    }
    
    const room = localStorage.getItem('pingpong3d_room_' + code);
    if (!room) {
        alert('Oda bulunamadı!');
        return;
    }
    
    const data = JSON.parse(room);
    if (data.guest) {
        alert('Oda dolu!');
        return;
    }
    
    data.guest = Date.now();
    localStorage.setItem('pingpong3d_room_' + code, JSON.stringify(data));
    
    roomCode = code;
    isHost = false;
    gameMode = 'online';
    
    document.getElementById('waiting-text').textContent = 'Bağlanıldı! Oyun başlıyor...';
    setTimeout(startGame, 1500);
}

function copyRoomCode() {
    navigator.clipboard.writeText(roomCode);
    document.querySelector('.copy-btn').textContent = '✅ Kopyalandı!';
    setTimeout(() => document.querySelector('.copy-btn').textContent = '📋 Kodu Kopyala', 2000);
}

function startBotGame() {
    console.log('startBotGame called');
    gameMode = 'bot';
    isHost = true;
    initAudio();
    document.getElementById('p1-name').textContent = 'SEN';
    document.getElementById('p2-name').textContent = 'BOT';
    document.getElementById('ping-display').style.display = 'none';
    startGame();
}

function startPractice() {
    console.log('startPractice called');
    gameMode = 'bot';
    botDifficulty = 0.3;
    isHost = true;
    initAudio();
    document.getElementById('p1-name').textContent = 'SEN';
    document.getElementById('p2-name').textContent = 'ANTRENMAN';
    document.getElementById('ping-display').style.display = 'none';
    startGame();
}

function restartGame() {
    console.log('restartGame called');
    document.getElementById('message-overlay').style.display = 'none';
    scores = { player: 0, opponent: 0 };
    updateScoreDisplay();
    gameState = 'countdown';
    startCountdown();
}

function quitToMenu() {
    console.log('quitToMenu called');
    gameState = 'menu';
    document.getElementById('game-screen').style.display = 'none';
    document.getElementById('message-overlay').style.display = 'none';
    document.getElementById('pause-menu').style.display = 'none';
    document.getElementById('menu-screen').style.display = 'flex';
}

function resumeGame() {
    console.log('resumeGame called');
    gameState = 'playing';
    document.getElementById('pause-menu').style.display = 'none';
}

function quitGame() {
    quitToMenu();
}

function generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
}

function checkForPlayer() {
    if (gameState !== 'menu') return;
    
    const room = localStorage.getItem('pingpong3d_room_' + roomCode);
    if (room) {
        const data = JSON.parse(room);
        if (data.guest) {
            document.getElementById('waiting-text').textContent = 'Rakip bulundu! Oyun başlıyor...';
            gameMode = 'online';
            setTimeout(startGame, 1500);
            return;
        }
    }
    setTimeout(checkForPlayer, 500);
}

// ==================== ANIMATION LOOP ====================
let lastTime = 0;

function animate(currentTime) {
    requestAnimationFrame(animate);
    
    currentTime = currentTime || 0;
    const deltaTime = Math.min((currentTime - lastTime) / 1000, 0.1);
    lastTime = currentTime;
    
    update(deltaTime);
    
    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }
}

// ==================== EXPOSE FUNCTIONS TO GLOBAL SCOPE ====================
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

// ==================== START ====================
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing...');
    init();
});

// If DOM already loaded
if (document.readyState !== 'loading') {
    console.log('DOM already loaded, initializing...');
    init();
}
