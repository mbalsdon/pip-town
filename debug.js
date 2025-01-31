import * as THREE from './three.module.js';
import RAPIER from './rapier3d.js';

export function debugRay(scene, origin, direction, length) {
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
