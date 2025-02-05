
import * as THREE from 'three';
import { PhysicsObject } from './PhysicsObject';
import { DEBUG, INIT_CHARACTER_ROTATION, JUMP_FORCE, JUMP_RAY_DISTANCE, MOVE_SPEED, ROTATION_SPEED, SPAWN_POSITION } from '../consts';
import RAPIER from '@dimforge/rapier3d-compat';
import { dbgAssertObject, dbgAxesHelper, dbgConsoleUpdateChar, dbgRay } from '../debug';

//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\////\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//
//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\////\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//

export class Player extends PhysicsObject {
    constructor(world, {
        position = { x: 0, y: 0, z: 0 },
        rotation = { x: 0, y: 0, z: 0 },
        scale = { x: 1, y: 1, z: 1 },
        geometry,
        material,
        colliderDesc
    }) {
        super(world, {
            isStatic: false,
            position,
            rotation,
            scale,
            geometry,
            material,
            colliderDesc
        });

        this.characterRotationY = INIT_CHARACTER_ROTATION;
        this.rigidBody.restrictRotations(false, true, false);

        this.keys = {
            w: false,
            s: false,
            a: false,
            d: false,
            space: false
        }

        document.addEventListener('keydown', (e) => {
            const k = e.key.toLowerCase();
            if (k === ' ') this.keys.space = true;
            else if (this.keys.hasOwnProperty(k)) this.keys[k] = true;
        });
    
        document.addEventListener('keyup', (e) => {
            const k = e.key.toLowerCase();
            if (k === ' ') this.keys.space = false;
            else if (this.keys.hasOwnProperty(k)) this.keys[k] = false;
        });
    }

    update() {
        // Out-of-bounds check
        let position = this.rigidBody.translation();
        if (position.y < -50.0) {
            this.rigidBody.setTranslation(SPAWN_POSITION, true);
            this.rigidBody.setLinvel(SPAWN_POSITION, true);
            return;
        }

        // Rotation (A/D)
        if (this.keys.a) this.characterRotationY += ROTATION_SPEED;
        if (this.keys.d) this.characterRotationY -= ROTATION_SPEED;

        const q = new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(0, 1, 0),
            this.characterRotationY
        );

        this.rigidBody.setRotation(q, true);

        // Movement (W/S)
        const forward = new THREE.Vector3(
            Math.sin(this.characterRotationY),
            0,
            Math.cos(this.characterRotationY)
        ).normalize();

        let movement = new THREE.Vector3();
        if (this.keys.w) movement.add(forward);
        if (this.keys.s) movement.sub(forward);
        movement.normalize().multiplyScalar(MOVE_SPEED);

        const currentVelocity = this.rigidBody.linvel();
        this.rigidBody.setLinvel({ x: movement.x, y: currentVelocity.y, z: movement.z }, true);

        // Jumping
        const rayOrigin = { x: position.x, y: position.y, z: position.z };
        const rayDirection = { x: 0, y: -1, z: 0 };
        const ray = new RAPIER.Ray(rayOrigin, rayDirection);
        const hit = this.world.physics.castRay(ray, JUMP_RAY_DISTANCE, true, null, null, null, this.rigidBody);
        if (this.keys.space && (hit !== null)) {
            this.rigidBody.setLinvel({ x: currentVelocity.x, y: JUMP_FORCE, z: currentVelocity.z }, true);
        }

        super.update();

        // Update camera position
        this.world.controls.target.set(position.x, position.y, position.z);
        this.world.controls.update();

        if (DEBUG) {
            dbgRay(this.world.scene, rayOrigin, rayDirection, JUMP_RAY_DISTANCE);
            dbgAxesHelper(this.mesh);
            dbgConsoleUpdateChar(this.mesh)
            // dbgAssertObject(this.mesh, this.rigidBody);
        }
    }
}

//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\////\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//
//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\////\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//
