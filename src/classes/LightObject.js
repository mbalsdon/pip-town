import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
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
        light,
        lightRelPos = { x: 0, y: 0, z: 0 },
        lightCastShadow = false,
        onTick = null
    }) {
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
        });

        light.position.set(
            position.x + lightRelPos.x,
            position.y + lightRelPos.y,
            position.z + lightRelPos.z
        );
        light.castShadow = lightCastShadow;
        this.light = light;
        this.lightRelPos = lightRelPos;
        this.onTick = onTick;

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
            x + this.lightRelPos.x,
            y + this.lightRelPos.y,
            z + this.lightRelPos.z
        );
    }

    update() {
        if (this.hasRigidBody() && !this.rigidBody.isFixed()) {
            const position = this.rigidBody.translation();
            const rotation = this.rigidBody.rotation();

            const q = new THREE.Quaternion(rotation.x, rotation.y, rotation.z, rotation.w);
            const rp = new THREE.Vector3(this.lightRelPos.x, this.lightRelPos.y, this.lightRelPos.z);
            rp.applyQuaternion(q);

            this.light.position.set(
                position.x + rp.x,
                position.y + rp.y,
                position.z + rp.z
            );
            this.light.quaternion.set(q.x, q.y, q.z, q.w);
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
