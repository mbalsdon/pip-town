import * as THREE from 'three';
import * as RAPIER from '@dimforge/rapier3d-compat';
import { dbgColliderMesh } from '../debug';
import { DEBUG } from '../consts';

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
        geometry,
        material,
        colliderDesc,
        colliderProps = { friction: (isStatic ? 0.0 : 0.1), restitution: 0.2, density: 1 },
        onTick = null
    }) {
        if (position.x === undefined || position.y === undefined || position.z === undefined)
            throw new Error("PhysicsObject::constructor - ill-defined position");
        if (rotation.x === undefined || rotation.y === undefined || rotation.z === undefined)
            throw new Error("PhysicsObject::constructor - ill-defined rotation");
        if (colliderProps.friction === undefined || colliderProps.restitution === undefined || colliderProps.density === undefined)
            throw new Error("PhysicsObject::constructor - ill-defined colliderProps");

        this.world = world;

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.set(position.x, position.y, position.z);
        this.mesh.rotation.set(rotation.x, rotation.y, rotation.z);
        this.mesh.scale.set(scale.x, scale.y, scale.z);
        this.mesh.castShadow = castShadow;
        this.mesh.receiveShadow = receiveShadow;
        this.world.scene.add(this.mesh);

        const rigidBodyDesc = isStatic ?
            RAPIER.RigidBodyDesc.fixed() :
            RAPIER.RigidBodyDesc.dynamic();

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

        this.onTick = onTick;

        if (DEBUG) {
            dbgColliderMesh(this.mesh, this.collider);
        }
    }

    getPosition() { return this.rigidBody.translation(); }
    getQuaternion() { return this.rigidBody.rotation(); }

    setPosition(x, y, z) {
        this.mesh.position.set(x, y, z);
        this.rigidBody.setTranslation({ x, y, z }, true);
    }

    setRotation(x, y, z) {
        this.mesh.rotation.set(x, y, z);
        const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z));
        this.rigidBody.setRotation(q, true);
    }

    setScale(x, y, z) {
        throw new Error(`PhysicsObject::setScale - not implemented`);
    }

    update() {
        if (!this.rigidBody.isFixed()) {
            const position = this.getPosition();
            const rotation = this.rigidBody.rotation();
            this.mesh.position.set(position.x, position.y, position.z);
            this.mesh.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
        }

        if (this.onTick !== null) this.onTick();
    }

    destroy() {
        this.mesh.removeFromParent();
        this.world.physics.removeRigidBody(this.rigidBody);
    }
}

//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\////\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//
//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\////\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//
