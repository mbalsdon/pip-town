import * as THREE from 'three';
import * as RAPIER from '@dimforge/rapier3d-compat';
import { OrbitControls } from 'three/examples/jsm/Addons.js';
import { createDbgConsole, dbgConsoleCamera, dbgConsoleTimeTicks } from '../debug';
import { CAMERA_FOV, CAMERA_MAX_DISTANCE, CAMERA_MIN_DISTANCE, DEBUG, MAX_FPS, GRAVITY, INIT_CAMERA_POSITION, MAX_TIMESTEP } from '../consts'
import { Dialogue } from './Dialogue';

//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\////\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//
//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\////\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//

export class World {
    constructor() {
        this.scene = new THREE.Scene();
        this.dialogue = new Dialogue();

        this.dayColor = new THREE.Color(0x87ceeb);
        this.nightColor = new THREE.Color(0x0a0921);
        this.sunsetColor = new THREE.Color(0xff5e00);

        this.backgroundColor = new THREE.Color(0x87ceeb);
        this.scene.background = this.backgroundColor;

        this._renderer = new THREE.WebGLRenderer({ antialias: true });
        this._renderer.setSize(window.innerWidth, window.innerHeight);
        this._renderer.shadowMap.enabled = true;
        document.body.appendChild(this._renderer.domElement);

        this.camera = new THREE.PerspectiveCamera(CAMERA_FOV, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(INIT_CAMERA_POSITION.x, INIT_CAMERA_POSITION.y, INIT_CAMERA_POSITION.z);

        this.controls = new OrbitControls(this.camera, this._renderer.domElement);
        this.controls.enableDamping = false;
        this.controls.minDistance = CAMERA_MIN_DISTANCE;
        this.controls.maxDistance = CAMERA_MAX_DISTANCE;
        this.controls.rotateSpeed = 0.5;

        this.physics = new RAPIER.World(GRAVITY);

        this.objects = new Set();

        window.addEventListener("resize", () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this._renderer.setSize(window.innerWidth, window.innerHeight);
        });

        this._lastTime = 0;

        if (DEBUG) {
            createDbgConsole();
        }
    }

    update(currentTime) {
        const dt = Math.min((currentTime - this._lastTime) / 1000, MAX_TIMESTEP);
        if (dt >= (1/MAX_FPS)) {
            this.physics.timestep = dt;
            this.physics.step();
            for (const object of this.objects) object.update();
            this._renderer.render(this.scene, this.camera);
            this._lastTime = currentTime;

            if (DEBUG) {
                dbgConsoleCamera(this.camera);
                dbgConsoleTimeTicks(currentTime);
            }
        }
    }
}

//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\////\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//
//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\////\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//
