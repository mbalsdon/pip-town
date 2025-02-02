import * as THREE from 'three';
import * as RAPIER from '@dimforge/rapier3d-compat';
import { GLTFLoader } from 'three/examples/jsm/Addons.js';
import { dbgCapsuleHitbox, dbgCuboidHitbox } from './debug';
import { DEBUG } from './consts';

const fenceLength = 5;

export function createGround(scene, world) {
    const groundDim = {hx: 50, hy: 1, hz: 50};
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
    groundModel.castShadow = false;

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

            blade.castShadow = true;
            blade.receiveShadow = true;
            flower.castShadow = true;
            flower.receiveShadow = true;

            blade.add(flower);
        }

        grassGroup.add(blade);
    }

    // Create fences
    for (let i = 0; i < 20; ++i) { // 2 * hx/fencelen
        createFence(scene, world, { x: 45.25 - (i * 5), y: 0, z: 49.75 }, 0); // 45, 50, 0
        createFence(scene, world, { x: 49.75, y: 0, z: 49.75 - (i * 5) }, Math.PI * 0.5); // 50, 50, pi/2
        createFence(scene, world, { x: -45.25 + (i * 5), y: 0 , z: -49.75 }, Math.PI); // -45, -50, pi
        createFence(scene, world, { x: -49.75, y: 0, z: -49.75 + (i * 5) }, Math.PI * 1.5); // -50, -50, 3pi/4
    }


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

export function createFence(scene, world, pos, rotY) {
    const fenceMaterial = new THREE.MeshStandardMaterial({
        color: 0x8a582d,
        roughness: 0.5,
        metalness: 0
    });

    const fenceGroup = new THREE.Group();

    const fencePostGeometry = new THREE.BoxGeometry(0.25, 2, 0.25);
    const fencePostModel = new THREE.Mesh(fencePostGeometry, fenceMaterial);
    fencePostModel.castShadow = true;

    const railGeometry = new THREE.BoxGeometry(fenceLength, 0.25, 0.25);
    const upperRailModel = new THREE.Mesh(railGeometry, fenceMaterial);
    const lowerRailModel = new THREE.Mesh(railGeometry, fenceMaterial);
    upperRailModel.castShadow = true;
    lowerRailModel.castShadow = true;
    upperRailModel.position.set(2, 0.5, 0);
    lowerRailModel.position.set(2, 0, 0);

    fenceGroup.add(fencePostModel);
    fenceGroup.add(upperRailModel);
    fenceGroup.add(lowerRailModel);
    fenceGroup.translateY(1);
    scene.add(fenceGroup);

    const fenceBodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(0, 1, 0);
    const fenceBody = world.createRigidBody(fenceBodyDesc);

    const fenceColliderDesc = RAPIER.ColliderDesc.cuboid(2.5, 1, 0.125).setTranslation(2, 0, 0);
    const fenceCollider = world.createCollider(fenceColliderDesc, fenceBody);

    fenceGroup.position.add(new THREE.Vector3(pos.x, pos.y, pos.z));
    const fbp = fenceBody.translation();
    fenceBody.setTranslation({ x: fbp.x + pos.x, y: fbp.y + pos.y, z: fbp.z + pos.z});

    const rot = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotY);
    fenceGroup.setRotationFromQuaternion(rot);
    fenceBody.setRotation(rot);

    if (DEBUG) {
        dbgCuboidHitbox(fenceGroup, fenceCollider);
    }

    return [fenceGroup, fenceBody];
}

export function createStaticCuboid(scene, world, color, dim) {
    const boxGeometry = new THREE.BoxGeometry(dim.hx * 2, dim.hy * 2, dim.hz * 2);
    const boxMaterial = new THREE.MeshPhongMaterial({ color: color, shininess: 30, specular: 0x444444});
    const boxModel = new THREE.Mesh(boxGeometry, boxMaterial);
    boxModel.castShadow = true;
    boxModel.receiveShadow = true;
    boxModel.translateY(dim.hy);
    scene.add(boxModel);

    const boxBodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(0, dim.hy, 0);
    const boxBody = world.createRigidBody(boxBodyDesc);
    const boxColliderDesc = RAPIER.ColliderDesc.cuboid(dim.hx, dim.hy, dim.hz);
    const boxCollider = world.createCollider(boxColliderDesc, boxBody);

    if (DEBUG) {
        dbgCuboidHitbox(boxModel, boxCollider);
    }

    return [boxModel, boxBody];
}

export function translateModelAndBody(model, body, relPos) {
    model.position.add(new THREE.Vector3(relPos.x, relPos.y, relPos.z));
    const bodyPos = body.translation();
    body.setTranslation({ x: bodyPos.x + relPos.x, y: bodyPos.y + relPos.y, z: bodyPos.z + relPos.z });
}

// TODO: rotY, roofColor, add random variation to wall colors?
export function createHouse1(scene, world, pos, rotY) {
    const wallDim = { length: 10, height: 4, width: 0.5 };

    // blank walls
    const [wallModel1, wallBody1] = createStaticCuboid(scene, world, 0xa65e32, { hx: wallDim.length/2, hy: wallDim.height/2, hz: wallDim.width/2 });
    translateModelAndBody(wallModel1, wallBody1, { x: 0 + pos.x, y: 1 + pos.y, z: -wallDim.length/2 + pos.z });
    const [wallModel2, wallBody2] = createStaticCuboid(scene, world, 0xa65e32, { hx: wallDim.width/2, hy: wallDim.height/2, hz: wallDim.length/2 });
    translateModelAndBody(wallModel2, wallBody2, { x: wallDim.length/2 + pos.x, y: 1 + pos.y, z: 0 + pos.z });

    // window wall
    const [windowWallModelL, windowWallBodyL] = createStaticCuboid(scene, world, 0xa65e32, { hx: wallDim.length/6, hy: wallDim.height/2, hz: wallDim.width/2});
    translateModelAndBody(windowWallModelL, windowWallBodyL, {x: (wallDim.length/3)+pos.x, y: 1+pos.y, z: (wallDim.length/2)+pos.z});
    const [windowWallModelR, windowWallBodyR] = createStaticCuboid(scene, world, 0xa65e32, { hx: wallDim.length/6, hy: wallDim.height/2, hz: wallDim.width/2});
    translateModelAndBody(windowWallModelR, windowWallBodyR, {x: -(wallDim.length/3)+pos.x, y: 1+pos.y, z: (wallDim.length/2)+pos.z});
    const [windowWallModelB, windowWallBodyB] = createStaticCuboid(scene, world, 0xa65e32, { hx: wallDim.length/6, hy: wallDim.height/6, hz: wallDim.width/2});
    translateModelAndBody(windowWallModelB, windowWallBodyB, {x: 0+pos.x, y: 1+pos.y, z: (wallDim.length/2)+pos.z});
    const [windowWallModelT, windowWallBodyT] = createStaticCuboid(scene, world, 0xa65e32, { hx: wallDim.length/6, hy: wallDim.height/12, hz: wallDim.width/2});
    translateModelAndBody(windowWallModelT, windowWallBodyT, {x: 0+pos.x, y: 1+(wallDim.height/1.2)+pos.y, z: (wallDim.length/2)+pos.z});

    // door wall
    const [doorWallModel1, doorWallBody1] = createStaticCuboid(scene, world, 0xa65e32, { hx: wallDim.width/2, hy: wallDim.height/2, hz: wallDim.length*0.25}); // long door wall
    translateModelAndBody(doorWallModel1, doorWallBody1, { x: (-wallDim.length/2) + pos.x, y: 1 + pos.y, z: 2.5 + pos.z });
    const [doorWallModel2, doorWallBody2] = createStaticCuboid(scene, world, 0xa65e32, { hx: wallDim.width/2, hy: wallDim.height/2, hz: wallDim.length*0.15}); // short door wall
    translateModelAndBody(doorWallModel2, doorWallBody2, { x: (-wallDim.length/2) + pos.x, y: 1 + pos.y, z: -3.5 + pos.z });
    const [doorWallModel3, doorWallBody3] = createStaticCuboid(scene, world, 0xa65e32, { hx: wallDim.width/2, hy: wallDim.height/8, hz: wallDim.length*0.1}); // door overhead
    translateModelAndBody(doorWallModel3, doorWallBody3, { x: (-wallDim.length/2) + pos.x, y: 1 + wallDim.height*0.75 + pos.y, z: -1 + pos.z });

    // floors
    const [floorModel, floorBody] = createStaticCuboid(scene, world, 0xc98155, { hx: wallDim.length/2, hy: wallDim.width/2, hz: wallDim.length/2});
    translateModelAndBody(floorModel, floorBody, { x: 0+pos.x, y: 1+pos.y, z: 0+pos.z});
    const [patioFloorModel, patioFloorBody] = createStaticCuboid(scene, world, 0xc98155, { hx: wallDim.length/6, hy: wallDim.width/2, hz: wallDim.length/3})
    translateModelAndBody(patioFloorModel, patioFloorBody, { x: -(wallDim.length/1.5)+pos.x, y: 1+pos.y, z: -(wallDim.length/6)+pos.z});

    // stilts
    const [stiltModel1, stiltBody1] = createStaticCuboid(scene, world, 0xd17b47, { hx: 0.2, hy: 0.5+wallDim.height/2, hz: 0.2 });
    translateModelAndBody(stiltModel1, stiltBody1, { x: (wallDim.length/2)+pos.x, y: 0+pos.y, z: (wallDim.length/2)+pos.z});
    const [stiltModel2, stiltBody2] = createStaticCuboid(scene, world, 0xd17b47, { hx: 0.2, hy: 0.5+wallDim.height/2, hz: 0.2 });
    translateModelAndBody(stiltModel2, stiltBody2, { x: (wallDim.length/2)+pos.x, y: 0+pos.y, z: -(wallDim.length/2)+pos.z});
    const [stiltModel3, stiltBody3] = createStaticCuboid(scene, world, 0xd17b47, { hx: 0.2, hy: 0.5+wallDim.height/2, hz: 0.2 });
    translateModelAndBody(stiltModel3, stiltBody3, { x: -(wallDim.length/2)+pos.x, y: 0+pos.y, z: (wallDim.length/2)+pos.z});
    const [stiltModel4, stiltBody4] = createStaticCuboid(scene, world, 0xd17b47, { hx: 0.2, hy: 0.5+wallDim.height/2, hz: 0.2 });
    translateModelAndBody(stiltModel4, stiltBody4, { x: -(wallDim.length/2)+pos.x, y: 0+pos.y, z: -(wallDim.length/2)+pos.z});

    const [patioStiltModel1, patioStiltBody1] = createStaticCuboid(scene, world, 0xd17b47, { hx: 0.2, hy: 0.5+wallDim.height/2, hz: 0.2});
    translateModelAndBody(patioStiltModel1, patioStiltBody1, {x: -5+pos.x, y: 0+pos.y, z: 1.63+pos.z});
    const [patioStiltModel2, patioStiltBody2] = createStaticCuboid(scene, world, 0xd17b47, { hx: 0.2, hy: 0.5+wallDim.height/2, hz: 0.2});
    translateModelAndBody(patioStiltModel2, patioStiltBody2, {x: -8.4+pos.x, y: 0+pos.y, z: 1.63+pos.z});
    const [patioStiltModel3, patioStiltBody3] = createStaticCuboid(scene, world, 0xd17b47, { hx: 0.2, hy: 0.5+wallDim.height/2, hz: 0.2});
    translateModelAndBody(patioStiltModel3, patioStiltBody3, {x: -8.4+pos.x, y: 0+pos.y, z: -5+pos.z});

    // entrance stairs
    const [stepModel1, stepBody1] = createStaticCuboid(scene, world, 0xd17b47, { hx: 0.25, hy: 0.25, hz: 1 });
    translateModelAndBody(stepModel1, stepBody1, {x: -8.5+pos.x, y: 1+pos.y, z: -1+pos.z});
    const [stepModel2, stepBody2] = createStaticCuboid(scene, world, 0xd17b47, { hx: 0.25, hy: 0.25, hz: 1 });
    translateModelAndBody(stepModel2, stepBody2, {x: -8.75+pos.x, y: 0.75+pos.y, z: -1+pos.z});
    const [stepModel3, stepBody3] = createStaticCuboid(scene, world, 0xd17b47, { hx: 0.25, hy: 0.25, hz: 1 });
    translateModelAndBody(stepModel3, stepBody3, {x: -9.0+pos.x, y: 0.5+pos.y, z: -1+pos.z});
    const [stepModel4, stepBody4] = createStaticCuboid(scene, world, 0xd17b47, { hx: 0.25, hy: 0.25, hz: 1 });
    translateModelAndBody(stepModel4, stepBody4, {x: -9.25+pos.x, y: 0.25+pos.y, z: -1+pos.z});
    const [stepModel5, stepBody5] = createStaticCuboid(scene, world, 0xd17b47, { hx: 0.25, hy: 0.25, hz: 1 });
    translateModelAndBody(stepModel5, stepBody5, {x: -9.5+pos.x, y: 0+pos.y, z: -1+pos.z});
    const [stepModel6, stepBody6] = createStaticCuboid(scene, world, 0xd17b47, { hx: 0.25, hy: 0.25, hz: 1 });
    translateModelAndBody(stepModel6, stepBody6, {x: -9.75+pos.x, y: -0.25+pos.y, z: -1+pos.z});

    // roof
    for (let i = 0; i < 4; ++i) {
        const [roofModel, roofBody] = createStaticCuboid(scene, world, 0x2d5c40, { hx: (wallDim.length/1.7)-i, hy: 0.5, hz: (wallDim.length/1.7)-i});
        translateModelAndBody(roofModel, roofBody, {x: 0+pos.x, y: 1+(wallDim.height+i)+pos.y, z: 0+pos.z});
    }
    const [patioRoofModel, patioRoofBody] = createStaticCuboid(scene, world, 0x2d5c40, {hx: wallDim.length/4, hy: 0.25, hz: wallDim.length/2.5});
    translateModelAndBody(patioRoofModel, patioRoofBody, {x: -(wallDim.length/1.5)+pos.x, y: 1+(wallDim.height-0.25)+pos.y, z: -(wallDim.length/6)+pos.z});
}
