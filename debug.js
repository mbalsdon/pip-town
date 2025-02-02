import * as THREE from 'three';
import { Gyroscope } from 'three/examples/jsm/Addons.js';

let dbgConsoleElmt;
let dbgCamElmt, dbgCharElmt;

export function createDbgConsole() {
    dbgConsoleElmt = document.createElement('div');
    dbgConsoleElmt.style.cssText = `
        position: absolute;
        top: 10px;
        left: 10px;
        color: white;
        font-family: monospace;
        background-color: rgba(0, 0, 0, 0.7);
        padding: 10px;
        border-radius: 5px;
        z-index: 100;
        pointer-events: none;
    `;

    const dbgAxesHelperElmt = document.createElement('div');
    dbgAxesHelperElmt.innerText = `Axes:
        Red = X | Green = Y | Blue = Z

    `;

    dbgCamElmt = document.createElement('div');
    dbgCharElmt = document.createElement('div');

    dbgConsoleElmt.appendChild(dbgAxesHelperElmt);
    dbgConsoleElmt.appendChild(dbgCamElmt);
    dbgConsoleElmt.appendChild(dbgCharElmt);
    document.body.appendChild(dbgConsoleElmt);
}

export function dbgRay(scene, origin, direction, length) {
    const arrowHelper = new THREE.ArrowHelper(
        new THREE.Vector3(direction.x, direction.y, direction.z).normalize(),
        new THREE.Vector3(origin.x, origin.y, origin.z),
        length,
        0xff0000 // Red color for the ray
    );
    scene.add(arrowHelper);

    // Remove the ray after a short delay for better visualization
    setTimeout(() => {
        scene.remove(arrowHelper);
    }, 1000); // 100ms delay
}

export function dbgAxesHelper(model) {
    const gyro = new Gyroscope();
    const axesHelper = new THREE.AxesHelper(5 * (1 / model.scale.x));
    gyro.add(axesHelper);
    model.add(gyro);
}

// TODO: use collider? (see dbgCuboidHitbox)
export function dbgCapsuleHitbox(model, capsuleDesc) {
    const hitboxGeometry = new THREE.CapsuleGeometry(capsuleDesc.dim.r, capsuleDesc.dim.hy * 2, 4, 16);
    hitboxGeometry.translate(capsuleDesc.pos.x, capsuleDesc.pos.y, capsuleDesc.pos.z);
    hitboxGeometry.scale((1 / model.scale.x), (1 / model.scale.y), (1 / model.scale.z));

    const hitboxMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        wireframe: true,
        transparent: true,
        opacity: 0.25
    });

    const hitboxMesh = new THREE.Mesh(hitboxGeometry, hitboxMaterial);
    model.add(hitboxMesh);

    return hitboxMesh;
}

export function dbgConsoleUpdateCam(camPos, camRot) {
    const xPos = camPos.x.toFixed(2);
    const yPos = camPos.y.toFixed(2);
    const zPos = camPos.z.toFixed(2);

    const toDegrees = rad => (rad * 180 / Math.PI);
    const xRot = toDegrees(camRot.x).toFixed(2);
    const yRot = toDegrees(camRot.y).toFixed(2);
    const zRot = toDegrees(camRot.z).toFixed(2);

    dbgCamElmt.innerText = `Camera:
        x: ${xPos} ${xPos < 0 ? "" : "\u00A0"}| ${xRot}°
        y: ${yPos} ${yPos < 0 ? "" : "\u00A0"}| ${yRot}°
        z: ${zPos} ${zPos < 0 ? "" : "\u00A0"}| ${zRot}°

    `;
}

export function dbgConsoleUpdateChar(charPos, charRot) {
    const xPos = charPos.x.toFixed(2);
    const yPos = charPos.y.toFixed(2);
    const zPos = charPos.z.toFixed(2);

    const toDegrees = rad => (rad * 180 / Math.PI);
    const xRot = toDegrees(charRot.x).toFixed(2);
    const yRot = toDegrees(charRot.y).toFixed(2);
    const zRot = toDegrees(charRot.z).toFixed(2);

    dbgCharElmt.innerText = `Character:
        x: ${xPos} ${xPos < 0 ? "" : "\u00A0"}| ${xRot}°
        y: ${yPos} ${yPos < 0 ? "" : "\u00A0"}| ${yRot}°
        z: ${zPos} ${zPos < 0 ? "" : "\u00A0"}| ${zRot}°

    `;
}

export function dbgAssertModelPos(model, modelBody) {
    if ((model.position.x !== modelBody.translation().x) ||
        (model.position.y !== modelBody.translation().y) ||
        (model.position.z !== modelBody.translation().z))
    {
        console.log(`
            ASSERTION FAILED: model.position != modelBody.translation()
            model.position:          (${model.position.x}, ${model.position.y}, ${model.position.z})
            modelBody.translation(): (${modelBody.translation().x}, ${modelBody.translation().y}, ${modelBody.translation().z})
        `);
    }
}

export function dbgCuboidHitbox(model, collider) {
    // Get collider dimensions (half-extents)
    const halfExtents = collider.halfExtents();
    const width = halfExtents.x * 2;
    const height = halfExtents.y * 2;
    const depth = halfExtents.z * 2;

    // Get collider position
    const position = collider.translation();

    // Create wireframe geometry matching collider dimensions
    const hitboxGeometry = new THREE.BoxGeometry(width, height, depth);

    // Create wireframe material
    const hitboxMaterial = new THREE.MeshBasicMaterial({
        color: 0xff0000,
        wireframe: true,
        transparent: true,
        opacity: 0.5
    });

    // Create mesh and add to group
    const hitboxMesh = new THREE.Mesh(hitboxGeometry, hitboxMaterial);

    // Set position relative to group
    hitboxMesh.position.set(
        position.x,
        position.y - halfExtents.y,
        position.z
    );

    model.add(hitboxMesh);
}

