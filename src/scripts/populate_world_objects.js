import * as THREE from 'three';
import * as RAPIER from '@dimforge/rapier3d-compat';
import { PhysicsObject } from '../classes/PhysicsObject';
import { Player } from '../classes/Player';
import { GLTFLoader } from 'three/examples/jsm/Addons.js';

//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\////\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//
//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\////\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//

export async function populateWorldObjects(world) {
    const gltfLoader = new GLTFLoader();

    // Fix initial rotation (TODO: fn)
    const gltf = await gltfLoader.loadAsync("/src/assets/pip_1.glb");
    const pipMesh1 = new THREE.Mesh(gltf.scene.children[0].children[0].geometry.clone(), gltf.scene.children[0].children[0].material.clone());
    pipMesh1.rotation.x = -Math.PI/2;
    pipMesh1.updateMatrix();
    pipMesh1.geometry.applyMatrix4(pipMesh1.matrix);

    const objects = [
        // Player
        new Player(world, {
            position: { x: 0, y: 5, z: 0 },
            scale: { x: 0.1, y: 0.1, z: 0.1 },
            rotation: { x: 0, y: 0, z: 0 },
            geometry: pipMesh1.geometry,
            material: pipMesh1.material,
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.1, 0.09, 0.05)
        }),

        // Static box
        new PhysicsObject(world, {
            position: { x: 0, y: 0, z: 0 },
            geometry: new THREE.BoxGeometry(40, 1, 40),
            material: new THREE.MeshPhongMaterial({ color: 0xffffff }),
            colliderDesc: RAPIER.ColliderDesc.cuboid(20, 0.5, 20)
        }),

        // Static pip
        new PhysicsObject(world, {
            position: { x: -5, y: 1, z: -5 },
            scale: { x: 0.1, y: 0.1, z: 0.1 },
            rotation: { x: Math.PI/2, y: 0, z: 0 },
            geometry: pipMesh1.geometry,
            material: pipMesh1.material,
            colliderDesc: RAPIER.ColliderDesc.capsule(0.0, 0.05).setFriction(0.7)
        }),

        // Dynamic box
        new PhysicsObject(world, {
            isStatic: false,
            geometry: new THREE.BoxGeometry(1, 1, 1),
            material: new THREE.MeshPhongMaterial({ color: 0x00ff00 }),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.5, 0.5, 0.5)
        }),

        // Dynamic pip
        new PhysicsObject(world, {
            position: { x: 5, y: 5, z: 5 },
            scale: { x: 0.1, y: 0.1, z: 0.1 },
            rotation: { x: 0.123, y: 0.456, z: 0.789 },
            isStatic: false,
            geometry: pipMesh1.geometry,
            material: pipMesh1.material,
            colliderDesc: RAPIER.ColliderDesc.capsule(0.0, 0.05).setFriction(0.7)
        })
    ];

    const gltf2 = await gltfLoader.loadAsync("/src/assets/house_1a.glb");
    const tmpMesh = new THREE.Mesh(gltf2.scene.children[0].children[0].geometry.clone(), gltf.scene.children[0].children[0].material.clone());
    tmpMesh.rotation.x = -Math.PI/2;
    tmpMesh.updateMatrix();
    tmpMesh.geometry.applyMatrix4(tmpMesh.matrix);

    const tmp = new PhysicsObject(world, {
        position: { x: 10, y: 0.5, z: 10 },
        scale: { x: 0.5, y: 0.5, z: 0.5 },
        rotation: { x: 0, y: 0.5, z: 0 },
        geometry: tmpMesh.geometry,
        material: tmpMesh.material,
        colliderDesc: RAPIER.ColliderDesc.cuboid(0.0, 0.0, 0.0)
    });

    objects.push(tmp);

    const tmp2 = new PhysicsObject(world, {
        position: { x: 10, y: 3.5, z: 5.5 },
        geometry: new THREE.BoxGeometry(0, 0, 0),
        material: new THREE.MeshPhongMaterial(),
        colliderDesc: RAPIER.ColliderDesc.cuboid(5, 3, 0.5)
    });

    // objects.push(tmp2);

    for (const object of objects) {
        world.objects.add(object);
    }
}

//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\////\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//
//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\////\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//
