// ==================== TABLE.JS ====================
// Masa ve file oluşturma

import * as THREE from 'three';
import { TABLE } from './config.js';

let tableMesh, netMesh;

// Masayı oluştur
export function createTable(scene) {
    // Masa üstü - mavi
    const tableGeo = new THREE.BoxGeometry(TABLE.width, 0.03, TABLE.length);
    const tableMat = new THREE.MeshStandardMaterial({ 
        color: 0x1a5f7a,
        roughness: 0.3
    });
    tableMesh = new THREE.Mesh(tableGeo, tableMat);
    tableMesh.position.set(0, TABLE.height, 0);
    tableMesh.receiveShadow = true;
    tableMesh.castShadow = true;
    scene.add(tableMesh);
    
    // Beyaz çizgiler
    createTableLines(scene);
    
    // Masa bacakları
    createTableLegs(scene);
    
    return tableMesh;
}

// Masa çizgilerini oluştur
function createTableLines(scene) {
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    
    // Orta çizgi
    const centerLine = new THREE.Mesh(
        new THREE.BoxGeometry(0.02, 0.005, TABLE.length), 
        lineMat
    );
    centerLine.position.set(0, TABLE.height + 0.016, 0);
    scene.add(centerLine);
    
    // Kenar çizgileri
    [-1, 1].forEach(side => {
        const sideLine = new THREE.Mesh(
            new THREE.BoxGeometry(0.02, 0.005, TABLE.length),
            lineMat
        );
        sideLine.position.set(side * TABLE.width/2, TABLE.height + 0.016, 0);
        scene.add(sideLine);
    });
    
    // Son çizgiler
    [-1, 1].forEach(end => {
        const endLine = new THREE.Mesh(
            new THREE.BoxGeometry(TABLE.width, 0.005, 0.02),
            lineMat
        );
        endLine.position.set(0, TABLE.height + 0.016, end * TABLE.length/2);
        scene.add(endLine);
    });
}

// Masa bacaklarını oluştur
function createTableLegs(scene) {
    const legGeo = new THREE.BoxGeometry(0.05, TABLE.height - 0.03, 0.05);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
    
    const legPositions = [
        [-TABLE.width/2 + 0.1, TABLE.height/2, -TABLE.length/2 + 0.2],
        [TABLE.width/2 - 0.1, TABLE.height/2, -TABLE.length/2 + 0.2],
        [-TABLE.width/2 + 0.1, TABLE.height/2, TABLE.length/2 - 0.2],
        [TABLE.width/2 - 0.1, TABLE.height/2, TABLE.length/2 - 0.2]
    ];
    
    legPositions.forEach(pos => {
        const leg = new THREE.Mesh(legGeo, legMat);
        leg.position.set(...pos);
        leg.castShadow = true;
        scene.add(leg);
    });
}

// Fileyi oluştur
export function createNet(scene) {
    // File direkleri
    const postGeo = new THREE.CylinderGeometry(0.01, 0.01, TABLE.netHeight + 0.02);
    const postMat = new THREE.MeshStandardMaterial({ color: 0x666666 });
    
    [-1, 1].forEach(side => {
        const post = new THREE.Mesh(postGeo, postMat);
        post.position.set(
            side * (TABLE.width/2 + 0.02), 
            TABLE.height + TABLE.netHeight/2 + 0.01, 
            0
        );
        post.castShadow = true;
        scene.add(post);
    });
    
    // File ağı
    const netGeo = new THREE.BoxGeometry(TABLE.width + 0.04, TABLE.netHeight, 0.005);
    const netMat = new THREE.MeshStandardMaterial({ 
        color: 0xffffff, 
        transparent: true, 
        opacity: 0.9,
        side: THREE.DoubleSide
    });
    netMesh = new THREE.Mesh(netGeo, netMat);
    netMesh.position.set(0, TABLE.height + TABLE.netHeight/2 + 0.015, 0);
    scene.add(netMesh);
    
    // File üst çubuğu
    const topBar = new THREE.Mesh(
        new THREE.BoxGeometry(TABLE.width + 0.06, 0.015, 0.015),
        new THREE.MeshStandardMaterial({ color: 0xffffff })
    );
    topBar.position.set(0, TABLE.height + TABLE.netHeight + 0.02, 0);
    scene.add(topBar);
    
    return netMesh;
}

// Getter
export function getTable() { return tableMesh; }
export function getNet() { return netMesh; }
