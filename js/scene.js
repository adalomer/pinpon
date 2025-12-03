// ==================== SCENE.JS ====================
// Three.js sahne kurulumu

import * as THREE from 'three';
import { TABLE } from './config.js';

let scene, camera, renderer;

// Sahne oluştur
export function createScene(canvas) {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a2a3a);
    
    // Kamera - oyuncu perspektifi
    camera = new THREE.PerspectiveCamera(
        60, 
        window.innerWidth / window.innerHeight, 
        0.1, 
        100
    );
    camera.position.set(0, TABLE.height + 1.2, TABLE.length/2 + 1.5);
    camera.lookAt(0, TABLE.height, -0.5);
    
    // Renderer
    renderer = new THREE.WebGLRenderer({ 
        canvas: canvas, 
        antialias: true 
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Işıklandırma
    setupLights();
    
    return { scene, camera, renderer };
}

// Işıkları kur
function setupLights() {
    // Ortam ışığı
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambient);
    
    // Ana ışık (gölge oluşturur)
    const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
    mainLight.position.set(2, 5, 3);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    scene.add(mainLight);
    
    // Arka ışık
    const backLight = new THREE.DirectionalLight(0x4488ff, 0.3);
    backLight.position.set(-2, 3, -3);
    scene.add(backLight);
}

// Çevre oluştur (zemin, duvar)
export function createEnvironment(scene) {
    // Zemin
    const floorGeo = new THREE.PlaneGeometry(15, 15);
    const floorMat = new THREE.MeshStandardMaterial({ 
        color: 0x2a3a4a,
        roughness: 0.8
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI/2;
    floor.receiveShadow = true;
    scene.add(floor);
    
    // Arka duvar
    const wallGeo = new THREE.PlaneGeometry(15, 8);
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x1a2a3a });
    const wall = new THREE.Mesh(wallGeo, wallMat);
    wall.position.set(0, 4, -5);
    scene.add(wall);
}

// Pencere boyutlandırma
export function handleResize(camera, renderer) {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Getter fonksiyonları
export function getScene() { return scene; }
export function getCamera() { return camera; }
export function getRenderer() { return renderer; }
