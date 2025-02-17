import * as THREE from 'three';
import { Gyroscope } from 'three/examples/jsm/Addons.js';

//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\////\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//
//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\////\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//

// FUTURE: finer-grained ctrl

let dbgConsoleElmt;
let dbgTickElmt, dbgCamElmt, dbgCharElmt, dbgDayNightElmt;

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
    dbgAxesHelperElmt.innerText = `-- Axes:
        Red = X | Green = Y | Blue = Z

    `;

    dbgTickElmt = document.createElement('div');
    dbgCamElmt = document.createElement('div');
    dbgCharElmt = document.createElement('div');
    dbgDayNightElmt = document.createElement('div')

    dbgConsoleElmt.appendChild(dbgAxesHelperElmt);
    dbgConsoleElmt.appendChild(dbgTickElmt);
    dbgConsoleElmt.appendChild(dbgCamElmt);
    dbgConsoleElmt.appendChild(dbgCharElmt);
    dbgConsoleElmt.appendChild(dbgDayNightElmt);
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
        arrowHelper.dispose();
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

let lastTickTime = 0;
const circleBufSize = 100;
const tickTimesCircleBuf = new Array(circleBufSize).fill(0);
let tickIdx = 0;
export function dbgConsoleTimeTicks(currTickTime) {
    const dt = currTickTime - lastTickTime;

    tickTimesCircleBuf[tickIdx] = dt;
    tickIdx = (tickIdx + 1) % circleBufSize;

    let avg = 0;
    for (const tickTime of tickTimesCircleBuf) {
        avg += tickTime;
    }

    dbgTickElmt.innerText = `-- Ticks:
        Last:      ${Math.round(dt)}ms (${Math.round(1000/dt)}fps)
        Avg: \u00A0${Math.round(avg/circleBufSize)}ms (${Math.round(1000*(circleBufSize/avg))}fps)

    `;
    lastTickTime = currTickTime;
}

export function dbgConsoleCamera(camera) {
    const xPos = camera.position.x.toFixed(2);
    const yPos = camera.position.y.toFixed(2);
    const zPos = camera.position.z.toFixed(2);

    const toDegrees = rad => (rad * 180 / Math.PI);
    const xRot = toDegrees(camera.rotation.x).toFixed(2);
    const yRot = toDegrees(camera.rotation.y).toFixed(2);
    const zRot = toDegrees(camera.rotation.z).toFixed(2);

    dbgCamElmt.innerText = `-- Camera:
        x: ${xPos} ${xPos < 0 ? "" : "\u00A0"}| ${xRot}°
        y: ${yPos} ${yPos < 0 ? "" : "\u00A0"}| ${yRot}°
        z: ${zPos} ${zPos < 0 ? "" : "\u00A0"}| ${zRot}°

    `;
}

export function dbgConsoleCharacter(characterMesh) {
    const xPos = characterMesh.position.x.toFixed(2);
    const yPos = characterMesh.position.y.toFixed(2);
    const zPos = characterMesh.position.z.toFixed(2);

    const toDegrees = (rad) => { return rad * 180 / Math.PI; };
    const xRot = toDegrees(characterMesh.rotation.x).toFixed(2);
    const yRot = toDegrees(characterMesh.rotation.y).toFixed(2);
    const zRot = toDegrees(characterMesh.rotation.z).toFixed(2);

    dbgCharElmt.innerText = `-- Character:
        x: ${xPos} ${xPos < 0 ? "" : "\u00A0"}| ${xRot}°
        y: ${yPos} ${yPos < 0 ? "" : "\u00A0"}| ${yRot}°
        z: ${zPos} ${zPos < 0 ? "" : "\u00A0"}| ${zRot}°

    `;
}

export function dbgConsoleDayNightCycle(sun, moon, hemi) {
    const sp = sun.getPosition();
    const mp = moon.getPosition();
    dbgDayNightElmt.innerText = `-- Day/Night:
        Sun \u00A0(p/o/i): (${Math.round(sp.x)}, ${Math.round(sp.y)}, ${Math.round(sp.z)}) | ${Math.round(sun.mesh.material.opacity*100)}% | ${Math.round(sun.light.intensity*100)}%
        Moon (p/o/i): (${Math.round(mp.x)}, ${Math.round(mp.y)}, ${Math.round(mp.z)}) | ${Math.round(moon.mesh.material.opacity*100)}% | ${Math.round(moon.light.intensity*100)}%
        Hemi \u00A0\u00A0\u00A0\u00A0(i): ${Math.round(hemi.light.intensity*100)}%

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

// optimizations by claude so optimizations may be suboptimal but still more optimal than optimizationless
const dbgWireframeMaterial = new THREE.MeshBasicMaterial({ wireframe: true, color: 0xffff00 });
const dbgWireframeGeometry = { box: new Map(), capsule: new Map() };
export function dbgColliderMesh(mesh, collider) {
    let geometry;
    const shape = collider.shapeType();

    if (shape === 1) { // cuboid
        const halfExtents = collider.halfExtents();
        const x = halfExtents.x * 2;
        const y = halfExtents.y * 2;
        const z = halfExtents.z * 2;
        const key = `${x}_${y}_${z}`;

        if (!dbgWireframeGeometry.box.has(key)) {
            const boxGeom = new THREE.BoxGeometry(x, y, z);
            geometry = new THREE.EdgesGeometry(boxGeom);
            boxGeom.dispose();
            dbgWireframeGeometry.box.set(key, geometry);
        }
        geometry = dbgWireframeGeometry.box.get(key);
    }
    else if (shape === 2) { // capsule
        const halfHeight = collider.halfHeight();
        const radius = collider.radius();
        const key = `${radius}_${halfHeight}`;

        if (!dbgWireframeGeometry.capsule.has(key)) {
            const capsuleGeom = new THREE.CapsuleGeometry(radius, halfHeight * 2);
            geometry = new THREE.EdgesGeometry(capsuleGeom);
            capsuleGeom.dispose();
            dbgWireframeGeometry.capsule.set(key, geometry);
        }
        geometry = dbgWireframeGeometry.capsule.get(key);
    }
    else {
        throw new Error(`dbgColliderMesh - unimplemented shape ${shape}`);
    }

    // Create a new geometry for this instance if we need to scale it
    if (mesh.scale.x !== 1 || mesh.scale.y !== 1 || mesh.scale.z !== 1) {
        geometry = geometry.clone();
        geometry.scale(1/mesh.scale.x, 1/mesh.scale.y, 1/mesh.scale.z);
    }

    mesh.add(new THREE.LineSegments(geometry, dbgWireframeMaterial));
}

//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\////\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//
//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\////\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//
