import * as THREE from 'three';
import { PhysicsObject } from './PhysicsObject';
import { DEBUG } from '../consts';

//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\////\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//
//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\////\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//

export class LightObject extends PhysicsObject {
    constructor(world, {
        isStatic = true,
        position = { x: 0, y: 0, z: 0 },
        rotation = { x: 0, y: 0, z: 0 },
        scale = { x: 1, y: 1, z: 1 },
        mesh = null,
        colliderDesc = null,
        colliderProps = { friction: (isStatic ? 0.0 : 0.1), restitution: 0.2, density: 1 },
        light = null,
        lightRelPos = { x: 0, y: 0, z: 0 },
        lightCastShadow = false,
        onTick = null,
        isCameraCollidable = false
    }) {
        if (light === null)
            throw new Error("LightObject::constructor - light cannot be null");

        super(world, {
            isStatic,
            castShadow: false, // the associated object, not the light
            receiveShadow: false,
            position,
            rotation,
            scale,
            mesh,
            colliderDesc,
            colliderProps,
            onTick,
            isCameraCollidable
        });

        this._quaternion = new THREE.Quaternion();
        this._rotatedRelPos = new THREE.Vector3();

        light.position.set(
            position.x + lightRelPos.x,
            position.y + lightRelPos.y,
            position.z + lightRelPos.z
        );
        light.castShadow = lightCastShadow;
        this.light = light;
        this._lightRelPos = lightRelPos;

        if (DEBUG) {
            if (this.light.isAmbientLight) {}
            else if (this.light.isHemisphereLight) {
                this.world.scene.add(new THREE.HemisphereLightHelper(this.light));
            } else if (this.light.isDirectionalLight) {
                this.world.scene.add(new THREE.CameraHelper(this.light.shadow.camera));
                this.world.scene.add(new THREE.DirectionalLightHelper(this.light));
            } else if (this.light.isPointLight) {
                this.world.scene.add(new THREE.PointLightHelper(this.light));
            } else {
                throw new Error("LightObject::constructor - unimplemented debug light");
            }
        }

        this.world.scene.add(this.light);
    }

    setPosition(x, y, z) {
        super.setPosition(x, y, z);
        this.light.position.set(
            x + this._lightRelPos.x,
            y + this._lightRelPos.y,
            z + this._lightRelPos.z
        );
    }

    update() {
        if (this.hasRigidBody() && !this.rigidBody.isFixed()) {
            const position = this.rigidBody.translation();

            const r = this.rigidBody.rotation();
            this._quaternion.set(r.x, r.y, r.z, r.w);
            this._rotatedRelPos.set(this._lightRelPos.x, this._lightRelPos.y, this._lightRelPos.z);
            this._rotatedRelPos.applyQuaternion(this._quaternion);

            this.light.position.set(
                position.x + this._rotatedRelPos.x,
                position.y + this._rotatedRelPos.y,
                position.z + this._rotatedRelPos.z
            );
            this.light.quaternion.copy(this._quaternion);
        }

        super.update();
    }

    destroy() {
        super.destroy();
        this.light.removeFromParent();
    }
}

//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\////\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//
//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\////\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//
