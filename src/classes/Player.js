
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { PhysicsObject } from './PhysicsObject';
import { LAYER_CAMERA_COLLISION, CAMERA_COLLISION_OFFSET, CAMERA_SMOOTHING_FACTOR, CAMERA_Y_OFFSET, DEBUG, INIT_CHARACTER_ROTATION, JUMP_FORCE, JUMP_RAY_DISTANCE, MOVE_SPEED, ROTATION_SPEED, SPAWN_POSITION, CAMERA_COLLISION_ON } from '../consts';
import { dbgAssertObject, dbgAxesHelper, dbgConsoleCharacter, dbgRay } from '../debug';

//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\////\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//
//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\////\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//

export class Player extends PhysicsObject {
    constructor(world, {
        position = { x: 0, y: 0, z: 0 },
        rotation = { x: 0, y: 0, z: 0 },
        scale = { x: 1, y: 1, z: 1 },
        mesh = null,
        colliderDesc = null,
        colliderProps = { friction: (isStatic ? 0.0 : 0.1), restitution: 0.2, density: 1 }
    }) {
        if (mesh === null)
            throw new Error("Player::constructor - mesh cannot be null");
        if (colliderDesc === null)
            throw new Error("Player::constructor - colliderDesc cannot be null");

        super(world, {
            isStatic: false,
            castShadow: true,
            receiveShadow: true,
            position,
            rotation,
            scale,
            mesh,
            colliderDesc,
            colliderProps,
            onTick: null,
            isCameraCollidable: false
        });

        this.position = new THREE.Vector3();

        this._rotY = INIT_CHARACTER_ROTATION;
        this._rotQuaternion = new THREE.Quaternion();
        this._yAxis = new THREE.Vector3(0, 1, 0);
        this._forward = new THREE.Vector3();
        this._movement = new THREE.Vector3();
        this._jumpRay = new RAPIER.Ray();

        this._camDirection = new THREE.Vector3();
        this._newCamPos = new THREE.Vector3();
        this._camRaycaster = new THREE.Raycaster();
        this._camRaycaster.layers.set(LAYER_CAMERA_COLLISION);

        this.rigidBody.restrictRotations(false, true, false);

        this.keys = {
            w: false,
            s: false,
            a: false,
            d: false,
            e: false,
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

        if (DEBUG) {
            dbgAxesHelper(this.mesh);
        }
    }

    update() {
        const p = this.rigidBody.translation();
        this.position.set(p.x, p.y, p.z);

        // Out-of-bounds check
        if (this.position.y < -50.0) {
            this.rigidBody.setTranslation(SPAWN_POSITION, true);
            this.rigidBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
            this.rigidBody.setAngvel({ x: 0, y: 0, z: 0 }, true);
            return;
        }

        // Dialogue (E)
        if (this.keys.e && this.world.dialogue.isActive) {
            this.world.dialogue.continue();
            this.keys.e = false;
        }

        const currentVelocity = this.rigidBody.linvel();
        if (!this.world.dialogue.isActive) {

            // Rotation (A/D)
            if (this.keys.a) this._rotY += (ROTATION_SPEED * this.world.physics.timestep);
            if (this.keys.d) this._rotY -= (ROTATION_SPEED * this.world.physics.timestep);

            this._rotQuaternion.setFromAxisAngle(
                this._yAxis,
                this._rotY
            );

            this.rigidBody.setRotation(this._rotQuaternion, true);

            // Movement (W/S)
            this._forward.set(
                Math.sin(this._rotY),
                0,
                Math.cos(this._rotY)
            ).normalize();

            this._movement.set(0, 0, 0);
            if (this.keys.w) this._movement.add(this._forward);
            if (this.keys.s) this._movement.sub(this._forward);
            this._movement.normalize().multiplyScalar(MOVE_SPEED);

            this.rigidBody.setLinvel({ x: this._movement.x, y: currentVelocity.y, z: this._movement.z }, true);

            // Jumping
            this._jumpRay.origin = { x: this.position.x, y: this.position.y, z: this.position.z };
            this._jumpRay.dir = { x: 0, y: -1, z: 0 };
            const hit = this.world.physics.castRay(this._jumpRay, JUMP_RAY_DISTANCE, true, null, null, null, this.rigidBody);
            if (this.keys.space && (hit !== null)) {
                this.rigidBody.setLinvel({ x: currentVelocity.x, y: JUMP_FORCE, z: currentVelocity.z }, true);
            }

            // Update camera position
            this.world.controls.target.set(this.position.x, this.position.y + CAMERA_Y_OFFSET, this.position.z);
            this.world.controls.update();

            // Position camera in front of objects which obstruct its view of the player
            if (CAMERA_COLLISION_ON) {
                const currCamPos = this.world.camera.position;

                this._camDirection.subVectors(currCamPos, this.position).normalize();
                this._camRaycaster.set(this.position, this._camDirection);
                this._camRaycaster.far = this.world.controls.getDistance();

                const intersections = this._camRaycaster.intersectObjects(this.world.scene.children).filter(int => int.object !== this.mesh);

                if (intersections.length > 0) {
                    const closest = intersections[0];
                    this._newCamPos.subVectors(
                        currCamPos,
                        this._camDirection.multiplyScalar(this.world.controls.getDistance() - closest.distance + CAMERA_COLLISION_OFFSET)
                    );
                    this.world.camera.position.lerp(this._newCamPos, CAMERA_SMOOTHING_FACTOR);
                }
            }
        } else { /* this.world.dialogue.isActive */

            // Stop player movement
            this.rigidBody.setLinvel({ x: 0, y: currentVelocity.y, z: 0 }, true);
            this.rigidBody.setAngvel({ x: 0, y: 0, z: 0 }, true);
        }

        // Parent class
        super.update();

        if (DEBUG) {
            dbgRay(this.world.scene, this._jumpRay.origin, this._jumpRay.dir, JUMP_RAY_DISTANCE);
            dbgConsoleCharacter(this.mesh)
            dbgAssertObject(this.mesh, this.rigidBody);
        }
    }
}

//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\////\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//
//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\////\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//
