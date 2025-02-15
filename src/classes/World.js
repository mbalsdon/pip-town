import * as THREE from 'three';
import * as RAPIER from '@dimforge/rapier3d-compat';
import { OrbitControls } from 'three/examples/jsm/Addons.js';
import { createDbgConsole, dbgConsoleUpdateCam } from '../debug';
import { CAMERA_FOV, CAMERA_MAX_DISTANCE, INIT_CAMERA_POSITION, DEBUG, FPS, GRAVITY } from '../consts'

//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\////\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//
//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\////\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//

export class World {
    constructor() {
        this.scene = new THREE.Scene();

        this.dayColor = new THREE.Color(0x87ceeb);
        this.nightColor = new THREE.Color(0x0a0921);
        this.sunsetColor = new THREE.Color(0xff5e00);

        this.backgroundColor = new THREE.Color(61.78/255, 159.11/255, 211.184/255);
        this.scene.background = this.backgroundColor;

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        document.body.appendChild(this.renderer.domElement);

        this.camera = new THREE.PerspectiveCamera(CAMERA_FOV, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(INIT_CAMERA_POSITION.x, INIT_CAMERA_POSITION.y, INIT_CAMERA_POSITION.z);

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
