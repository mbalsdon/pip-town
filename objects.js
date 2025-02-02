import * as THREE from 'three';
import * as RAPIER from '@dimforge/rapier3d-compat';
import { GLTFLoader } from 'three/examples/jsm/Addons.js';
import { dbgCapsuleHitbox } from './debug';
import { DEBUG } from './consts';

export function createGround(scene, world) {
    const groundDim = {hx: 40, hy: 1, hz: 40};
    const groundPos = {x: 0, y: -1, z: 0};

    // Ground mesh
    const groundGeometry = new THREE.BoxGeometry(groundDim.hx * 2, groundDim.hy * 2, groundDim.hz * 2);
    groundGeometry.translate(groundPos.x, groundPos.y, groundPos.z);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x2d5518,
        roughness: 1,
        metalness: 0
    });
    const groundModel = new THREE.Mesh(groundGeometry, groundMaterial);
    groundModel.receiveShadow = true;
    
    // Ground physics
    const groundColliderDesc = RAPIER.ColliderDesc.cuboid(groundDim.hx, groundDim.hy, groundDim.hz)
        .setTranslation(groundPos.x, groundPos.y, groundPos.z);
    world.createCollider(groundColliderDesc);

    // Grass & flowers
    const flowerColors = [0xffffff, 0xff2b2b, 0xfcba03, 0xff7b00, 0xfff566];
    const grassGeometry = new THREE.BoxGeometry(0.1, 0.5, 0.0);
    const grassMaterial = new THREE.MeshStandardMaterial({
        color: 0x639930,
        alphaTest: 0.5
    });
    const grassGroup = new THREE.Group();
    const grassDensity = 1.5;
    const flowerProb = 0.05;
    const numBlades = Math.floor((groundDim.hx * 2) * (groundDim.hz * 2) * grassDensity);
    for (let i = 0; i < numBlades; ++i) {
        const blade = new THREE.Mesh(grassGeometry, grassMaterial);

        blade.position.set(
            Math.random() * (groundDim.hx * 2) - groundDim.hx,
            Math.random() * 0.2,
            Math.random() * (groundDim.hz * 2) - groundDim.hz
        );

        blade.rotation.y = Math.random() * Math.PI;
        blade.rotation.x = Math.random() * (Math.PI / 8);
        const grassScale = 0.8 + Math.random() * 0.4;
        blade.scale.set(grassScale, grassScale, grassScale);

        blade.castShadow = true;
        blade.receiveShadow = true;

        // grass is flower sometimes
        if (Math.random() < flowerProb) {
            const flowerGeometry = new THREE.BoxGeometry(0.15, 0.15, 0.15);
            const flowerMaterial = new THREE.MeshStandardMaterial({
                color: flowerColors[Math.floor(Math.random() * flowerColors.length)],
                side: THREE.DoubleSide,
                alphaTest: 0.5
            });
            const flower = new THREE.Mesh(flowerGeometry, flowerMaterial);
            flower.position.set(0, 0.25, 0);
            flower.rotation.z = Math.random() * Math.PI;
            flower.rotation.x = Math.PI / 2;
            const flowerScale = 0.5 + Math.random() * 0.5;
            flower.scale.set(flowerScale, flowerScale, flowerScale);
            flower.castShadow = true;
            flower.receiveShadow = true;

            blade.add(flower);
        }

        grassGroup.add(blade);
    }

    // TODO: repeating fence around world?

    scene.add(groundModel);
    scene.add(grassGroup);

    return groundModel;
}

export async function createStaticGLBObject(glbPath, scene, world, modelDesc, capsuleDesc) {
    // Mesh
    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync(glbPath);
    const model = gltf.scene;
    model.position.set(modelDesc.pos.x, modelDesc.pos.y, modelDesc.pos.z);
    model.rotation.set(modelDesc.rot.x, modelDesc.rot.y, modelDesc.rot.z);
    model.scale.set(modelDesc.scale.x, modelDesc.scale.y, modelDesc.scale.z);
    model.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true;
        }
    });
    scene.add(model);

    // Rigid body
    const quaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(modelDesc.rot.x, modelDesc.rot.y, modelDesc.rot.z));
    const modelBodyDesc = RAPIER.RigidBodyDesc.fixed()
        .setTranslation(modelDesc.pos.x, modelDesc.pos.y, modelDesc.pos.z)
        .setRotation(quaternion);
    const modelBody = world.createRigidBody(modelBodyDesc);

    // Capsule collider
    const colliderDesc = RAPIER.ColliderDesc.capsule(capsuleDesc.dim.hy, capsuleDesc.dim.r)
        .setTranslation(capsuleDesc.pos.x, capsuleDesc.pos.y, capsuleDesc.pos.z)
    world.createCollider(colliderDesc, modelBody)

    if (DEBUG) {
        dbgCapsuleHitbox(model, capsuleDesc);
    }

    return { model: model, modelBody: modelBody };
}

export async function createDynamicGLBObject(glbPath, scene, world, modelDesc, capsuleDesc) {
    // Mesh
    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync(glbPath);
    const model = gltf.scene;
    model.position.set(modelDesc.pos.x, modelDesc.pos.y, modelDesc.pos.z);
    model.rotation.set(modelDesc.rot.x, modelDesc.rot.y, modelDesc.rot.z);
    model.scale.set(modelDesc.scale.x, modelDesc.scale.y, modelDesc.scale.z);
    model.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true;
        }
    });
    scene.add(model);

    // Rigid body
    const quaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(modelDesc.rot.x, modelDesc.rot.y, modelDesc.rot.z));
    const modelBodyDesc = RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(modelDesc.pos.x, modelDesc.pos.y, modelDesc.pos.z)
        .setRotation(quaternion)
        .setLinearDamping(0.7)
        .setAngularDamping(0.5)
        .setAdditionalMass(10.0)
        .setCcdEnabled(true);
    const modelBody = world.createRigidBody(modelBodyDesc);

    // Capsule collider
    const colliderDesc = RAPIER.ColliderDesc.capsule(capsuleDesc.dim.hy, capsuleDesc.dim.r)
        .setTranslation(capsuleDesc.pos.x, capsuleDesc.pos.y, capsuleDesc.pos.z)
        .setFriction(1.0) // + => dec sliding
        .setRestitution(0.5); // + = inc bouncy
    world.createCollider(colliderDesc, modelBody)

    if (DEBUG) {
        dbgCapsuleHitbox(model, capsuleDesc);
    }

    return { model: model, modelBody: modelBody };
}

// not planning on using but leaving here for now for reference
export function createDynamicUnitCube(scene, world) {
    const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
    const cubeMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
    const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
    cube.castShadow = true;
    scene.add(cube);

    const cubeBodyDesc = RAPIER.RigidBodyDesc.dynamic().setTranslation(3, 12, 3);
    const cubeBody = world.createRigidBody(cubeBodyDesc);

    const cubeColliderDesc = RAPIER.ColliderDesc.cuboid(0.5, 0.5, 0.5);
    world.createCollider(cubeColliderDesc, cubeBody);

    return { model: cube, modelBody: cubeBody };
}

export function createStaticCuboid(scene, world) {
    console.log("TODO");
}