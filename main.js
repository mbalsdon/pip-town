import * as THREE from 'three';
import * as RAPIER from '@dimforge/rapier3d-compat';
import { GLTFLoader } from 'three/examples/jsm/Addons.js';
import { debugCapsuleHitbox, debugRay } from './debug';

const DEBUG = false;

const JUMP_FORCE = 5; // Increased for better jump response
const GRAVITY = -10;
const MOVE_SPEED = 4;
const ROTATION_SPEED = 0.04;
const CAMERA_DISTANCE = 3;
const CAMERA_HEIGHT = 1;

let isGrounded = false;
let jumpRequested = false;

let camera, scene, renderer, world;
let character, characterBody;
let cube, cubeBody;
let characterRotation = 0;

const keys = {
    w: false,
    s: false,
    a: false,
    d: false,
};

async function init() {
    // Initialize Rapier3D
    await RAPIER.init();

    // Create physics world
    world = new RAPIER.World({ x: 0.0, y: GRAVITY, z: 0.0 });

    // Create Three.js scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);

    // Setup camera
    camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, CAMERA_HEIGHT, CAMERA_DISTANCE);

    // Setup renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 5, 5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // Create ground
    createGround();

    // Create character
    createCharacter();

    // Create sample object (cube)
    createCube();

    // Add static GLB objects
    addStaticGLBObject('./assets/pip_original.glb', { x: 5, y: -4, z: 0 }, { x: 0, y: 0, z: 0 }, { x: 0.025, y: 0.025, z: 0.025 });
    addStaticGLBObject('./assets/pip_original.glb', { x: -5, y: -4, z: 0 }, { x: 0, y: 0, z: 0 }, { x: 0.025, y: 0.025, z: 0.025 });

    // Setup controls
    setupControls();

    // Handle window resize
    window.addEventListener('resize', onWindowResize, false);

    animate();
}

function createGround() {
    const groundGeometry = new THREE.BoxGeometry(20, 20, 20);
    groundGeometry.translate(0, 0, -15);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x808080,
        roughness: 0.8,
        metalness: 0.2
    });
    const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);

    const groundColliderDesc = RAPIER.ColliderDesc.cuboid(10, 10, 10).setTranslation(0, -15, 0);;
    world.createCollider(groundColliderDesc);
}

function createCharacter() {
    // Load the GLB model
    const loader = new GLTFLoader();
    loader.load("./assets/pip_original.glb", (gltf) => {
        const model = gltf.scene;

        // Optionally, you can scale or position the model if needed
        model.scale.set(0.025, 0.025, 0.025);
        model.position.set(0, 0, 0);

        // Add the model to the scene
        scene.add(model);

        // Replace the character with the model
        character = model;

        // You can also set the model to cast shadows if needed
        model.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
            }
        });
    }, undefined, (error) => {
        console.error('An error occurred while loading the GLB model:', error);
    });

    // Create the character's rigid body
    const characterBodyDesc = RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(0, 0, 0)
        .lockRotations()
        .setLinearDamping(0.1); // Reduced damping for better responsiveness

    characterBody = world.createRigidBody(characterBodyDesc);

    // Create the capsule collider (adjust the size to fit your model)
    const capsuleHalfHeight = 0.1
    const capsuleRadius = 1;
    const capsuleOffsetY = 0.2;
    const characterColliderDesc = RAPIER.ColliderDesc.capsule(capsuleHalfHeight, capsuleRadius)
        .setTranslation(0, capsuleOffsetY, 0); // Adjust these values as needed
    world.createCollider(characterColliderDesc, characterBody);

    if (DEBUG) debugCapsuleHitbox(scene, characterBody, capsuleRadius, capsuleHalfHeight, capsuleOffsetY);
}

function createCube() {
    const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
    const cubeMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
    cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
    cube.castShadow = true;
    scene.add(cube);

    const cubeBodyDesc = RAPIER.RigidBodyDesc.dynamic().setTranslation(3, 2, 3);
    cubeBody = world.createRigidBody(cubeBodyDesc);

    const cubeColliderDesc = RAPIER.ColliderDesc.cuboid(0.5, 0.5, 0.5);
    world.createCollider(cubeColliderDesc, cubeBody);
}

function addStaticGLBObject(path, position, rotation, scale) {
    const loader = new GLTFLoader();
    loader.load(path, (gltf) => {
        const model = gltf.scene;

        // Set position, rotation, and scale
        model.position.set(position.x, position.y, position.z);
        model.rotation.set(rotation.x, rotation.y, rotation.z);
        model.scale.set(scale.x, scale.y, scale.z);

        // Add the model to the scene
        scene.add(model);

        // Create a static rigid body for the object
        const bodyDesc = RAPIER.RigidBodyDesc.fixed()
            .setTranslation(position.x, position.y, position.z)
            .setRotation({ x: rotation.x, y: rotation.y, z: rotation.z, w: 1 });

        const body = world.createRigidBody(bodyDesc);

        // Create a collider for the object (assuming it's a box for simplicity)
        const colliderDesc = RAPIER.ColliderDesc.cuboid(scale.x, scale.y, scale.z);
        world.createCollider(colliderDesc, body);

        // Optionally, set the model to cast shadows
        model.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
            }
        });
    }, undefined, (error) => {
        console.error('An error occurred while loading the GLB model:', error);
    });
}

function setupControls() {
    document.addEventListener('keydown', (event) => {
        if (event.key === ' ') {
            jumpRequested = true;
        } else if (keys.hasOwnProperty(event.key)) {
            keys[event.key] = true;
        }
    });

    document.addEventListener('keyup', (event) => {
        if (event.key === ' ') {
            jumpRequested = false; // Corrected: Reset jumpRequested on keyup
        } else if (keys.hasOwnProperty(event.key)) {
            keys[event.key] = false;
        }
    });
}

function updateCamera() {
    const characterPosition = characterBody.translation();
    const cameraX = characterPosition.x - Math.sin(characterRotation) * CAMERA_DISTANCE;
    const cameraZ = characterPosition.z - Math.cos(characterRotation) * CAMERA_DISTANCE;

    camera.position.set(cameraX, characterPosition.y + CAMERA_HEIGHT, cameraZ);
    camera.lookAt(characterPosition.x, characterPosition.y, characterPosition.z);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function updateCharacterPosition() {
    const position = characterBody.translation();

    // Update rotation based on A/D keys
    if (keys.a) characterRotation += ROTATION_SPEED;
    if (keys.d) characterRotation -= ROTATION_SPEED;

    // Calculate movement direction based on current rotation
    const forward = new THREE.Vector3(
        Math.sin(characterRotation),
        0,
        Math.cos(characterRotation)
    ).normalize();

    let movement = new THREE.Vector3();

    // Apply movement only if W or S is pressed
    if (keys.w) movement.add(forward);
    if (keys.s) movement.sub(forward);

    // Normalize movement to ensure consistent speed in all directions
    if (movement.length() > 0) {
        movement.normalize().multiplyScalar(MOVE_SPEED);
    }

    // Get current velocity
    const currentVelocity = characterBody.linvel();

    // Set linear velocity directly (preserve Y velocity for gravity/jumping)
    characterBody.setLinvel(
        {
            x: movement.x,
            y: currentVelocity.y, // Preserve vertical velocity
            z: movement.z
        },
        true
    );

    // Ground detection raycast
    const rayOrigin = { x: position.x, y: position.y - 0.5, z: position.z };
    const rayDirection = { x: 0, y: -1, z: 0 };
    const ray = new RAPIER.Ray(rayOrigin, rayDirection);
    const maxDistance = 0.5;
    const hit = world.castRay(ray, maxDistance, true, null, null, null, characterBody);
    if (DEBUG) debugRay(scene, rayOrigin, rayDirection, maxDistance)
    isGrounded = hit !== null;

    // Handle jumping
    if (jumpRequested && isGrounded) {
        characterBody.setLinvel(
            {
                x: currentVelocity.x,
                y: JUMP_FORCE, // Apply jump force
                z: currentVelocity.z
            },
            true
        );
        jumpRequested = false;
    }

    // Update visual rotation of character mesh
    if (character) {
        character.rotation.y = characterRotation; // Rotate the entire GLB model
    }
}

function animate() {
    requestAnimationFrame(animate);

    // Update character position and physics
    updateCharacterPosition();
    world.step();

    // Update character position (GLB model)
    if (character) { // Ensure character is defined
        const characterPosition = characterBody.translation();
        character.position.set(characterPosition.x, characterPosition.y, characterPosition.z);
    }

    // Update cube position (if needed)
    const cubePosition = cubeBody.translation();
    cube.position.set(cubePosition.x, cubePosition.y, cubePosition.z);

    // Update camera and render the scene
    updateCamera();
    renderer.render(scene, camera);
}

init();

/**
 * TODO:
 * * build out the world
 * * * matt pip & veron pip
 * * * grass & flowers
 * * * pip town
 * * * lighting 
 *
 * * interaction system
 * * * press E when near enough
 * * * speech bubble overlay (html) appears with A. cahracter name B. 2d character image C. text
 * 
 * * polish
 * * * better hitboxes
 * * * more pips
 * * * more world building
 * * * more systems if time permits
 * 
 * * ideas
 * * * cannon shoot a pip
 * * * something with dynamic bodies
 * * * * button that spawns pips
 * * * crash land alien pip
 * 
 * * clean up the code dipshit
 */