import * as THREE from 'three';
import * as RAPIER from '@dimforge/rapier3d-compat';
import { GLTFLoader } from 'three/examples/jsm/Addons.js';
import { createDbgConsole, dbgAxesHelper, dbgCapsuleHitbox, dbgRay, dbgConsoleUpdateCam, dbgConsoleUpdateChar, dbgAssertModelPos } from './debug';
import { setupCamera, setupPhysicsWorld, setupRenderer, setupScene } from './init';
import { createDynamicUnitCube, createDynamicGLBObject, createGround, createStaticGLBObject } from './objects';
import { DEBUG, FPS, OBJ_PIP, JUMP_FORCE, MOVE_SPEED, ROTATION_SPEED, JUMP_RAY_DISTANCE, SPAWN_POSITION } from './consts'

let lastTime = 0;

let camera, controls, scene, renderer, world;

let characterModel, characterBody;
let characterRotation = 0;

const fixedObjects = {};
const dynamicObjects = {};
const alwaysRender = [];

const keys = {
    w: false,
    s: false,
    a: false,
    d: false,
};

async function init() {
    await RAPIER.init();

    world = setupPhysicsWorld();
    scene = setupScene();
    renderer = setupRenderer();
    [camera, controls] = setupCamera(renderer);

    // Add lights TODO: lights fns
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(0, 15, 0);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    const groundModel = createGround(scene, world);
    await createCharacter();

    alwaysRender.push(groundModel);
    alwaysRender.push(characterModel);

    // Static objects
    fixedObjects["pip1"] = await createStaticGLBObject(
        "./assets/pip_original.glb",
        scene, world,
        {
            pos: { x: -5.0, y: 0.9, z: 0.0 },
            rot: { x: 0.0, y: 0.0, z: 0.0 },
            scale: { x: OBJ_PIP.scaleFactor, y: OBJ_PIP.scaleFactor, z: OBJ_PIP.scaleFactor }
        },
        OBJ_PIP.hitbox
    );

    fixedObjects["pip2"] = await createStaticGLBObject(
        "./assets/pip_original.glb",
        scene, world,
        {
            pos: { x: 5.0, y: 0.9, z: 0.0},
            rot: { x: 0.0, y: 0.0, z: 0.0 },
            scale: { x: OBJ_PIP.scaleFactor, y: OBJ_PIP.scaleFactor, z: OBJ_PIP.scaleFactor }
        },
        OBJ_PIP.hitbox
    );

    // Dynamic objects
    dynamicObjects["cube1"] = createDynamicUnitCube(scene, world);
    dynamicObjects["pip3"] = await createDynamicGLBObject(
        "./assets/pip_original.glb",
        scene, world,
        {
            pos: { x: 2.0, y: 10, z: 2.0},
            rot: { x: 0.0, y: 0.0, z: 0.0 },
            scale: { x: OBJ_PIP.scaleFactor, y: OBJ_PIP.scaleFactor, z: OBJ_PIP.scaleFactor }
        },
        OBJ_PIP.hitbox
    );

    setupControls();
    window.addEventListener('resize', onWindowResize, false);

    if (DEBUG) {
        createDbgConsole();
    }

    animate();
}

async function createCharacter() {
    // Mesh
    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync("./assets/pip_original.glb");
    characterModel = gltf.scene;
    characterModel.scale.set(OBJ_PIP.scaleFactor, OBJ_PIP.scaleFactor, OBJ_PIP.scaleFactor);
    characterModel.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true;
        }
    });
    scene.add(characterModel);
    
    // Rigid body
    const characterBodyDesc = RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(SPAWN_POSITION.x, SPAWN_POSITION. y, SPAWN_POSITION.z)
        .lockRotations()
        .setLinearDamping(0.1);

    characterBody = world.createRigidBody(characterBodyDesc);

    // Capsule collider
    const capsuleDesc = OBJ_PIP.hitbox;
    const characterColliderDesc = RAPIER.ColliderDesc.capsule(capsuleDesc.dim.hy, capsuleDesc.dim.r)
        .setTranslation(capsuleDesc.pos.x, capsuleDesc.pos.y, capsuleDesc.pos.z);

    world.createCollider(characterColliderDesc, characterBody);

    if (DEBUG) {
        dbgAxesHelper(characterModel);
        dbgCapsuleHitbox(characterModel, capsuleDesc);
    }
}

function setupControls() {
    document.addEventListener('keydown', (event) => {
        const k = event.key.toLowerCase();
        if (k === ' ') {
            keys.space = true;
        } else if (keys.hasOwnProperty(k)) {
            keys[k] = true;
        }
    });

    document.addEventListener('keyup', (event) => {
        const k = event.key.toLowerCase();
        if (k === ' ') {
            keys.space = false;
        } else if (keys.hasOwnProperty(k)) {
            keys[k] = false;
        }
    });
}

function updateCamera() {
    const characterPosition = characterBody.translation();
    controls.target.set(characterPosition.x, characterPosition.y, characterPosition.z);
    controls.update();

    if (DEBUG) {
        dbgConsoleUpdateCam(camera.position, camera.rotation);
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function updateCharacterPosition() {
    const position = characterBody.translation();

    // Reset position if out of bounds
    if (position.y < -100.0) {
        characterBody.setTranslation(SPAWN_POSITION, true);
        characterBody.setLinvel(SPAWN_POSITION, true);
        return;
    }

    // Update rotation
    if (keys.a) characterRotation += ROTATION_SPEED;
    if (keys.d) characterRotation -= ROTATION_SPEED;

    // Calculate movement direction based on current rotation
    const forward = new THREE.Vector3(
        Math.sin(characterRotation),
        0,
        Math.cos(characterRotation)
    ).normalize();

    
    // Apply movement only if W or S is pressed
    let movement = new THREE.Vector3();
    if (keys.w) movement.add(forward);
    if (keys.s) movement.sub(forward);
    movement.normalize().multiplyScalar(MOVE_SPEED);

    // Set linear velocity
    const currentVelocity = characterBody.linvel();
    characterBody.setLinvel({ x: movement.x, y: currentVelocity.y, z: movement.z }, true);

    // Ground detection raycast
    const rayOrigin = { x: position.x, y: position.y - 0.5, z: position.z };
    const rayDirection = { x: 0, y: -1, z: 0 };
    const ray = new RAPIER.Ray(rayOrigin, rayDirection);
    const hit = world.castRay(ray, JUMP_RAY_DISTANCE, true, null, null, null, characterBody);

    // Only allow jumps if on ground
    if (keys.space && (hit !== null)) {
        characterBody.setLinvel({ x: currentVelocity.x, y: JUMP_FORCE, z: currentVelocity.z }, true);
    }

    // Update character (mesh) visual
    characterModel.rotation.y = characterRotation;
    const charBodyPos = characterBody.translation();
    characterModel.position.set(charBodyPos.x, charBodyPos.y, charBodyPos.z);

    if (DEBUG) {
        dbgRay(scene, rayOrigin, rayDirection, JUMP_RAY_DISTANCE);
        dbgConsoleUpdateChar(characterModel.position, characterModel.rotation);
        // dbgAssertModelPos(characterModel, characterBody);
    }
}

function isPartOfCharacter(obj) {
    let parent = obj.parent;
    while (parent) {
        if (parent === characterModel) return true;
        parent = parent.parent;
    }
    return false;
}

function animate(currentTime) {
    requestAnimationFrame(animate);

    // Physics/visual updates tied to FPS
    if ((currentTime - lastTime) >= (1000 / FPS)) {
        world.timestep = 1 / FPS;
        world.step();

        updateCharacterPosition();
        updateCamera();

        // Update visual positions of objects
        for (const obj of Object.values(dynamicObjects)) {
            const objPos = obj.modelBody.translation();
            const objRot = obj.modelBody.rotation();
            obj.model.position.set(objPos.x, objPos.y, objPos.z);
            obj.model.quaternion.set(objRot.x, objRot.y, objRot.z, objRot.w);
        }
    
        // Only render objects within a certain distance of the camera
        scene.traverse((obj) => {
            if (obj.isMesh && !isPartOfCharacter(obj) && !alwaysRender.includes(obj)) {
                const distToCam = camera.position.distanceTo(obj.position);
                obj.visible = (distToCam < window.renderDistance);
            }
        });
    
        renderer.render(scene, camera);

        lastTime = currentTime;
    }
}

init();

/**
 *
 * 
 * TODO:
 *
 * * list of always-rendered things (ground, character, ...)
 * * check TODOs
 * 
 * * build out the world
 * * * matt pip & veron pip
 * * * pip town
 * * * lighting 
 * 
 * * interaction system
 * * * press E when near enough
 * * * speech bubble overlay (html) appears with A. cahracter name B. 2d character image C. text
 * 
 * * settings menu (fps, render distance)
 * * possible to have camera not go through objects (i.e. ground)?
 * * better hitboxes (convexhull? or just cuboid?)
 * 
 * * polish
 * * * moving pips?
 * * * more pips
 * * * bob
 * * * more world building
 * * * more systems if time permits
 * 
 * 
 * * ideas
 * * * cannon shoot a pip
 * * * something with dynamic bodies
 * * * * button that spawns pips
 * * * crash land alien pip
 * 
 * * clean up the code dipshit
 */