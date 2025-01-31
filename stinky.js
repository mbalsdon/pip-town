import * as THREE from './three.module.js';
import RAPIER from './rapier3d.js';

let camera, scene, renderer, world;
let character, characterBody;
let cube, cubeBody;
let characterRotation = 0; // Track character rotation

const keys = {
    w: false,
    s: false,
    a: false,
    d: false
};

async function init() {
    // Initialize RAPIER
    await RAPIER.init();
    
    // Create physics world
    world = new RAPIER.World({ x: 0.0, y: -9.81, z: 0.0 });

    // Create Three.js scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);

    // Setup camera
    camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 5, 10);

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
    const groundGeometry = new THREE.PlaneGeometry(20, 20);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x808080,
        roughness: 0.8,
        metalness: 0.2
    });
    const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);

    const groundColliderDesc = RAPIER.ColliderDesc.cuboid(10, 0.1, 10);
    world.createCollider(groundColliderDesc);
}

function createCharacter() {
    // Create character mesh
    const characterGeometry = new THREE.BoxGeometry(1, 1, 1);
    const characterMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    character = new THREE.Mesh(characterGeometry, characterMaterial);
    character.castShadow = true;
    scene.add(character);

    // Create character physics body
    const characterBodyDesc = RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(0, 0.5, 0)  // Position adjusted to half the height
        .lockRotations()  // Prevent physics from rotating the body
        .setLinearDamping(1.0);  // Add damping to prevent sliding
    characterBody = world.createRigidBody(characterBodyDesc);

    const characterColliderDesc = RAPIER.ColliderDesc.cuboid(0.5, 0.5, 0.5);
    world.createCollider(characterColliderDesc, characterBody);
}

function createCube() {
    // Create cube mesh
    const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
    const cubeMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
    cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
    cube.castShadow = true;
    scene.add(cube);

    // Create cube physics body
    const cubeBodyDesc = RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(3, 2, 3);
    cubeBody = world.createRigidBody(cubeBodyDesc);

    const cubeColliderDesc = RAPIER.ColliderDesc.cuboid(0.5, 0.5, 0.5);
    world.createCollider(cubeColliderDesc, cubeBody);
}

function setupControls() {
    document.addEventListener('keydown', (event) => {
        if (keys.hasOwnProperty(event.key)) {
            keys[event.key] = true;
        }
    });

    document.addEventListener('keyup', (event) => {
        if (keys.hasOwnProperty(event.key)) {
            keys[event.key] = false;
        }
    });
}

function updateCamera() {
    const characterPosition = characterBody.translation();
    const cameraDistance = 5;
    
    // Calculate camera position based on character rotation
    const cameraX = characterPosition.x - Math.sin(characterRotation) * cameraDistance;
    const cameraZ = characterPosition.z - Math.cos(characterRotation) * cameraDistance;
    
    camera.position.set(
        cameraX,
        characterPosition.y + 3, // Keep camera height constant
        cameraZ
    );
    camera.lookAt(characterPosition.x, characterPosition.y, characterPosition.z);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function updateCharacterPosition() {
    const moveSpeed = 0.1;
    const rotationSpeed = 0.05;
    const position = characterBody.translation();
    
    // Update rotation based on A/D keys
    if (keys.a) characterRotation += rotationSpeed;
    if (keys.d) characterRotation -= rotationSpeed;
    
    // Calculate movement direction based on current rotation
    let deltaX = 0;
    let deltaZ = 0;
    
    if (keys.w) {
        deltaX = Math.sin(characterRotation) * moveSpeed;
        deltaZ = Math.cos(characterRotation) * moveSpeed;
    }
    if (keys.s) {
        deltaX = -Math.sin(characterRotation) * moveSpeed;
        deltaZ = -Math.cos(characterRotation) * moveSpeed;
    }

    characterBody.setTranslation(
        { 
            x: position.x + deltaX, 
            y: position.y, 
            z: position.z + deltaZ 
        }, 
        true
    );
    
    // Update visual rotation of character mesh
    character.rotation.y = characterRotation;
}

function animate() {
    requestAnimationFrame(animate);

    // Update character position and rotation based on current key states
    updateCharacterPosition();

    // Step the physics world
    world.step();

    // Update meshes based on physics
    const characterPosition = characterBody.translation();
    character.position.set(characterPosition.x, characterPosition.y, characterPosition.z);

    const cubePosition = cubeBody.translation();
    cube.position.set(cubePosition.x, cubePosition.y, cubePosition.z);

    // Update camera to follow character
    updateCamera();

    renderer.render(scene, camera);
}

// Start the application
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