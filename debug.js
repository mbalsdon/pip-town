import * as THREE from 'three';

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

export function debugCapsuleHitbox(scene, capsuleBody, capsuleRadius, capsuleHalfHeight, capsuleOffsetY) {
    const hitboxGeometry = new THREE.CapsuleGeometry(capsuleRadius, capsuleHalfHeight * 2, 2, 8); // Parameters: radius, height, radialSegments, heightSegments
    hitboxGeometry.translate(0, capsuleOffsetY, 0);
    const hitboxMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        wireframe: true,
        transparent: true,
        opacity: 0.25
    });
    const hitboxMesh = new THREE.Mesh(hitboxGeometry, hitboxMaterial);
    scene.add(hitboxMesh);

    // Update the hitbox position to match the character's rigid body
    function updateHitbox() {
        const position = capsuleBody.translation();
        hitboxMesh.position.set(position.x, position.y, position.z);
    }

    // Add the hitbox update to your animation loop
    function animate() {
        requestAnimationFrame(animate);
        updateHitbox();
        // Other animation logic...
    }

    animate();
}
