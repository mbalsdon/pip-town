import * as THREE from 'three';
import * as RAPIER from '@dimforge/rapier3d-compat';
import { OrbitControls } from 'three/examples/jsm/Addons.js';
import { createDbgConsole, dbgConsoleUpdateCam } from '../debug';
import { CAMERA_MAX_DISTANCE, DEBUG, FPS, GRAVITY } from '../consts'

//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\////\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//
//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\////\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//

export class World {
    constructor() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87ceeb);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        document.body.appendChild(this.renderer.domElement);

        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, -5, 10);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = false;
        this.controls.minDistance = 0;
        this.controls.maxDistance = CAMERA_MAX_DISTANCE;
        this.controls.rotateSpeed = 0.5;

        this.physics = new RAPIER.World(GRAVITY);

        this.objects = new Set();

        window.addEventListener("resize", () => { 
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });

        this.lastTime = 0;

        if (DEBUG) {
            createDbgConsole();
        }
    }

    update(currentTime) {
        if ((currentTime - this.lastTime) >= (1000 / FPS)) {
            this.physics.timestep = 1 / FPS;
            this.physics.step();

            for (const object of this.objects) {
                object.update();
            }

            this.renderer.render(this.scene, this.camera);

            this.lastTime = currentTime;

            if (DEBUG) {
                dbgConsoleUpdateCam(this.camera);
            }
        }
    }
}

//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\////\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//
//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\////\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//
