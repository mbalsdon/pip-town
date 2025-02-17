import * as THREE from 'three';
import * as RAPIER from '@dimforge/rapier3d-compat';
import { dbgColliderMesh } from '../debug';
import { DEBUG_COLLIDERS } from '../consts';

//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\////\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//
//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\////\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//

export class PhysicsObject {
    constructor(world, {
        isStatic = true,
        castShadow = true,
        receiveShadow = true,
        position = { x: 0, y: 0, z: 0 },
        rotation = { x: 0, y: 0, z: 0 },
        scale = { x: 1, y: 1, z: 1 },
        mesh = null,
        colliderDesc = null,
        colliderProps = { friction: (isStatic ? 0.0 : 0.1), restitution: 0.2, density: 1 },
        onTick = null,
        isCameraCollidable = false
    }) {
        if (position.x === undefined || position.y === undefined || position.z === undefined)
            throw new Error("PhysicsObject::constructor - ill-defined position");
        if (rotation.x === undefined || rotation.y === undefined || rotation.z === undefined)
            throw new Error("PhysicsObject::constructor - ill-defined rotation");
        if (colliderProps.friction === undefined || colliderProps.restitution === undefined || colliderProps.density === undefined)
            throw new Error("PhysicsObject::constructor - ill-defined colliderProps");
        if (mesh === null && colliderDesc === null)
            throw new Error("PhysicsObject::constructor - mesh and colliderDesc cannot both be null");

        this.world = world;
        this._onTick = onTick;

        if (DEBUG_COLLIDERS && mesh === null) mesh = new THREE.Object3D(); // need this for hitbox wireframes
        this.mesh = mesh;

        if (mesh !== null) {
            this.mesh.position.set(position.x, position.y, position.z);
            this.mesh.rotation.set(rotation.x, rotation.y, rotation.z);
            this.mesh.scale.set(scale.x, scale.y, scale.z);
            this.mesh.castShadow = castShadow;
            this.mesh.receiveShadow = receiveShadow;
            if (isCameraCollidable) this.mesh.layers.enable(1);
            this.world.scene.add(this.mesh);
        }

        if (colliderDesc !== null)
        {
            const rigidBodyDesc = (isStatic ? RAPIER.RigidBodyDesc.fixed() : RAPIER.RigidBodyDesc.dynamic());

            this.rigidBody = this.world.physics.createRigidBody(
                rigidBodyDesc
                    .setTranslation(position.x, position.y, position.z)
                    .setRotation(new THREE.Quaternion().setFromEuler(new THREE.Euler(rotation.x, rotation.y, rotation.z)))
            );

            const shape = colliderDesc.shape.type;
            if (shape === 1) { // cuboid
                colliderDesc.shape.halfExtents.x *= (1/scale.x);
                colliderDesc.shape.halfExtents.y *= (1/scale.y);
                colliderDesc.shape.halfExtents.z *= (1/scale.z);
            } else if (shape === 2) {
                colliderDesc.shape.halfHeight *= (1/scale.y);
                colliderDesc.shape.radius *= Math.max(1/scale.x, 1/scale.z);
            } else {
                throw new Error(`PhysicsObject - unimplemented shape ${shape}`);
            }

            colliderDesc.setFriction(colliderProps.friction);
            colliderDesc.setRestitution(colliderProps.restitution);
            colliderDesc.setDensity(colliderProps.density);

            this.collider = this.world.physics.createCollider(colliderDesc, this.rigidBody);
        } else {
            this.rigidBody = null;
            this.collider = null;
        }

        if (DEBUG_COLLIDERS) {
            if (this.collider !== null) {
                dbgColliderMesh(this.mesh, this.collider);
            }
        }
    }

    hasMesh() { return this.mesh !== null; }
    hasRigidBody() { return this.rigidBody !== null; }
    hasCollider() { return this.collider !== null; }

    getPosition() {
        if (this.hasRigidBody()) return this.rigidBody.translation();
        else throw new Error("PhysicsObject::getPosition - object has no rigid body");
    }
    getQuaternion() {
        if (this.hasRigidBody()) return this.rigidBody.rotation();
        else throw new Error("PhysicsObject::getQuaternion - object has no rigid body");
    }

    setPosition(x, y, z) {
        if (this.hasMesh()) this.mesh.position.set(x, y, z);
        if (this.hasRigidBody()) this.rigidBody.setTranslation({ x, y, z }, true);
    }

    setRotation(x, y, z) {
        if (this.hasMesh()) this.mesh.rotation.set(x, y, z);
        if (this.hasRigidBody()) {
            const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z));
            this.rigidBody.setRotation(q, true);
        }
    }

    setScale(x, y, z) {
        throw new Error(`PhysicsObject::setScale - not implemented`);
    }

    update() {
        if (this.hasMesh() && this.hasRigidBody() && !this.rigidBody.isFixed()) {
            const position = this.getPosition();
            const quaternion = this.getQuaternion();
            this.mesh.position.set(position.x, position.y, position.z);
            this.mesh.quaternion.set(quaternion.x, quaternion.y, quaternion.z, quaternion.w);
        }

        if (this._onTick !== null) this._onTick();
    }

    destroy() {
        if (this.hasMesh()) this.mesh.removeFromParent();
        if (this.hasRigidBody()) this.world.physics.removeRigidBody(this.rigidBody);
    }
}

//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\////\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//
//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\////\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//
