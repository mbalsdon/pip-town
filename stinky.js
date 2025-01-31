import * as THREE from './three.module.js';
import RAPIER from './rapier3d.js';
import { debugRay } from './debug.js'

const JUMP_FORCE = 5; // Increased for better jump response
const GRAVITY = -10;
const MOVE_SPEED = 4;
const ROTATION_SPEED = 0.04;
const CAMERA_DISTANCE = 5;
const CAMERA_HEIGHT = 3;

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
    // Initialize RAPIER
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

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // Create ground
    createGround();

    // Create character
    createCharacter();

    // Create sample object (cube)
    createCube();

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
    const characterGeometry = new THREE.CapsuleGeometry(0.25, 0.5);
    const characterMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000, transparent: true, opacity: 0.25 });
    character = new THREE.Mesh(characterGeometry, characterMaterial);
    character.castShadow = true;
    scene.add(character);

    const characterBodyDesc = RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(0, 1, 0)
        .lockRotations()
        .setLinearDamping(0.1); // Reduced damping for better responsiveness

    characterBody = world.createRigidBody(characterBodyDesc);

    const characterColliderDesc = RAPIER.ColliderDesc.capsule(0.25, 0.25);
    world.createCollider(characterColliderDesc, characterBody);
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
    const rayOrigin = { x: position.x, y: position.y - 0.5, z: position.z }; // TODO: tie to character size
    const rayDirection = { x: 0, y: -1, z: 0 }
    const ray = new RAPIER.Ray(rayOrigin, rayDirection);
    const maxDistance = 0.1;
    const hit = world.castRay(ray, maxDistance, true, null, null, null, characterBody);
    // debugRay(scene, rayOrigin, rayDirection, maxDistance)
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
    character.rotation.y = characterRotation;
}

function animate() {
    requestAnimationFrame(animate);

    updateCharacterPosition();
    world.step();

    const characterPosition = characterBody.translation();
    character.position.set(characterPosition.x, characterPosition.y, characterPosition.z);

    const cubePosition = cubeBody.translation();
    cube.position.set(cubePosition.x, cubePosition.y, cubePosition.z);

    updateCamera();
    renderer.render(scene, camera);
}

init();

/**
 * TODO:
 * * how to add models (characters & world)
 * * interacting with characters (just says stuff)
 * * add THINGS
 * * * veron pip
 * * * matt pip
 * * * other pips
 * * * the world
 * * * * grass n flowers
 * * * * pip town
 * * * * skybox
 * * other systems if time permits
 */