import * as THREE from 'three';
import * as RAPIER from '@dimforge/rapier3d-compat';
import { PhysicsObject } from '../classes/PhysicsObject';
import { Player } from '../classes/Player';
import { GLTFLoader } from 'three/examples/jsm/Addons.js';
import { DEBUG, SPAWN_POSITION } from '../consts';

//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\////\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//
//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\////\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//

async function loadGLTF(path, initialRotation) {
    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync(path);
    const mesh = new THREE.Mesh(gltf.scene.children[0].children[0].geometry.clone(), gltf.scene.children[0].children[0].material.clone());

    mesh.rotation.x = initialRotation.x;
    mesh.rotation.y = initialRotation.y;
    mesh.rotation.z = initialRotation.z;
    mesh.updateMatrix();
    mesh.geometry.applyMatrix4(mesh.matrix);

    return mesh;
}

export async function populateWorldObjects(world) {
    const objects = [];

    // Load external models
    const pip1Mesh = await loadGLTF("/src/assets/pip_1.glb", { x: -Math.PI/2, y: 0, z: 0});
    const house1aMesh = await loadGLTF("/src/assets/house_1a.glb", { x: -Math.PI/2, y: 0, z: 0 });

    // Player
    // TODO: Bevelling to get onto steps better
    objects.push(new Player(world, {
        position: SPAWN_POSITION,
        scale: { x: 0.1, y: 0.1, z: 0.1 },
        rotation: { x: 0, y: 0, z: 0 },
        geometry: pip1Mesh.geometry,
        material: pip1Mesh.material,
        colliderDesc: RAPIER.ColliderDesc.cuboid(0.1, 0.09, 0.05)
    }));

    // Ground
    objects.push(new PhysicsObject(world, {
        position: { x: 0, y: 0, z: 0 },
        geometry: new THREE.BoxGeometry(100, 1, 100),
        material: new THREE.MeshToonMaterial({ color: 0x2d8a1e }),
        colliderDesc: RAPIER.ColliderDesc.cuboid(50, 0.5, 50)
    }));

    // Paths
    // FUTURE: Bevelling (https://stackoverflow.com/questions/68696415/three-js-how-to-make-a-fully-beveled-cube)
    objects.push(...[
        // Southbound path
        new PhysicsObject(world, {
            position: { x: -45, y: 0.6, z: -36 },
            rotation: { x: 0, y: Math.PI/2, z: 0 },
            geometry: new THREE.BoxGeometry(6, 0.9, 10),
            material: new THREE.MeshToonMaterial({ color: 0xaaaaaa }),
            colliderDesc: RAPIER.ColliderDesc.cuboid(3, 0.45, 5)
        }), new PhysicsObject(world, {
            position: { x: -35, y: 0.5, z: -35 },
            rotation: { x: 0, y: Math.PI/2.25, z: 0 },
            geometry: new THREE.BoxGeometry(5, 0.4, 15),
            material: new THREE.MeshToonMaterial({ color: 0xcccccc }),
            colliderDesc: RAPIER.ColliderDesc.cuboid(2.5, 0.2, 7.5)
        }), new PhysicsObject(world, {
            position: { x: -26, y: 0.7, z: -32 },
            rotation: { x: 0, y: Math.PI/2.4, z: 0 },
            geometry: new THREE.BoxGeometry(5, 0.56, 7),
            material: new THREE.MeshToonMaterial({ color: 0xaaaaaa }),
            colliderDesc: RAPIER.ColliderDesc.cuboid(2.5, 0.28, 3.5)
        }), new PhysicsObject(world, {
            position: { x: -21, y: 0.57, z: -29 },
            rotation: { x: 0, y: Math.PI/3.3, z: 0 },
            geometry: new THREE.BoxGeometry(5.2, 0.24, 7),
            material: new THREE.MeshToonMaterial({ color: 0xbbbbbb }),
            colliderDesc: RAPIER.ColliderDesc.cuboid(2.6, 0.12, 3.5)
        }), new PhysicsObject(world, {
            position: { x: -15, y: 0.74, z: -27 },
            rotation: { x: 0, y: Math.PI/2.5, z: 0 },
            geometry: new THREE.BoxGeometry(5, 0.7, 9.2),
            material: new THREE.MeshToonMaterial({ color: 0x999999 }),
            colliderDesc: RAPIER.ColliderDesc.cuboid(2.5, 0.35, 4.6)
        }), new PhysicsObject(world, {
            position: { x: -6, y: 0.74, z: -23 },
            rotation: { x: 0, y: Math.PI/2.9, z: 0 },
            geometry: new THREE.BoxGeometry(4.9, 0.4, 11.2),
            material: new THREE.MeshToonMaterial({ color: 0xaaaaaa }),
            colliderDesc: RAPIER.ColliderDesc.cuboid(2.45, 0.2, 5.6)
        }), new PhysicsObject(world, {
            position: { x: 2, y: 0.74, z: -17 },
            rotation: { x: 0, y: Math.PI/3.4, z: 0 },
            geometry: new THREE.BoxGeometry(4.4, 0.82, 9.5),
            material: new THREE.MeshToonMaterial({ color: 0xbbbbbb }),
            colliderDesc: RAPIER.ColliderDesc.cuboid(2.2, 0.41, 4.75)
        }), new PhysicsObject(world, {
            position: { x: 8, y: 0.74, z: -12 },
            rotation: { x: 0, y: Math.PI/4, z: 0 },
            geometry: new THREE.BoxGeometry(4.8, 0.36, 7.9),
            material: new THREE.MeshToonMaterial({ color: 0x999999 }),
            colliderDesc: RAPIER.ColliderDesc.cuboid(2.4, 0.18, 3.85)
        }), new PhysicsObject(world, {
            position: { x: 14, y: 0.74, z: -6 },
            rotation: { x: 0, y: Math.PI/4.5, z: 0 },
            geometry: new THREE.BoxGeometry(5.2, 0.68, 10.8),
            material: new THREE.MeshToonMaterial({ color: 0xaaaaaa }),
            colliderDesc: RAPIER.ColliderDesc.cuboid(2.6, 0.34, 5.4)
        }),

        // N-to-E path
        new PhysicsObject(world, {
            position: { x: 45, y: 0.78, z: -17 },
            rotation: { x: 0, y: 0.1, z: 0 },
            geometry: new THREE.BoxGeometry(10, 0.3, 5),
            material: new THREE.MeshToonMaterial({ color: 0xaaaaaa }),
            colliderDesc: RAPIER.ColliderDesc.cuboid(5, 0.15, 2.5)
        }), new PhysicsObject(world, {
            position: { x: 37, y: 0.5, z: -15 },
            rotation: { x: 0, y: 0.3, z: 0 },
            geometry: new THREE.BoxGeometry(9, 0.6, 4.5),
            material: new THREE.MeshToonMaterial({ color: 0x999999 }),
            colliderDesc: RAPIER.ColliderDesc.cuboid(4.5, 0.3, 2.25)
        }), new PhysicsObject(world, {
            position: { x: 28, y: 0.65, z: -9.5 },
            rotation: { x: 0, y: 0.6, z: 0 },
            geometry: new THREE.BoxGeometry(14, 0.6, 5.2),
            material: new THREE.MeshToonMaterial({ color: 0xb6b6b6 }),
            colliderDesc: RAPIER.ColliderDesc.cuboid(7, 0.3, 2.6)
        }), new PhysicsObject(world, {
            position: { x: 20, y: 0.4, z: -2 },
            rotation: { x: 0, y: Math.PI/3, z: 0 },
            geometry: new THREE.BoxGeometry(10, 0.6, 5.5),
            material: new THREE.MeshToonMaterial({ color: 0x9a9a9a }),
            colliderDesc: RAPIER.ColliderDesc.cuboid(5, 0.3, 2.75)
        }), new PhysicsObject(world, {
            position: { x: 17, y: 0.68, z: 6 },
            rotation: { x: 0, y: 0.1, z: 0 },
            geometry: new THREE.BoxGeometry(4.8, 0.6, 10),
            material: new THREE.MeshToonMaterial({ color: 0xbbbbbb }),
            colliderDesc: RAPIER.ColliderDesc.cuboid(2.5, 0.3, 5)
        }), new PhysicsObject(world, {
            position: { x: 16, y: 0.43, z: 15 },
            rotation: { x: 0, y: -0.35, z: 0 },
            geometry: new THREE.BoxGeometry(5, 0.6, 8.8),
            material: new THREE.MeshToonMaterial({ color: 0x8f8f8f }),
            colliderDesc: RAPIER.ColliderDesc.cuboid(2.5, 0.3, 4.4)
        }), new PhysicsObject(world, {
            position: { x: 11, y: 0.64, z: 22 },
            rotation: { x: 0, y: -Math.PI/4, z: 0 },
            geometry: new THREE.BoxGeometry(4.4, 0.6, 10.4),
            material: new THREE.MeshToonMaterial({ color: 0xaeaeae }),
            colliderDesc: RAPIER.ColliderDesc.cuboid(2.2, 0.3, 5.2)
        }), new PhysicsObject(world, {
            position: { x: 4, y: 0.43, z: 26 },
            rotation: { x: 0, y: 0.1+Math.PI/2, z: 0 },
            geometry: new THREE.BoxGeometry(5.6, 0.6, 10.4),
            material: new THREE.MeshToonMaterial({ color: 0xa1a1a1 }),
            colliderDesc: RAPIER.ColliderDesc.cuboid(2.8, 0.3, 5.2)
        }), new PhysicsObject(world, {
            position: { x: -2, y: 0.7, z: 28 },
            rotation: { x: 0, y: -1.2, z: 0 },
            geometry: new THREE.BoxGeometry(5.6, 0.6, 7.6),
            material: new THREE.MeshToonMaterial({ color: 0xb6b6b6 }),
            colliderDesc: RAPIER.ColliderDesc.cuboid(2.8, 0.3, 3.8)
        }), new PhysicsObject(world, {
            position: { x: -8, y: 0.35, z: 32 },
            rotation: { x: 0, y: -Math.PI/4, z: 0 },
            geometry: new THREE.BoxGeometry(5.2, 0.6, 11.2),
            material: new THREE.MeshToonMaterial({ color: 0x9f9f9f }),
            colliderDesc: RAPIER.ColliderDesc.cuboid(2.6, 0.3, 5.6)
        }), new PhysicsObject(world, {
            position: { x: -12.5, y: 0.55, z: 40 },
            rotation: { x: 0, y: -0.2, z: 0 },
            geometry: new THREE.BoxGeometry(5.8, 0.6, 10.8),
            material: new THREE.MeshToonMaterial({ color: 0xacacac }),
            colliderDesc: RAPIER.ColliderDesc.cuboid(2.9, 0.3, 5.4)
        }), new PhysicsObject(world, {
            position: { x: -13, y: 0.4, z: 47 },
            rotation: { x: 0, y: 0, z: 0 },
            geometry: new THREE.BoxGeometry(6, 0.6, 6),
            material: new THREE.MeshToonMaterial({ color: 0xa1a1a1 }),
            colliderDesc: RAPIER.ColliderDesc.cuboid(3, 0.3, 3)
        }),

        // Town square tiling inner
        new PhysicsObject(world, {
            position: { x: 3, y: 0.6, z: -10 },
            rotation: { x: 0, y: 0, z: 0 },
            geometry: new THREE.BoxGeometry(7.5, 0.3, 7.5),
            material: new THREE.MeshToonMaterial({ color: 0xa4a4a4 }),
            colliderDesc: RAPIER.ColliderDesc.cuboid(3.75, 0.15, 3.75)
        }), new PhysicsObject(world, {
            position: { x: 7, y: 0.4, z: -5 },
            rotation: { x: 0, y: Math.PI/4, z: 0 },
            geometry: new THREE.BoxGeometry(7.5, 0.3, 7.5),
            material: new THREE.MeshToonMaterial({ color: 0x8f8f8f }),
            colliderDesc: RAPIER.ColliderDesc.cuboid(3.75, 0.15, 3.75)
        }), new PhysicsObject(world, {
            position: { x: 12, y: 0.5, z: -1 },
            rotation: { x: 0, y: 0, z: 0 },
            geometry: new THREE.BoxGeometry(7.5, 0.3, 7.5),
            material: new THREE.MeshToonMaterial({ color: 0xb1b1b1 }),
            colliderDesc: RAPIER.ColliderDesc.cuboid(3.75, 0.15, 3.75)
        }), new PhysicsObject(world, {
            position: { x: 11, y: 0.6, z: 4 },
            rotation: { x: 0, y: Math.PI/4, z: 0 },
            geometry: new THREE.BoxGeometry(7.5, 0.3, 7.5),
            material: new THREE.MeshToonMaterial({ color: 0xa2a2a2 }),
            colliderDesc: RAPIER.ColliderDesc.cuboid(3.75, 0.15, 3.75)
        }), new PhysicsObject(world, {
            position: { x: 12, y: 0.45, z: 9 },
            rotation: { x: 0, y: 0, z: 0 },
            geometry: new THREE.BoxGeometry(7.5, 0.3, 7.5),
            material: new THREE.MeshToonMaterial({ color: 0x959595 }),
            colliderDesc: RAPIER.ColliderDesc.cuboid(3.75, 0.15, 3.75)
        }), new PhysicsObject(world, {
            position: { x: 6, y: 0.57, z: -2 },
            rotation: { x: 0, y: 0, z: 0 },
            geometry: new THREE.BoxGeometry(10, 0.3, 10),
            material: new THREE.MeshToonMaterial({ color: 0xb5b5b5 }),
            colliderDesc: RAPIER.ColliderDesc.cuboid(5, 0.15, 5)
        }),
        
        // Town square tiling border
        new PhysicsObject(world, {
            position: { x: -0.5, y: 0.8, z: -11.5 },
            rotation: { x: 0, y: -0.4, z: 0 },
            geometry: new THREE.BoxGeometry(4, 0.3, 11),
            material: new THREE.MeshToonMaterial({ color: 0x919191 }),
            colliderDesc: RAPIER.ColliderDesc.cuboid(2, 0.15, 5.5)
        }), new PhysicsObject(world, {
            position: { x: 0, y: 0.49, z: -3 },
            rotation: { x: 0, y: 0.4, z: 0 },
            geometry: new THREE.BoxGeometry(5, 0.3, 10),
            material: new THREE.MeshToonMaterial({ color: 0xaeaeae }),
            colliderDesc: RAPIER.ColliderDesc.cuboid(2.5, 0.15, 5)
        }), new PhysicsObject(world, {
            position: { x: 3.5, y: 0.72, z: 4.5 },
            rotation: { x: 0, y: 0.5, z: 0 },
            geometry: new THREE.BoxGeometry(7, 0.3, 10),
            material: new THREE.MeshToonMaterial({ color: 0x939393 }),
            colliderDesc: RAPIER.ColliderDesc.cuboid(3.5, 0.15, 5)
        }), new PhysicsObject(world, {
            position: { x: 9.5, y: 0.64, z: 12.5 },
            rotation: { x: 0, y: Math.PI/4, z: 0 },
            geometry: new THREE.BoxGeometry(7, 0.3, 12),
            material: new THREE.MeshToonMaterial({ color: 0xb2b2b2 }),
            colliderDesc: RAPIER.ColliderDesc.cuboid(3.5, 0.15, 6)
        }),

        // TODO: House connecting paths
    ]);

    // House 1a
    objects.push(...[
        new PhysicsObject(world, { // house model
            position: { x: -22, y: 0.5, z: -42 },
            scale: { x: 0.5, y: 0.5, z: 0.5 },
            rotation: { x: 0, y: -Math.PI/8, z: 0 },
            geometry: house1aMesh.geometry,
            material: house1aMesh.material,
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.0, 0.0, 0.0)
        }), new PhysicsObject(world, { // path connector
            position: { x: -23.5, y: 0.35, z: -34.5 },
            rotation: { x: 0, y: 3*Math.PI/8, z: 0 },
            geometry: new THREE.BoxGeometry(3, 0.5, 2.5),
            material: new THREE.MeshToonMaterial({ color: 0xbbbbbb }),
            colliderDesc: RAPIER.ColliderDesc.cuboid(1.5, 0.25, 1.25)
        }), 

        // Colliders
        new PhysicsObject(world, { // left
            position: { x: -26, y: 2.5, z: -43 },
            rotation: { x: 0, y: -Math.PI/8, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.75, 2.5, 4.5)
        }), new PhysicsObject(world, { // right
            position: { x: -18, y: 2.5, z: -40 },
            rotation: { x: 0, y: -Math.PI/8, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.75, 2.5, 4.5)
        }), new PhysicsObject(world, { // back
            position: { x: -20, y: 2.5, z: -46 },
            rotation: { x: 0, y: 3*Math.PI/8, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 2.5, 4.5)
        }), new PhysicsObject(world, { // front left
            position: { x: -26, y: 2.5, z: -39 },
            rotation: { x: 0, y: 3*Math.PI/8, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.5, 2.5, 2.3)
        }), new PhysicsObject(world, { // front right
            position: { x: -20, y: 2.5, z: -36 },
            rotation: { x: 0, y: 3*Math.PI/8, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.5, 2.5, 1.1)
        }), new PhysicsObject(world, { // front top
            position: { x: -22.5, y: 4, z: -37.5 },
            rotation: { x: 0, y: 3*Math.PI/8, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.5, 1, 1.75)
        }), new PhysicsObject(world, { // floor
            position: { x: -22, y: 0.75, z: -42 },
            rotation: { x: 0, y: 3*Math.PI/8, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(5, 0.25, 5)
        }), new PhysicsObject(world, { // entrance step
            position: { x: -22.5, y: 0.5, z: -36.65 },
            rotation: { x: 0, y: 3*Math.PI/8, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.75, 0.25, 1.5)
        }), new PhysicsObject(world, { // inner roof
            position: { x: -22, y: 5, z: -42 },
            rotation: { x: 0, y: 3*Math.PI/8, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(5, 0.25, 5)
        }), new PhysicsObject(world, { // left outer roof
            position: { x: -25, y: 7, z: -43 },
            rotation: { x: 0, y: -Math.PI/8, z: Math.PI/6 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(4, 0.4, 6)
        }), new PhysicsObject(world, { // right outer roof
            position: { x: -19, y: 7, z: -41 },
            rotation: { x: 0, y: -Math.PI/8, z: -Math.PI/6 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(4, 0.4, 6)
        }), new PhysicsObject(world, { // front outer roof
            position: { x: -24, y: 6, z: -37.25 },
            rotation: { x: 0, y: -Math.PI/8, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(3, 1, 0.5)
        }), new PhysicsObject(world, { // back outer roof
            position: { x: -20, y: 6, z: -46.5 },
            rotation: { x: 0, y: -Math.PI/8, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(3, 1, 0.5)
        }), new PhysicsObject(world, { // bed
            position: { x: -18.5, y: 1.25, z: -44 },
            rotation: { x: 0, y: 3*Math.PI/8, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(1, 0.5, 1.2)
        }),
    ]);

    // Center lines
    if (DEBUG) {
        objects.push(...[new PhysicsObject(world, {
            geometry: new THREE.PlaneGeometry(100, 2),
            material: new THREE.MeshBasicMaterial({ color: 0xff0000, side: THREE.DoubleSide }),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0, 0, 0)
        }), new PhysicsObject(world, {
            rotation: { x: 0, y: Math.PI/2, z: 0 },
            geometry: new THREE.PlaneGeometry(100, 2),
            material: new THREE.MeshBasicMaterial({ color: 0xff0000, side: THREE.DoubleSide }),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0, 0, 0)
        })]);
    }

    // Add objects
    for (const object of objects) {
        world.objects.add(object);
    }
}

//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\////\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//
//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\////\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//
