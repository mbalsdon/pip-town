// FUTURE: refactor debug tools in a more sensical way (control-wise, mainly)

import * as THREE from 'three';
import { Gyroscope } from 'three/examples/jsm/Addons.js';

//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\////\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//
//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\////\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//

let dbgConsoleElmt;
let dbgCamElmt, dbgCharElmt;

//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\////\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//
//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\////\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//

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
        0xff0000
    );
    scene.add(arrowHelper);

    // Remove after a bit
    setTimeout(() => {
        scene.remove(arrowHelper);
    }, 1000);
}

export function dbgAxesHelper(mesh) {
    const gyro = new Gyroscope();
    const axesHelper = new THREE.AxesHelper(5);
    gyro.add(axesHelper);
    mesh.add(gyro);

    // Must account for parent's scale
    axesHelper.scale.set(1/mesh.scale.x, 1/mesh.scale.y, 1/mesh.scale.z);
}

export function dbgConsoleUpdateCam(camera) {
    const xPos = camera.position.x.toFixed(2);
    const yPos = camera.position.y.toFixed(2);
    const zPos = camera.position.z.toFixed(2);

    const toDegrees = rad => (rad * 180 / Math.PI);
    const xRot = toDegrees(camera.rotation.x).toFixed(2);
    const yRot = toDegrees(camera.rotation.y).toFixed(2);
    const zRot = toDegrees(camera.rotation.z).toFixed(2);

    dbgCamElmt.innerText = `Camera:
        x: ${xPos} ${xPos < 0 ? "" : "\u00A0"}| ${xRot}°
        y: ${yPos} ${yPos < 0 ? "" : "\u00A0"}| ${yRot}°
        z: ${zPos} ${zPos < 0 ? "" : "\u00A0"}| ${zRot}°

    `;
}

export function dbgConsoleUpdateChar(characterMesh) {
    const xPos = characterMesh.position.x.toFixed(2);
    const yPos = characterMesh.position.y.toFixed(2);
    const zPos = characterMesh.position.z.toFixed(2);

    const toDegrees = (rad) => { return rad * 180 / Math.PI; };
    const xRot = toDegrees(characterMesh.rotation.x).toFixed(2);
    const yRot = toDegrees(characterMesh.rotation.y).toFixed(2);
    const zRot = toDegrees(characterMesh.rotation.z).toFixed(2);

    dbgCharElmt.innerText = `Character:
        x: ${xPos} ${xPos < 0 ? "" : "\u00A0"}| ${xRot}°
        y: ${yPos} ${yPos < 0 ? "" : "\u00A0"}| ${yRot}°
        z: ${zPos} ${zPos < 0 ? "" : "\u00A0"}| ${zRot}°
    `;
}

/**
 * REMINDER:
 * Remove any direct manipulation of mesh since the physics body should be the source of truth.
 * update() will handle syncing the visual mesh to match the physics body.
 */
export function dbgAssertObject(mesh, rigidBody) {
    if ((rigidBody.translation().x !== mesh.position.x) ||
        (rigidBody.translation().y !== mesh.position.y) ||
        (rigidBody.translation().z !== mesh.position.z))
    {
        console.log(`
            ASSERTION FAILED: rigidBody.translation() !== mesh.position 
            rigidBody.translation(): (${rigidBody.translation().x}, ${rigidBody.translation().y}, ${rigidBody.translation().z})
            mesh.position:           (${mesh.position.x}, ${mesh.position.y}, ${mesh.position.z})
        `);
    }

    if ((mesh.quaternion.x !== rigidBody.rotation().x) ||
        (mesh.quaternion.y !== rigidBody.rotation().y) ||
        (mesh.quaternion.z !== rigidBody.rotation().z) ||
        (mesh.quaternion.w !== rigidBody.rotation().w))
    {
        console.log(`
            ASSERTION FAILED: mesh.quaternion != rigidBody.rotation()
            mesh.quaternion:      (${mesh.quaternion.x}, ${mesh.quaternion.y}, ${mesh.quaternion.z}, ${mesh.quaternion.w})
            rigidBody.rotation(): (${rigidBody.rotation().x}, ${rigidBody.rotation().y}, ${rigidBody.rotation().z}, ${rigidBody.rotation().w})
        `);
    }
}

export function dbgColliderMesh(mesh, collider) {
    let geometry;
    const material = new THREE.MeshBasicMaterial({
        wireframe: true,
        color: 0x00ff00
    });

    const shape = collider.shapeType();
    if (shape === 1) { // cuboid
        const halfExtents = collider.halfExtents();
        const x = halfExtents.x * 2;
        const y = halfExtents.y * 2;
        const z = halfExtents.z * 2;
        geometry = new THREE.BoxGeometry(x, y, z);
    } else if (shape === 2) { // capsule
        const halfHeight = collider.halfHeight();
        const radius = collider.radius();
        geometry = new THREE.CapsuleGeometry(radius, halfHeight * 2);
    } else {
        throw new Error(`dbgColliderMesh - unimplemented shape ${shape}`);
    }

    // Must account for parent's scale
    geometry.scale(1/mesh.scale.x, 1/mesh.scale.y, 1/mesh.scale.z);
    mesh.add(new THREE.Mesh(geometry, material));
}

//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\////\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//
//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\////\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//
