import * as THREE from 'three';
import * as RAPIER from '@dimforge/rapier3d-compat';
import { OrbitControls } from 'three/examples/jsm/Addons.js';

const GRAVITY = { x: 0.0, y: -10.0, z: 0.0};

export function setupPhysicsWorld() {
    const world = new RAPIER.World(GRAVITY);

    return world;
}

export function setupScene() {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);

    return scene;
}

export function setupRenderer() {
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);

    return renderer;
}

export function setupCamera(renderer) {
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, -5, 10);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = false;
    controls.minDistance = 0;
    controls.maxDistance = 5;
    controls.rotateSpeed = 0.5;

    return [camera, controls];
}
