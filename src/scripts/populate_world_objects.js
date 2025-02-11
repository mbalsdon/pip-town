import * as THREE from 'three';
import * as RAPIER from '@dimforge/rapier3d-compat';
import { PhysicsObject } from '../classes/PhysicsObject';
import { Player } from '../classes/Player';
import { BufferGeometryUtils, GLTFLoader } from 'three/examples/jsm/Addons.js';
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

function generateGardenObjects(dim) {
    const groundMesh = new THREE.Mesh(
        new THREE.BoxGeometry(dim.x, dim.y, dim.z),
        new THREE.MeshToonMaterial({ color: 0x396b1e })
    );

    const stemGeometries = [];
    let headsList = [
        { color: 0xe83c3c, geometries: [], mesh: null },
        { color: 0xe8723c, geometries: [], mesh: null },
        { color: 0xdf3ce8, geometries: [], mesh: null },
        { color: 0x3c89e8, geometries: [], mesh: null },
    ];

    const flowerDensity = 0.5;
    const stemY = 2;
    const numFlowers = Math.floor(dim.x * dim.z * flowerDensity);

    for (let i = 0; i < numFlowers; ++i) {
        const stemGeometry = new THREE.BoxGeometry(0.1, stemY, 0.1);
        const headGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
        
        const scale = 0.8 + Math.random() * 0.4;
        stemGeometry.scale(scale, scale, scale);
        headGeometry.scale(scale*1.6, scale*1.6, scale*1.6);

        stemGeometry.rotateX(Math.random() * (Math.PI/16));
        stemGeometry.rotateY(Math.random() * Math.PI);
        stemGeometry.rotateZ(Math.random() * (Math.PI/16));
        
        headGeometry.rotateX(Math.random() * (Math.PI/8));
        headGeometry.rotateY(Math.random() * Math.PI);
        headGeometry.rotateZ(Math.random() * (Math.PI/8));


        const pos = {
            x: dim.x * Math.random() - dim.x/2,
            y: Math.random() * 0.5,
            z: dim.z * Math.random() - dim.z/2
        };

        stemGeometry.translate(pos.x, pos.y, pos.z);
        headGeometry.translate(pos.x, pos.y + stemY/2, pos.z);

        stemGeometries.push(stemGeometry);
        headsList[Math.floor(Math.random()*headsList.length)].geometries.push(headGeometry);
    }

    let stemsMesh = null;
    if (stemGeometries.length !== 0) {
        const stemGeometryAggregate = BufferGeometryUtils.mergeGeometries(stemGeometries);
        stemsMesh = new THREE.Mesh(
            stemGeometryAggregate,
            new THREE.MeshToonMaterial({ color: 0x7eed6d })
        );
    }    

    for (const heads of headsList) {
        if (heads.geometries.length === 0) {
            headsList = headsList.filter(h => h.color === heads.color);
            continue;
        }

        const headGeometriesAggregate = BufferGeometryUtils.mergeGeometries(heads.geometries);
        const headsMesh = new THREE.Mesh(
            headGeometriesAggregate,
            new THREE.MeshToonMaterial({ color: heads.color }));
        heads.mesh = headsMesh;
    }

    return [groundMesh, stemsMesh, headsList];
}

function generateGrassPatch(dim) {
    let grassesList = [
        { color: 0x89cf63, geometries: [], mesh: null },
        { color: 0x68ad51, geometries: [], mesh: null },
        { color: 0x548f40, geometries: [], mesh: null },
        { color: 0x3e9636, geometries: [], mesh: null },
    ];

    const grassDensity = 5; // TODO: 4
    const numBlades = Math.floor(dim.x * dim.z * grassDensity);

    for (let i = 0; i < numBlades; ++i) {
        const grassGeometry = new THREE.PlaneGeometry(0.1, 1);

        const scale = 0.8 + Math.random() * 0.4;
        grassGeometry.scale(scale, scale, scale);

        grassGeometry.rotateX(Math.random() * (Math.PI/8));
        grassGeometry.rotateY(Math.random() * Math.PI);
        grassGeometry.rotateZ(Math.random() * (Math.PI/8));

        const pos = {
            x: dim.x * Math.random() - dim.x/2,
            y: Math.random() * 0.5,
            z: dim.z * Math.random() - dim.z/2
        };

        grassGeometry.translate(pos.x, pos.y, pos.z);

        grassesList[Math.floor(Math.random()*grassesList.length)].geometries.push(grassGeometry);
    }

    for (const grasses of grassesList) {
        if (grasses.geometries.length === 0) {
            grassesList = grassesList.filter(g => g.color === grasses.color);
            continue;
        }

        const grassGeometriesAggregate = BufferGeometryUtils.mergeGeometries(grasses.geometries);
        const grassesMesh = new THREE.Mesh(
            grassGeometriesAggregate,
            new THREE.MeshToonMaterial({ color: grasses.color, side: THREE.DoubleSide }));
        grasses.mesh = grassesMesh;
    }

    return grassesList;
}

//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\////\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//
//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\////\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//

export async function populateWorldObjects(world) {
    const objects = [];

    // Load external models
    const pip1Mesh =     await loadGLTF("/src/assets/pip_1.glb",         { x: -Math.PI/2, y: 0, z: 0 });
    const house1aMesh =  await loadGLTF("/src/assets/house_1a.glb",      { x: -Math.PI/2, y: 0, z: 0 });
    const house1bMesh =  await loadGLTF("/src/assets/house_1b.glb",      { x: -Math.PI/2, y: 0, z: 0 });
    const house1cMesh =  await loadGLTF("/src/assets/house_1c.glb",      { x: -Math.PI/2, y: 0, z: 0 });
    const house2Mesh =   await loadGLTF("src/assets/house_2.glb",        { x: -Math.PI/2, y: 0, z: 0 });
    const house3Mesh =   await loadGLTF("/src/assets/house_3.glb",       { x: -Math.PI/2, y: 0, z: 0 });
    const house4Mesh =   await loadGLTF("/src/assets/house_4.glb",       { x: -Math.PI/2, y: 0, z: 0 });
    const tree1Mesh =    await loadGLTF("/src/assets/tree_1.glb",        { x: -Math.PI/2, y: 0, z: 0 });
    const tree2Mesh =    await loadGLTF("/src/assets/tree_2.glb",        { x: -Math.PI/2, y: 0, z: 0 });
    const tree3Mesh =    await loadGLTF("/src/assets/tree_3.glb",        { x: -Math.PI/2, y: 0, z: 0 });
    const tree4Mesh =    await loadGLTF("/src/assets/tree_4.glb",        { x: -Math.PI/2, y: 0, z: 0 });
    const fence1Mesh =   await loadGLTF("/src/assets/fence_1.glb",       { x: -Math.PI/2, y: 0, z: 0 });
    const pumpkin1Mesh = await loadGLTF("/src/assets/pumpkin_1.glb",     { x: -Math.PI/2, y: 0, z: 0 });
    const melon1Mesh =   await loadGLTF("/src/assets/melon_1.glb",       { x: -Math.PI/2, y: 0, z: 0 });
    const stall1Mesh =   await loadGLTF("/src/assets/marketstall_1.glb", { x: -Math.PI/2, y: 0, z: 0 });
    const stall2Mesh =   await loadGLTF("/src/assets/marketstall_2.glb", { x: -Math.PI/2, y: 0, z: 0 });
    const statue1Mesh =  await loadGLTF("/src/assets/statue_1.glb",      { x: -Math.PI/2, y: 0, z: 0 });
    const bench1Mesh =   await loadGLTF("/src/assets/bench_1.glb",       { x: -Math.PI/2, y: 0, z: 0 });

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
    objects.push(...[
        new PhysicsObject(world, { // base
            position: { x: 0, y: -1.5, z: 0 },
            geometry: new THREE.BoxGeometry(100, 1, 100),
            material: new THREE.MeshToonMaterial({ color: 0x2d5518 }),
            colliderDesc: RAPIER.ColliderDesc.cuboid(50, 0.5, 50)
        }),

        // Raised part (SE)
        new PhysicsObject(world, {
            position: { x: -34.25, y: -0.25, z: -25 },
            rotation: { x: 0, y: 0, z: 0 },
            geometry: new THREE.BoxGeometry(31.5, 1.5, 50),
            material: new THREE.MeshToonMaterial({ color: 0x2d5518 }),
            colliderDesc: RAPIER.ColliderDesc.cuboid(15.75, 0.75, 25)
        }), new PhysicsObject(world, {
            position: { x: -44, y: -0.25, z: 6 },
            rotation: { x: 0, y: 0, z: 0 },
            geometry: new THREE.BoxGeometry(12, 1.5, 14),
            material: new THREE.MeshToonMaterial({ color: 0x2d5518 }),
            colliderDesc: RAPIER.ColliderDesc.cuboid(6, 0.75, 7)
        }), new PhysicsObject(world, {
            position: { x: -35, y: -0.25, z: 4 },
            rotation: { x: 0, y: Math.PI/8, z: 0 },
            geometry: new THREE.BoxGeometry(14, 1.5, 14),
            material: new THREE.MeshToonMaterial({ color: 0x2d5518 }),
            colliderDesc: RAPIER.ColliderDesc.cuboid(7, 0.75, 7)
        }), new PhysicsObject(world, {
            position: { x: -25.5, y: -0.25, z: 1.3 },
            rotation: { x: 0, y: Math.PI/4, z: 0 },
            geometry: new THREE.BoxGeometry(12, 1.5, 8),
            material: new THREE.MeshToonMaterial({ color: 0x2d5518 }),
            colliderDesc: RAPIER.ColliderDesc.cuboid(6, 0.75, 4)
        }), new PhysicsObject(world, {
            position: { x: -19, y: -0.25, z: -25.5 },
            rotation: { x: 0, y: -Math.PI/8, z: 0 },
            geometry: new THREE.BoxGeometry(12, 1.5, 32),
            material: new THREE.MeshToonMaterial({ color: 0x2d5518 }),
            colliderDesc: RAPIER.ColliderDesc.cuboid(6, 0.75, 16)
        }), new PhysicsObject(world, {
            position: { x: -15, y: -0.25, z: -44 },
            rotation: { x: 0, y: 0, z: 0 },
            geometry: new THREE.BoxGeometry(15, 1.5, 12),
            material: new THREE.MeshToonMaterial({ color: 0x2d5518 }),
            colliderDesc: RAPIER.ColliderDesc.cuboid(7.5, 0.75, 6)
        }),

        // Raised part (SW)
        new PhysicsObject(world, {
            position: { x: -44, y: -0.25, z: 34 },
            rotation: { x: 0, y: 0, z: 0 },
            geometry: new THREE.BoxGeometry(12, 1.5, 32),
            material: new THREE.MeshToonMaterial({ color: 0x2d5518 }),
            colliderDesc: RAPIER.ColliderDesc.cuboid(6, 0.75, 16)
        }),
        new PhysicsObject(world, {
            position: { x: -29, y: -0.25, z: 36.5 },
            rotation: { x: 0, y: 0, z: 0 },
            geometry: new THREE.BoxGeometry(19, 1.5, 27),
            material: new THREE.MeshToonMaterial({ color: 0x2d5518 }),
            colliderDesc: RAPIER.ColliderDesc.cuboid(9.5, 0.75, 13.5)
        }), new PhysicsObject(world, {
            position: { x: -38, y: -0.25, z: 23 },
            rotation: { x: 0, y: Math.PI/4, z: 0 },
            geometry: new THREE.BoxGeometry(7, 1.5, 7),
            material: new THREE.MeshToonMaterial({ color: 0x2d5518 }),
            colliderDesc: RAPIER.ColliderDesc.cuboid(3.5, 0.75, 3.5)
        }), new PhysicsObject(world, {
            position: { x: -5, y: -0.25, z: 46.25 },
            rotation: { x: 0, y: 0, z: 0 },
            geometry: new THREE.BoxGeometry(48, 1.5, 7.5),
            material: new THREE.MeshToonMaterial({ color: 0x2d5518 }),
            colliderDesc: RAPIER.ColliderDesc.cuboid(24, 0.75, 3.75)
        }), new PhysicsObject(world, {
            position: { x: -12.5, y: -0.25, z: 36.4 },
            rotation: { x: 0, y: -Math.PI/4, z: 0 },
            geometry: new THREE.BoxGeometry(29, 1.5, 9.25),
            material: new THREE.MeshToonMaterial({ color: 0x2d5518 }),
            colliderDesc: RAPIER.ColliderDesc.cuboid(14.5, 0.75, 4.675)
        }), new PhysicsObject(world, {
            position: { x: -17, y: -0.25, z: 40 },
            rotation: { x: 0, y: 0, z: 0 },
            geometry: new THREE.BoxGeometry(10, 1.5, 10),
            material: new THREE.MeshToonMaterial({ color: 0x2d5518 }),
            colliderDesc: RAPIER.ColliderDesc.cuboid(5, 0.75, 5)
        }), new PhysicsObject(world, {
            position: { x: 30, y: -0.25, z: 48.75 },
            rotation: { x: 0, y: 0, z: 0 },
            geometry: new THREE.BoxGeometry(40, 1.5, 2.5),
            material: new THREE.MeshToonMaterial({ color: 0x2d5518 }),
            colliderDesc: RAPIER.ColliderDesc.cuboid(20, 0.75, 1.25)
        }), new PhysicsObject(world, {
            position: { x: 23.5, y: -0.25, z: 46 },
            rotation: { x: 0, y: -Math.PI/8, z: 0 },
            geometry: new THREE.BoxGeometry(13, 1.5, 2.6),
            material: new THREE.MeshToonMaterial({ color: 0x2d5518 }),
            colliderDesc: RAPIER.ColliderDesc.cuboid(6.5, 0.75, 1.3)
        }), new PhysicsObject(world, {
            position: { x: 21, y: -0.25, z: 47 },
            rotation: { x: 0, y: 0, z: 0 },
            geometry: new THREE.BoxGeometry(6, 1.5, 3),
            material: new THREE.MeshToonMaterial({ color: 0x2d5518 }),
            colliderDesc: RAPIER.ColliderDesc.cuboid(3, 0.75, 1.5)
        }),

        // Raised part (N)
        new PhysicsObject(world, {
            position: { x: 23.75, y: -0.25, z: -10 },
            rotation: { x: 0, y: 0, z: 0 },
            geometry: new THREE.BoxGeometry(52.5, 1.5, 80),
            material: new THREE.MeshToonMaterial({ color: 0x2d5518 }),
            colliderDesc: RAPIER.ColliderDesc.cuboid(26.25, 0.75, 40)
        }), new PhysicsObject(world, {
            position: { x: -7, y: -0.25, z: 5 },
            rotation: { x: 0, y: 0, z: 0 },
            geometry: new THREE.BoxGeometry(13, 1.5, 31),
            material: new THREE.MeshToonMaterial({ color: 0x2d5518 }),
            colliderDesc: RAPIER.ColliderDesc.cuboid(6.5, 0.75, 15.5)
        }), new PhysicsObject(world, {
            position: { x: 26, y: -0.25, z: 33 },
            rotation: { x: 0, y: 0, z: 0 },
            geometry: new THREE.BoxGeometry(48, 1.5, 9),
            material: new THREE.MeshToonMaterial({ color: 0x2d5518 }),
            colliderDesc: RAPIER.ColliderDesc.cuboid(24, 0.75, 4.5)
        }), new PhysicsObject(world, {
            position: { x: 0, y: -0.25, z: -20 },
            rotation: { x: 0, y: 3*Math.PI/8, z: 0 },
            geometry: new THREE.BoxGeometry(29, 1.5, 17.5),
            material: new THREE.MeshToonMaterial({ color: 0x2d5518 }),
            colliderDesc: RAPIER.ColliderDesc.cuboid(14.5, 0.75, 8.75)
        }), new PhysicsObject(world, {
            position: { x: -4.5, y: -0.25, z: 24.4 },
            rotation: { x: 0, y: -Math.PI/4, z: 0 },
            geometry: new THREE.BoxGeometry(28, 1.5, 9.1),
            material: new THREE.MeshToonMaterial({ color: 0x2d5518 }),
            colliderDesc: RAPIER.ColliderDesc.cuboid(14, 0.75, 4.55)
        }), new PhysicsObject(world, {
            position: { x: 40.5, y: -0.25, z: 40 },
            rotation: { x: 0, y: 0, z: 0 },
            geometry: new THREE.BoxGeometry(19, 1.5, 5),
            material: new THREE.MeshToonMaterial({ color: 0x2d5518 }),
            colliderDesc: RAPIER.ColliderDesc.cuboid(9.5, 0.75, 2.5)
        }), new PhysicsObject(world, {
            position: { x: 27, y: -0.25, z: 36.5 },
            rotation: { x: 0, y: -Math.PI/8, z: 0 },
            geometry: new THREE.BoxGeometry(14, 1.5, 7.5),
            material: new THREE.MeshToonMaterial({ color: 0x2d5518 }),
            colliderDesc: RAPIER.ColliderDesc.cuboid(7, 0.75, 3.75)
        }), new PhysicsObject(world, {
            position: { x: -19.5, y: -0.25, z: 17 },
            rotation: { x: 0, y: 0, z: 0 },
            geometry: new THREE.BoxGeometry(23, 1.5, 3),
            material: new THREE.MeshToonMaterial({ color: 0x2d5518 }),
            colliderDesc: RAPIER.ColliderDesc.cuboid(11.5, 0.75, 1.5)
        }), new PhysicsObject(world, {
            position: { x: -31, y: -0.25, z: 16.5 },
            rotation: { x: 0, y: Math.PI/4, z: 0 },
            geometry: new THREE.BoxGeometry(2, 1.5, 2),
            material: new THREE.MeshToonMaterial({ color: 0x2d5518 }),
            colliderDesc: RAPIER.ColliderDesc.cuboid(1, 0.75, 1)
        }), new PhysicsObject(world, {
            position: { x: -25, y: -0.25, z: 14 },
            rotation: { x: 0, y: Math.PI/8, z: 0 },
            geometry: new THREE.BoxGeometry(12, 1.5, 2.25),
            material: new THREE.MeshToonMaterial({ color: 0x2d5518 }),
            colliderDesc: RAPIER.ColliderDesc.cuboid(6, 0.75, 1.125)
        }), new PhysicsObject(world, {
            position: { x: -18, y: -0.25, z: 9 },
            rotation: { x: 0, y: Math.PI/4, z: 0 },
            geometry: new THREE.BoxGeometry(22, 1.5, 3.5),
            material: new THREE.MeshToonMaterial({ color: 0x2d5518 }),
            colliderDesc: RAPIER.ColliderDesc.cuboid(11, 0.75, 1.75)
        }), new PhysicsObject(world, {
            position: { x: -15.5, y: -0.25, z: 11.5 },
            rotation: { x: 0, y: Math.PI/4, z: 0 },
            geometry: new THREE.BoxGeometry(15, 1.5, 4),
            material: new THREE.MeshToonMaterial({ color: 0x2d5518 }),
            colliderDesc: RAPIER.ColliderDesc.cuboid(7.5, 0.75, 2)
        }), new PhysicsObject(world, {
            position: { x: -13, y: -0.25, z: 14 },
            rotation: { x: 0, y: Math.PI/4, z: 0 },
            geometry: new THREE.BoxGeometry(10, 1.5, 4),
            material: new THREE.MeshToonMaterial({ color: 0x2d5518 }),
            colliderDesc: RAPIER.ColliderDesc.cuboid(5, 0.75, 2)
        }),
    ]);

    // River
    objects.push(new PhysicsObject(world, {
        position: { x: 0, y: -0.5, z: 0 },
        geometry: new THREE.BoxGeometry(99.9, 1, 99.9),
        material: new THREE.MeshToonMaterial({ color: 0x60bbe6, transparent: true, opacity: 0.5, depthWrite: false }),
        colliderDesc: RAPIER.ColliderDesc.cuboid(-0.1, -0.1, -0.1)
    }));

    // FUTURE: may need to use these for river pushing
    // objects.push(...[
    //     // N-to-E
    //     new PhysicsObject(world, {
    //         position: { x: 40, y: -0.5, z: 45 },
    //         rotation: { x: 0, y: 0, z: 0 },
    //         geometry: new THREE.BoxGeometry(20, 1, 5),
    //         material: new THREE.MeshToonMaterial({ color: 0x60bbe6, transparent: true, opacity: 0.5, depthWrite: false }),
    //         colliderDesc: RAPIER.ColliderDesc.cuboid(-0.1, -0.1, -0.1)
    //     }), new PhysicsObject(world, {
    //         position: { x: 25, y: -0.5, z: 42.5 },
    //         rotation: { x: 0, y: -Math.PI/8, z: 0 },
    //         geometry: new THREE.BoxGeometry(15, 1, 5),
    //         material: new THREE.MeshToonMaterial({ color: 0x60bbe6, transparent: true, opacity: 0.5, depthWrite: false }),
    //         colliderDesc: RAPIER.ColliderDesc.cuboid(-0.1, -0.1, -0.1)
    //     }), new PhysicsObject(world, {
    //         position: { x: 10, y: -0.5, z: 40 },
    //         rotation: { x: 0, y: 0, z: 0 },
    //         geometry: new THREE.BoxGeometry(20, 1, 5),
    //         material: new THREE.MeshToonMaterial({ color: 0x60bbe6, transparent: true, opacity: 0.5, depthWrite: false }),
    //         colliderDesc: RAPIER.ColliderDesc.cuboid(-0.1, -0.1, -0.1)
    //     }), new PhysicsObject(world, {
    //         position: { x: -8.5, y: -0.5, z: 30.4 },
    //         rotation: { x: 0, y: -Math.PI/4, z: 0 },
    //         geometry: new THREE.BoxGeometry(29.5, 1, 5),
    //         material: new THREE.MeshToonMaterial({ color: 0x60bbe6, transparent: true, opacity: 0.5, depthWrite: false }),
    //         colliderDesc: RAPIER.ColliderDesc.cuboid(-0.1, -0.1, -0.1)
    //     }), new PhysicsObject(world, {
    //         position: { x: -25, y: -0.5, z: 20.75 },
    //         rotation: { x: 0, y: 0, z: 0 },
    //         geometry: new THREE.BoxGeometry(15.5, 1, 5),
    //         material: new THREE.MeshToonMaterial({ color: 0x60bbe6, transparent: true, opacity: 0.5, depthWrite: false }),
    //         colliderDesc: RAPIER.ColliderDesc.cuboid(-0.1, -0.1, -0.1)
    //     }), new PhysicsObject(world, {
    //         position: { x: -34.5, y: -0.5, z: 18 },
    //         rotation: { x: 0, y: -Math.PI/4, z: 0 },
    //         geometry: new THREE.BoxGeometry(10, 1, 5),
    //         material: new THREE.MeshToonMaterial({ color: 0x60bbe6, transparent: true, opacity: 0.5, depthWrite: false }),
    //         colliderDesc: RAPIER.ColliderDesc.cuboid(-0.1, -0.1, -0.1)
    //     }), new PhysicsObject(world, {
    //         position: { x: -43, y: -0.5, z: 15.5 },
    //         rotation: { x: 0, y: 0, z: 0 },
    //         geometry: new THREE.BoxGeometry(14, 1, 5),
    //         material: new THREE.MeshToonMaterial({ color: 0x60bbe6, transparent: true, opacity: 0.5, depthWrite: false }),
    //         colliderDesc: RAPIER.ColliderDesc.cuboid(-0.1, -0.1, -0.1)
    //     }),

    //     // S-to-W
    //     new PhysicsObject(world, {
    //         position: { x: -32, y: -0.5, z: 13 },
    //         rotation: { x: 0, y: Math.PI/8, z: 0 },
    //         geometry: new THREE.BoxGeometry(14, 1, 5),
    //         material: new THREE.MeshToonMaterial({ color: 0x60bbe6, transparent: true, opacity: 0.5, depthWrite: false }),
    //         colliderDesc: RAPIER.ColliderDesc.cuboid(-0.1, -0.1, -0.1)
    //     }), new PhysicsObject(world, {
    //         position: { x: -21, y: -0.5, z: 6 },
    //         rotation: { x: 0, y: Math.PI/4, z: 0 },
    //         geometry: new THREE.BoxGeometry(15, 1, 5),
    //         material: new THREE.MeshToonMaterial({ color: 0x60bbe6, transparent: true, opacity: 0.5, depthWrite: false }),
    //         colliderDesc: RAPIER.ColliderDesc.cuboid(-0.1, -0.1, -0.1)
    //     }), new PhysicsObject(world, {
    //         position: { x: -16, y: -0.5, z: -5 },
    //         rotation: { x: 0, y: Math.PI/2, z: 0 },
    //         geometry: new THREE.BoxGeometry(15, 1, 5),
    //         material: new THREE.MeshToonMaterial({ color: 0x60bbe6, transparent: true, opacity: 0.5, depthWrite: false }),
    //         colliderDesc: RAPIER.ColliderDesc.cuboid(-0.1, -0.1, -0.1)
    //     }), new PhysicsObject(world, {
    //         castShadow: false,
    //         receiveShadow: false,
    //         position: { x: -10, y: -0.5, z: -25 },
    //         rotation: { x: 0, y: 3*Math.PI/8, z: 0 },
    //         geometry: new THREE.BoxGeometry(30, 1, 5),
    //         material: new THREE.MeshToonMaterial({ color: 0x60bbe6, transparent: true, opacity: 0.5, depthWrite: false }),
    //         colliderDesc: RAPIER.ColliderDesc.cuboid(-0.1, -0.1, -0.1)
    //     }), new PhysicsObject(world, {
    //         castShadow: false,
    //         receiveShadow: false,
    //         position: { x: -5, y: -0.5, z: -43 },
    //         rotation: { x: 0, y: Math.PI/2, z: 0 },
    //         geometry: new THREE.BoxGeometry(14, 1, 5),
    //         material: new THREE.MeshToonMaterial({ color: 0x60bbe6, transparent: true, opacity: 0.5, depthWrite: false }),
    //         colliderDesc: RAPIER.ColliderDesc.cuboid(-0.1, -0.1, -0.1)
    //     }),
    // ]);

    // Paths
    // FUTURE: Bevelling (https://stackoverflow.com/questions/68696415/three-js-how-to-make-a-fully-beveled-cube)
    objects.push(...[
        // Southbound
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

        // N-to-E
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
            position: { x: -0.5, y: 0.6, z: -11.5 },
            rotation: { x: 0, y: -0.4, z: 0 },
            geometry: new THREE.BoxGeometry(4, 0.5, 11),
            material: new THREE.MeshToonMaterial({ color: 0x919191 }),
            colliderDesc: RAPIER.ColliderDesc.cuboid(2, 0.25, 5.5)
        }), new PhysicsObject(world, {
            position: { x: 0, y: 0.49, z: -3 },
            rotation: { x: 0, y: 0.4, z: 0 },
            geometry: new THREE.BoxGeometry(5, 0.6, 10),
            material: new THREE.MeshToonMaterial({ color: 0xaeaeae }),
            colliderDesc: RAPIER.ColliderDesc.cuboid(2.5, 0.3, 5)
        }), new PhysicsObject(world, {
            position: { x: 3.5, y: 0.72, z: 4.5 },
            rotation: { x: 0, y: 0.5, z: 0 },
            geometry: new THREE.BoxGeometry(7, 0.5, 10),
            material: new THREE.MeshToonMaterial({ color: 0x939393 }),
            colliderDesc: RAPIER.ColliderDesc.cuboid(3.5, 0.25, 5)
        }), new PhysicsObject(world, {
            position: { x: 9.5, y: 0.64, z: 12.5 },
            rotation: { x: 0, y: Math.PI/4, z: 0 },
            geometry: new THREE.BoxGeometry(7, 0.6, 12),
            material: new THREE.MeshToonMaterial({ color: 0xb2b2b2 }),
            colliderDesc: RAPIER.ColliderDesc.cuboid(3.5, 0.3, 6)
        }),
    ]);

    // House 1a (TODO: improve colliders)
    objects.push(...[
        new PhysicsObject(world, { // house model
            position: { x: -22, y: 0.5, z: -42 },
            scale: { x: 0.5, y: 0.5, z: 0.5 },
            rotation: { x: 0, y: -Math.PI/8, z: 0 },
            geometry: house1aMesh.geometry,
            material: house1aMesh.material,
            colliderDesc: RAPIER.ColliderDesc.cuboid(-0.1, -0.1, -0.1)
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

    // House 1b
    objects.push(...[
        new PhysicsObject(world, { // house model
            position: { x: 30, y: 0.5, z: 2 },
            scale: { x: 0.5, y: 0.5, z: 0.5 },
            rotation: { x: 0, y: 1.25*Math.PI, z: 0 },
            geometry: house1bMesh.geometry,
            material: house1bMesh.material,
            colliderDesc: RAPIER.ColliderDesc.cuboid(-0.1, -0.1, -0.1)
        }), new PhysicsObject(world, { // path connector
            position: { x: 24, y: 0.35, z: -2 },
            rotation: { x: 0, y: 1.25*Math.PI, z: 0 },
            geometry: new THREE.BoxGeometry(3, 0.5, 2.5),
            material: new THREE.MeshToonMaterial({ color: 0xbbbbbb }),
            colliderDesc: RAPIER.ColliderDesc.cuboid(1.5, 0.25, 1.25)
        }),

        // Colliders (TODO: inside object colliders [convert some to dynamic])
        new PhysicsObject(world, { // left
            position: { x: 33.4, y: 3, z: -1.4 }, // -x/+z > | +x/+z ^
            rotation: { x: 0, y: 1.25*Math.PI, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 2, 5)
        }), new PhysicsObject(world, { // right
            position: { x: 26.6, y: 3, z: 5.4 }, // -x/+z > | +x/+z ^
            rotation: { x: 0, y: 1.25*Math.PI, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 2, 5)
        }), new PhysicsObject(world, { // back
            position: { x: 33.4, y: 3, z: 5.4 }, // -x/+z > | +x/+z ^
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 2, 5)
        }), new PhysicsObject(world, { // front left
            position: { x: 28.3, y: 3, z: -3.1 }, // -x/+z > | +x/+z ^
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 2, 2.5)
        }), new PhysicsObject(world, { // front right
            position: { x: 23.8, y: 3, z: 1.4 }, // -x/+z > | +x/+z ^
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 2, 0.95)
        }), new PhysicsObject(world, { // front top
            position: { x: 25.5, y: 4.1, z: -0.3 }, // -x/+z > | +x/+z ^
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 0.9, 1.9)
        }), new PhysicsObject(world, { // floor
            position: { x: 30, y: 0.75, z: 2 },
            rotation: { x: 0, y: 1.25*Math.PI, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(5, 0.25, 5)
        }), new PhysicsObject(world, { // entrance step
            position: { x: 25.1, y: 0.5, z: -0.8 },
            rotation: { x: 0, y: 1.25*Math.PI, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(1.5, 0.25, 0.5)
        }), new PhysicsObject(world, { // inner roof
            position: { x: 30, y: 5.2, z: 2 },
            rotation: { x: 0, y: 1.25*Math.PI, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(5, 0.25, 5)
        }), new PhysicsObject(world, { // left outer roof
            position: { x: 32, y: 7, z: 0 }, // -x/+z >
            rotation: { x: 0, y: 1.25*Math.PI, z: Math.PI/6 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(4, 0.5, 6)
        }), new PhysicsObject(world, { // right outer roof
            position: { x: 28, y: 7, z: 4 }, // -x/+z >
            rotation: { x: 0, y: 1.25*Math.PI, z: -Math.PI/6 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(4, 0.5, 6)
        }), new PhysicsObject(world, { // front outer roof
            position: { x: 26.45, y: 6.2, z: -1.95 },
            rotation: { x: 0, y: 1.25*Math.PI, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(3.5, 1, 0.25)
        }), new PhysicsObject(world, { // back outer roof
            position: { x: 33.55, y: 6.2, z: 5.95 },
            rotation: { x: 0, y: 1.25*Math.PI, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(3.5, 1, 0.25)
        }), new PhysicsObject(world, { // right tree
            position: { x: 21.4, y: 2, z: 4.3 },
            rotation: { x: 0, y: 0, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.capsule(2, 0.25)
        }), new PhysicsObject(world, { // back tree
            position: { x: 31.87, y: 1.7, z: 10.54 },
            rotation: { x: 0, y: 0, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.capsule(1.3, 0.25)
        }), new PhysicsObject(world, { // left dead tree
            position: { x: 36.25, y: 1.4, z: -3.96 },
            rotation: { x: 0, y: 0, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.capsule(0.9, 0.2)
        }), new PhysicsObject(world, { // bed
            position: { x: 32, y: 1.4, z: 4.7 }, // -x/+z > | +x/+z ^
            rotation: { x: 0, y: 1.25*Math.PI, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(1, 0.35, 1.3)
        }), 
    ]);

    // House 1c
    objects.push(...[
        new PhysicsObject(world, { // house model
            position: { x: 17, y: 0.5, z: 30 },
            scale: { x: 0.5, y: 0.5, z: 0.5 },
            rotation: { x: 0, y: 1.25*Math.PI, z: 0 },
            geometry: house1cMesh.geometry,
            material: house1cMesh.material,
            colliderDesc: RAPIER.ColliderDesc.cuboid(-0.1, -0.1, -0.1)
        }), new PhysicsObject(world, { // path connector
            position: { x: 11, y: 0.35, z: 26 },
            rotation: { x: 0, y: 1.25*Math.PI, z: 0 },
            geometry: new THREE.BoxGeometry(2.5, 0.5, 2.5),
            material: new THREE.MeshToonMaterial({ color: 0x9f9f9f }),
            colliderDesc: RAPIER.ColliderDesc.cuboid(1.25, 0.25, 1.25)
        }),

        // Colliders (TODO: inside object colliders [convert some to dynamic])
        new PhysicsObject(world, { // left
            position: { x: 20.4, y: 3, z: 26.6 },
            rotation: { x: 0, y: 1.25*Math.PI, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 2, 5)
        }), new PhysicsObject(world, { // right
            position: { x: 13.6, y: 3, z: 33.4 },
            rotation: { x: 0, y: 1.25*Math.PI, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 2, 5)
        }), new PhysicsObject(world, { // back
            position: { x: 20.4, y: 3, z: 33.4 },
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 2, 5)
        }), new PhysicsObject(world, { // front left
            position: { x: 15.3, y: 3, z: 24.9 },
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 2, 2.5)
        }), new PhysicsObject(world, { // front right
            position: { x: 10.8, y: 3, z: 29.4 },
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 2, 0.95)
        }), new PhysicsObject(world, { // front top
            position: { x: 12.5, y: 4.1, z: 27.7 },
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 0.9, 1.9)
        }), new PhysicsObject(world, { // floor
            position: { x: 17, y: 0.75, z: 30 },
            rotation: { x: 0, y: 1.25*Math.PI, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(5, 0.25, 5)
        }), new PhysicsObject(world, { // entrance step
            position: { x: 12.1, y: 0.5, z: 27.2 },
            rotation: { x: 0, y: 1.25*Math.PI, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(1.5, 0.25, 0.5)
        }), new PhysicsObject(world, { // inner roof
            position: { x: 17, y: 5.2, z: 30 },
            rotation: { x: 0, y: 1.25*Math.PI, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(5, 0.25, 5)
        }), new PhysicsObject(world, { // left outer roof
            position: { x: 19, y: 7, z: 28 },
            rotation: { x: 0, y: 1.25*Math.PI, z: Math.PI/6 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(4, 0.5, 6)
        }), new PhysicsObject(world, { // right outer roof
            position: { x: 15, y: 7, z: 32 },
            rotation: { x: 0, y: 1.25*Math.PI, z: -Math.PI/6 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(4, 0.5, 6)
        }), new PhysicsObject(world, { // front outer roof
            position: { x: 13.45, y: 6.2, z: 26.05 },
            rotation: { x: 0, y: 1.25*Math.PI, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(3.5, 1, 0.25)
        }), new PhysicsObject(world, { // back outer roof
            position: { x: 20.55, y: 6.2, z: 33.95 },
            rotation: { x: 0, y: 1.25*Math.PI, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(3.5, 1, 0.25)
        }), new PhysicsObject(world, { // bed
            position: { x: 19, y: 1.4, z: 32.7 },
            rotation: { x: 0, y: 1.25*Math.PI, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(1, 0.35, 1.3)
        }),
    ]);

    // House 2
    objects.push(...[
        new PhysicsObject(world, { // house model
            position: { x: 28, y: 0.5, z: 20 },
            scale: { x: 0.5, y: 0.5, z: 0.5 },
            rotation: { x: 0, y: 1.25*Math.PI, z: 0 },
            geometry: house2Mesh.geometry,
            material: house2Mesh.material,
            colliderDesc: RAPIER.ColliderDesc.cuboid(-0.1, -0.1, -0.1)
        }), new PhysicsObject(world, { // path connector
            position: { x: 20, y: 0.35, z: 14.75 },
            rotation: { x: 0, y: 1.25*Math.PI, z: 0 },
            geometry: new THREE.BoxGeometry(2.5, 0.6, 4),
            material: new THREE.MeshToonMaterial({ color: 0xbbbbbb }),
            colliderDesc: RAPIER.ColliderDesc.cuboid(1.25, 0.3, 2)
        }),

        // Colliders (TODO: inside object colliders)
        new PhysicsObject(world, { // left
            position: { x: 31.4, y: 4, z: 16.6 }, // -x/+z > | +x/+z ^
            rotation: { x: 0, y: 1.25*Math.PI, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 3, 7)
        }), new PhysicsObject(world, { // right
            position: { x: 24.6, y: 4, z: 23.4 }, // -x/+z > | +x/+z ^
            rotation: { x: 0, y: 1.25*Math.PI, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 3, 7)
        }), new PhysicsObject(world, { // back
            position: { x: 32.95, y: 4, z: 24.95 }, // -x/+z > | +x/+z ^
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 3, 5)
        }), new PhysicsObject(world, { // front left
            position: { x: 24.5, y: 4, z: 13.6 }, // -x/+z > | +x/+z ^
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 3, 2.5)
        }), new PhysicsObject(world, { // front right
            position: { x: 20.1, y: 4, z: 18 }, // -x/+z > | +x/+z ^
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 3, 0.75)
        }), new PhysicsObject(world, { // front top
            position: { x: 21.7, y: 5.5, z: 16.4 }, // -x/+z > | +x/+z ^
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 1.5, 1.4)
        }), new PhysicsObject(world, { // inside left
            position: { x: 32.75, y: 4, z: 18.75 }, // -x/+z > | +x/+z ^
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 3, 0.75)
        }), new PhysicsObject(world, { // inside right
            position: { x: 28.35, y: 4, z: 23.15 }, // -x/+z > | +x/+z ^
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 3, 2.5)
        }), new PhysicsObject(world, { // inside top
            position: { x: 31.2, y: 5.5, z: 20.3 }, // -x/+z > | +x/+z ^
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 1.5, 1.6)
        }), new PhysicsObject(world, { // floor
            position: { x: 28, y: 0.75, z: 20 },
            rotation: { x: 0, y: 1.25*Math.PI, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(5, 0.25, 7.25)
        }), new PhysicsObject(world, { // entrance step
            position: { x: 21.1, y: 0.5, z: 15.9 },
            rotation: { x: 0, y: 1.25*Math.PI, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(1.5, 0.25, 0.5)
        }), new PhysicsObject(world, { // inner roof
            position: { x: 28, y: 6.75, z: 20 },
            rotation: { x: 0, y: 1.25*Math.PI, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(5, 0.25, 7.25)
        }), new PhysicsObject(world, { // left outer roof
            position: { x: 30, y: 9, z: 18 }, // -x/+z > | +x/+z ^
            rotation: { x: 0, y: 1.25*Math.PI, z: Math.PI/6 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(4, 0.25, 8.25)
        }), new PhysicsObject(world, { // right outer roof
            position: { x: 26, y: 9, z: 22 }, // -x/+z > | +x/+z ^
            rotation: { x: 0, y: 1.25*Math.PI, z: -Math.PI/6 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(4, 0.25, 8.25)
        }), new PhysicsObject(world, { // front outer roof
            position: { x: 23, y: 8, z: 15 }, // -x/+z > | +x/+z ^
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 1, 3)
        }), new PhysicsObject(world, { // back outer roof
            position: { x: 32.95, y: 8, z: 24.95 }, // -x/+z > | +x/+z ^
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 1, 3)
        }), new PhysicsObject(world, { // sink
            position: { x: 34.5, y: 1.5, z: 22.2 }, // -x/+z > | +x/+z ^
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.7, 0.5, 1.5)
        }), new PhysicsObject(world, { // toilet
            position: { x: 27.9, y: 1.5, z: 25.1 }, // -x/+z > | +x/+z ^
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.3, 0.5, 0.3)
        }), new PhysicsObject(world, { // shower (floor)
            position: { x: 30.3, y: 1.2, z: 26.2 }, // -x/+z > | +x/+z ^
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.5, 0.1, 1.5)
        }), 
    ]);

    // House 3
    objects.push(...[
        new PhysicsObject(world, {
            position: { x: -8.5, y: 0.5, z: 13 },
            scale: { x: 0.5, y: 0.5, z: 0.5 },
            rotation: { x: 0, y: -1.25*Math.PI, z: 0 },
            geometry: house3Mesh.geometry,
            material: house3Mesh.material,
            colliderDesc: RAPIER.ColliderDesc.cuboid(-0.1, -0.1, -0.1)
        }), new PhysicsObject(world, { // path connector
            position: { x: 1.7, y: 0.35, z: 10.9 },
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            geometry: new THREE.BoxGeometry(2.5, 0.6, 4),
            material: new THREE.MeshToonMaterial({ color: 0x9f9f9f }),
            colliderDesc: RAPIER.ColliderDesc.cuboid(1.25, 0.3, 2)
        }),

        // Colliders (TODO: inside object colliders [convert some to dynamic])
        new PhysicsObject(world, { // [floor] (F1)
            position: { x: -6.4, y: 0.75, z: 15.1 }, // -x/-z > | -x/+z ^
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(6.7, 0.25, 7.5)
        }), new PhysicsObject(world, { // [entrance step] (F1)
            position: { x: 1.25, y: 0.5, z: 11.4 },
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(1.5, 0.25, 0.5)
        }), new PhysicsObject(world, { // [outer wall] left (F1)
            position: { x: -1.8, y: 3, z: 19.7 }, // -x/-z > | -x/+z ^
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 2.5, 7.5)
        }), new PhysicsObject(world, { // [outer wall] right (F1)
            position: { x: -11, y: 3, z: 10.5 }, // -x/-z > | -x/+z ^
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 2.5, 7.5)
        }), new PhysicsObject(world, { // [outer wall] back (F1)
            position: { x: -11.5, y: 3, z: 20.2 }, // -x/-z > | -x/+z ^
            rotation: { x: 0, y: 0.25*Math.PI, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 2.5, 6.5)
        }), new PhysicsObject(world, { // [outer wall] front-left (F1)
            position: { x: 2.5, y: 3, z: 13.75 }, // -x/-z > | -x/+z ^
            rotation: { x: 0, y: 0.25*Math.PI, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 2.5, 1)
        }), new PhysicsObject(world, { // [outer wall] front-right (F1)
            position: { x: -3.05, y: 3, z: 8.2 }, // -x/-z > | -x/+z ^
            rotation: { x: 0, y: 0.25*Math.PI, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 2.5, 3.75)
        }), new PhysicsObject(world, { // [outer wall] front-top (F1)
            position: { x: 0.7, y: 4.75, z: 11.95 }, // -x/-z > | -x/+z ^
            rotation: { x: 0, y: 0.25*Math.PI, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 0.75, 1.6)
        }), new PhysicsObject(world, { // [inner wall] left (F1)
            position: { x: -7.4, y: 3, z: 19.4 }, // -x/-z > | -x/+z ^
            rotation: { x: 0, y: 0.25*Math.PI, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 2.5, 4)
        }), new PhysicsObject(world, { // [inner wall] top (F1)
            position: { x: -11.3, y: 4.75, z: 15.5 }, // -x/-z > | -x/+z ^
            rotation: { x: 0, y: 0.25*Math.PI, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 0.75, 1.6)
        }), new PhysicsObject(world, { // [inner wall] right (F1)
            position: { x: -13, y: 3, z: 13.8 }, // -x/-z > | -x/+z ^
            rotation: { x: 0, y: 0.25*Math.PI, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 2.5, 0.9)
        }), new PhysicsObject(world, { // [kitchen counter] (F1)
            position: { x: -8.8, y: 1.5, z: 9.8 }, // -x/-z > | -x/+z ^
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.8, 1, 2.4)
        }), new PhysicsObject(world, { // [stairs] (F1)
            position: { x: -8, y: 2, z: 21.3 }, // -x/-z > | -x/+z ^
            rotation: { x: 0, y: 0.75*Math.PI, z: -Math.PI/4 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(4.5, 0.25, 1.6)
        }), new PhysicsObject(world, { // [floor] large (F2)
            position: { x: -5.2, y: 5.75, z: 13.9 }, // -x/-z > | -x/+z ^
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(6.7, 0.25, 5.75)
        }), new PhysicsObject(world, { // [floor] stair-adj (F2)
            position: { x: -12.8, y: 5.75, z: 16.9 }, // -x/-z > | -x/+z ^
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(3.45, 0.25, 1.75)
        }), new PhysicsObject(world, { // [floor] balcony (F2)
            position: { x: -12.5, y: 5.75, z: 9 }, // -x/-z > | -x/+z ^
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(2.5, 0.25, 7.5)
        }), new PhysicsObject(world, { // [outer wall] left (F2)
            position: { x: -1.8, y: 9, z: 19.7 }, // -x/-z > | -x/+z ^
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 3, 7.5)
        }), new PhysicsObject(world, { // [outer wall] right-left (F2)
            position: { x: -9.4, y: 9, z: 8.9 }, // -x/-z > | -x/+z ^
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 3, 5.25)
        }), new PhysicsObject(world, { // [outer wall] right-top  (F2)
            position: { x: -14.18, y: 10.5, z: 13.67 }, // -x/-z > | -x/+z ^
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 1.5, 1.5)
        }), new PhysicsObject(world, { // [outer wall] right-right  (F2)
            position: { x: -15.5, y: 9, z: 15.1 }, // -x/-z > | -x/+z ^
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 3, 0.5)
        }), new PhysicsObject(world, { // [outer wall] front (F2)
            position: { x: -1.3, y: 9, z: 10.0 }, // -x/-z > | -x/+z ^
            rotation: { x: 0, y: 0.25*Math.PI, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 3, 6.5)
        }), new PhysicsObject(world, { // [outer wall] back (F2)
            position: { x: -11.5, y: 9, z: 20.2 }, // -x/-z > | -x/+z ^
            rotation: { x: 0, y: 0.25*Math.PI, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 3, 6.5)
        }), new PhysicsObject(world, { // [inner wall] stair_bed-left (F2)
            position: { x: -12.7, y: 9, z: 17.9 }, // -x/-z > | -x/+z ^
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 3, 0.5)
        }), new PhysicsObject(world, { // [outer wall] stair_bed-top  (F2)
            position: { x: -11.3, y: 10.5, z: 16.5 }, // -x/-z > | -x/+z ^
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 1.5, 1.5)
        }), new PhysicsObject(world, { // [inner wall] stair_bed-right/bath_bed-right (F2)
            position: { x: -9.45, y: 9, z: 14.6 }, // -x/-z > | -x/+z ^
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 3, 1.25)
        }), new PhysicsObject(world, { // [outer wall] bath_bed-top  (F2)
            position: { x: -7.5, y: 10.5, z: 12.6 }, // -x/-z > | -x/+z ^
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 1.5, 1.5)
        }), new PhysicsObject(world, { // [inner wall] bath_bed-left (F2)
            position: { x: -4.8, y: 9, z: 9.95 }, // -x/-z > | -x/+z ^
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 3, 2.3)
        }), new PhysicsObject(world, { // [inner wall] stair_bed (F2)
            position: { x: -6.1, y: 9, z: 17.9 }, // -x/-z > | -x/+z ^
            rotation: { x: 0, y: 0.25*Math.PI, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 3, 4.5)
        }), new PhysicsObject(world, { // [balcony fence] left (F2)
            position: { x: -17.6, y: 6.5, z: 14 }, // -x/-z > | -x/+z ^
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(2, 0.5, 0.25)
        }), new PhysicsObject(world, { // [balcony fence] right (F2)
            position: { x: -7.4, y: 6.5, z: 3.8 }, // -x/-z > | -x/+z ^
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(2, 0.5, 0.25)
        }), new PhysicsObject(world, { // [balcony fence] right (F2)
            position: { x: -14.3, y: 6.5, z: 7.55 }, // -x/-z > | -x/+z ^
            rotation: { x: 0, y: 0.25*Math.PI, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(7, 0.5, 0.25)
        }), new PhysicsObject(world, { // [bed] (F2)
            position: { x: -6.4, y: 6.25, z: 8.1 }, // -x/-z > | -x/+z ^
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(1, 0.25, 2)
        }), new PhysicsObject(world, { // [bathroom sink] (F2)
            position: { x: 0.5, y: 6.5, z: 16.3 }, // -x/-z > | -x/+z ^
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.75, 0.5, 1.5)
        }), new PhysicsObject(world, { // [toilet] (F2)
            position: { x: -4.55, y: 6.5, z: 18.4 }, // -x/-z > | -x/+z ^
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.4, 0.3, 0.5)
        }), new PhysicsObject(world, { // [post] front
            position: { x: -9, y: 5.75, z: 2.3 }, // -x/-z > | -x/+z ^
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 5.5, 0.25)
        }), new PhysicsObject(world, { // [post] back
            position: { x: -19.35, y: 5.75, z: 12.55 }, // -x/-z > | -x/+z ^
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 5.5, 0.25)
        }), new PhysicsObject(world, { // [inner roof] main
            position: { x: -6.4, y: 11.75, z: 15.1 }, // -x/-z > | -x/+z ^
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(6.7, 0.25, 7.5)
        }), new PhysicsObject(world, { // [inner roof] balcony
            position: { x: -12.5, y: 11.75, z: 9 }, // -x/-z > | -x/+z ^
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(2.5, 0.25, 7.5)
        }), new PhysicsObject(world, { // [outer roof] front (F1)
            position: { x: -3, y: 13.75, z: 7.7 }, // -x/-z > | -x/+z ^
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(6, 2, 0.4)
        }), new PhysicsObject(world, { // [outer roof] back (F1)
            position: { x: -13.5, y: 13.75, z: 18.2 }, // -x/-z > | -x/+z ^
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(6, 2, 0.5)
        }), new PhysicsObject(world, { // [outer roof] left (F1)
            position: { x: -4.5, y: 15.5, z: 17 }, // -x/-z > | -x/+z ^
            rotation: { x: 0, y: 0.75*Math.PI, z: Math.PI/6 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(6.5, 0.5, 8)
        }), new PhysicsObject(world, { // [outer roof] right (F1)
            position: { x: -12.5, y: 15.5, z: 9 }, // -x/-z > | -x/+z ^
            rotation: { x: 0, y: 0.75*Math.PI, z: -Math.PI/6 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(6.5, 0.5, 8)
        }), 
    ]);

    // House 4
    objects.push(...[
        new PhysicsObject(world, { // house model
            position: { x: -37, y: 0.5, z: -18 },
            scale: { x: 0.5, y: 0.5, z: 0.5 },
            rotation: { x: 0, y: Math.PI, z: 0 },
            geometry: house4Mesh.geometry,
            material: house4Mesh.material,
            colliderDesc: RAPIER.ColliderDesc.cuboid(-0.1, -0.1, -0.1)
        }), new PhysicsObject(world, { // path connector
            position: { x: -31, y: 0.35, z: -30 },
            rotation: { x: 0, y: 0, z: 0 },
            geometry: new THREE.BoxGeometry(2.5, 0.6, 4),
            material: new THREE.MeshToonMaterial({ color: 0x9f9f9f }),
            colliderDesc: RAPIER.ColliderDesc.cuboid(1.25, 0.3, 2)
        }),

        // Colliders (TODO: inside object colliders [convert some to dynamic])
        new PhysicsObject(world, { // left
            position: { x: -27.3, y: 3, z: -18 },
            rotation: { x: 0, y: 0, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 2, 10)
        }), new PhysicsObject(world, { // right
            position: { x: -46.7, y: 3, z: -18 },
            rotation: { x: 0, y: 0, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 2, 10)
        }), new PhysicsObject(world, { // back
            position: { x: -37, y: 3, z: -8.3 },
            rotation: { x: 0, y: Math.PI/2, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 2, 10)
        }), new PhysicsObject(world, { // front left
            position: { x: -28.2, y: 3, z: -27.7 },
            rotation: { x: 0, y: Math.PI/2, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 2, 1)
        }), new PhysicsObject(world, { // front right
            position: { x: -39.5, y: 3, z: -27.7 },
            rotation: { x: 0, y: Math.PI/2, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 2, 7.2)
        }), new PhysicsObject(world, { // front top
            position: { x: -30.7, y: 4.3, z: -27.7 },
            rotation: { x: 0, y: Math.PI/2, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 0.7, 1.7)
        }), new PhysicsObject(world, { // inside long left
            position: { x: -34.65, y: 3, z: -15.8 },
            rotation: { x: 0, y: 0, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 2, 7.3)
        }), new PhysicsObject(world, { // inside long top
            position: { x: -34.65, y: 4.2, z: -24.6 },
            rotation: { x: 0, y: 0, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 0.7, 1.6)
        }), new PhysicsObject(world, { // inside long right
            position: { x: -34.65, y: 3, z: -26.9 },
            rotation: { x: 0, y: 0, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 2, 0.65)
        }), new PhysicsObject(world, { // inside short left
            position: { x: -38.5, y: 3, z: -18.8 },
            rotation: { x: 0, y: Math.PI/2, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 2, 4)
        }), new PhysicsObject(world, { // inside short top
            position: { x: -44, y: 4.2, z: -18.8 },
            rotation: { x: 0, y: Math.PI/2, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 0.7, 1.6)
        }), new PhysicsObject(world, { // inside short top
            position: { x: -46.2, y: 3, z: -18.8 },
            rotation: { x: 0, y: Math.PI/2, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 2, 0.6)
        }), new PhysicsObject(world, { // floor
            position: { x: -37, y: 0.75, z: -18 },
            rotation: { x: 0, y: 0, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(10, 0.25, 10)
        }), new PhysicsObject(world, { // entrance step
            position: { x: -30.7, y: 0.5, z: -28.6 },
            rotation: { x: 0, y: 0, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(1.5, 0.25, 0.5)
        }), new PhysicsObject(world, { // inner roof
            position: { x: -37, y: 5.2, z: -18 },
            rotation: { x: 0, y: 0, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(10, 0.25, 10)
        }), new PhysicsObject(world, { // left outer roof
            position: { x: -31, y: 7.2, z: -18 },
            rotation: { x: 0, y: 0, z: -Math.PI/8 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(7, 0.5, 11)
        }), new PhysicsObject(world, { // right outer roof
            position: { x: -43, y: 7.2, z: -18 },
            rotation: { x: 0, y: Math.PI, z: -Math.PI/8 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(7, 0.5, 11)
        }), new PhysicsObject(world, { // front outer roof
            position: { x: -37, y: 6, z: -27.7 },
            rotation: { x: 0, y: Math.PI/2, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 1.2, 6)
        }), new PhysicsObject(world, { // back outer roof
            position: { x: -37, y: 6, z: -8.3 },
            rotation: { x: 0, y: Math.PI/2, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 1.2, 6)
        }), new PhysicsObject(world, { // dining table
            position: { x: -37.7, y: 1.7, z: -21.1 },
            rotation: { x: 0, y: Math.PI/2, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.8, 0.7, 1.35)
        }), new PhysicsObject(world, { // dining table
            position: { x: -44, y: 1.3, z: -12.7 },
            rotation: { x: 0, y: Math.PI/2, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(2, 0.5, 2)
        }), 
    ]);

    // TODO: Uncomment
    // Forest
    objects.push(...[
        // Trees
        new PhysicsObject(world, { // model
            position: { x: -44, y: 0, z: 7.5 },
            scale: { x: 0.75, y: 0.75, z: 0.75 },
            geometry: tree1Mesh.geometry,
            material: tree1Mesh.material,
            colliderDesc: RAPIER.ColliderDesc.cuboid(-0.1, -0.1, -0.1)
        }), new PhysicsObject(world, { // hitbox
            position: { x: -44.5, y: 12, z: 7.3 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.capsule(12, 1.5)
        }), new PhysicsObject(world, { // model
            position: { x: -34.75, y: 0, z: 0 },
            scale: { x: 0.25, y: 0.25, z: 0.25 },
            geometry: tree2Mesh.geometry,
            material: tree2Mesh.material,
            colliderDesc: RAPIER.ColliderDesc.cuboid(-0.1, -0.1, -0.1)
        }), new PhysicsObject(world, { // hitbox
            position: { x: -34.75, y: 3, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.capsule(3, 0.5)
        }), new PhysicsObject(world, { // model
            position: { x: -36.25, y: 0, z: 9.25 },
            scale: { x: 0.4, y: 0.4, z: 0.4 },
            geometry: tree3Mesh.geometry,
            material: tree3Mesh.material,
            colliderDesc: RAPIER.ColliderDesc.cuboid(-0.1, -0.1, -0.1)
        }), new PhysicsObject(world, { // hitbox
            position: { x: -36.25, y: 6, z: 9.25 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.capsule(6, 1.5)
        }), new PhysicsObject(world, { // model
            position: { x: -42.75, y: 0, z: -2 },
            scale: { x: 0.2, y: 0.2, z: 0.2 },
            geometry: tree3Mesh.geometry,
            material: tree3Mesh.material,
            colliderDesc: RAPIER.ColliderDesc.cuboid(-0.1, -0.1, -0.1)
        }), new PhysicsObject(world, { // hitbox
            position: { x: -42.75, y: 2.5, z: -2 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.capsule(2.6, 1)
        }), new PhysicsObject(world, { // model
            position: { x: -27, y: 0, z: 4 },
            scale: { x: 0.25, y: 0.25, z: 0.25 },
            geometry: tree1Mesh.geometry,
            material: tree1Mesh.material,
            colliderDesc: RAPIER.ColliderDesc.cuboid(-0.1, -0.1, -0.1)
        }), new PhysicsObject(world, { // hitbox
            position: { x: -27, y: 3, z: 4 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.capsule(3, 0.75)
        }), new PhysicsObject(world, { // model
            position: { x: -47.25, y: 0, z: 20.75 },
            scale: { x: 0.3, y: 0.3, z: 0.3 },
            geometry: tree2Mesh.geometry,
            material: tree2Mesh.material,
            colliderDesc: RAPIER.ColliderDesc.cuboid(-0.1, -0.1, -0.1)
        }), new PhysicsObject(world, { // hitbox
            position: { x: -47.25, y: 4, z: 20.75 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.capsule(4, 0.75)
        }), new PhysicsObject(world, { // model
            position: { x: -40.35, y: 0, z: 19.75 },
            scale: { x: 0.3, y: 0.6, z: 0.3 },
            geometry: tree1Mesh.geometry,
            material: tree1Mesh.material,
            colliderDesc: RAPIER.ColliderDesc.cuboid(-0.1, -0.1, -0.1)
        }), new PhysicsObject(world, { // hitbox
            position: { x: -40.35, y: 10, z: 19.75 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.capsule(10, 0.75)
        }), new PhysicsObject(world, { // model
            position: { x: -41.65, y: 0, z: 27 },
            scale: { x: 0.25, y: 0.4, z: 0.25 },
            geometry: tree3Mesh.geometry,
            material: tree3Mesh.material,
            colliderDesc: RAPIER.ColliderDesc.cuboid(-0.1, -0.1, -0.1)
        }), new PhysicsObject(world, { // hitbox
            position: { x: -41.65, y: 6, z: 27 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.capsule(6, 0.75)
        }), new PhysicsObject(world, { // model
            position: { x: -32.85, y: 0, z: 25.5 },
            scale: { x: 0.4, y: 0.2, z: 0.4 },
            geometry: tree1Mesh.geometry,
            material: tree1Mesh.material,
            colliderDesc: RAPIER.ColliderDesc.cuboid(-0.1, -0.1, -0.1)
        }), new PhysicsObject(world, { // hitbox
            position: { x: -32.85, y: 3, z: 25.5 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.capsule(3, 0.75)
        }), new PhysicsObject(world, { // model
            position: { x: -47.15, y: 0, z: 31.8 },
            scale: { x: 0.3, y: 0.6, z: 0.3 },
            geometry: tree3Mesh.geometry,
            material: tree3Mesh.material,
            colliderDesc: RAPIER.ColliderDesc.cuboid(-0.1, -0.1, -0.1)
        }), new PhysicsObject(world, { // hitbox
            position: { x: -47.15, y: 10, z: 31.8 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.capsule(10, 1)
        }), new PhysicsObject(world, { // model
            position: { x: -37.5, y: 0, z: 32.4 },
            scale: { x: 0.4, y: 0.4, z: 0.4 },
            geometry: tree1Mesh.geometry,
            material: tree1Mesh.material,
            colliderDesc: RAPIER.ColliderDesc.cuboid(-0.1, -0.1, -0.1)
        }), new PhysicsObject(world, { // hitbox
            position: { x: -37.5, y: 7, z: 32.4 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.capsule(7, 1)
        }), new PhysicsObject(world, { // model
            position: { x: -28, y: 0, z: 32.6 },
            scale: { x: 0.5, y: 0.9, z: 0.5 },
            geometry: tree3Mesh.geometry,
            material: tree3Mesh.material,
            colliderDesc: RAPIER.ColliderDesc.cuboid(-0.1, -0.1, -0.1)
        }), new PhysicsObject(world, { // hitbox
            position: { x: -28, y: 15, z: 32.6 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.capsule(15, 1.5)
        }), new PhysicsObject(world, { // model
            position: { x: -22.5, y: 0, z: 26 },
            scale: { x: 0.3, y: 0.3, z: 0.3 },
            geometry: tree1Mesh.geometry,
            material: tree1Mesh.material,
            colliderDesc: RAPIER.ColliderDesc.cuboid(-0.1, -0.1, -0.1)
        }), new PhysicsObject(world, { // hitbox
            position: { x: -22.5, y: 5, z: 26 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.capsule(5, 0.75)
        }), new PhysicsObject(world, { // model
            position: { x: -43.8, y: 0, z: 37.3 },
            scale: { x: 0.2, y: 0.3, z: 0.2 },
            geometry: tree2Mesh.geometry,
            material: tree2Mesh.material,
            colliderDesc: RAPIER.ColliderDesc.cuboid(-0.1, -0.1, -0.1)
        }), new PhysicsObject(world, { // hitbox
            position: { x: -43.8, y: 4, z: 37.3 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.capsule(4, 0.5)
        }), new PhysicsObject(world, { // model
            position: { x: -47.4, y: 0, z: 41.3 },
            scale: { x: 0.2, y: 0.5, z: 0.2 },
            geometry: tree1Mesh.geometry,
            material: tree1Mesh.material,
            colliderDesc: RAPIER.ColliderDesc.cuboid(-0.1, -0.1, -0.1)
        }), new PhysicsObject(world, { // hitbox
            position: { x: -47.4, y: 8, z: 41.3 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.capsule(8, 0.5)
        }), new PhysicsObject(world, { // model
            position: { x: -41.8, y: 0, z: 43 },
            scale: { x: 0.4, y: 0.4, z: 0.4 },
            geometry: tree3Mesh.geometry,
            material: tree3Mesh.material,
            colliderDesc: RAPIER.ColliderDesc.cuboid(-0.1, -0.1, -0.1)
        }), new PhysicsObject(world, { // hitbox
            position: { x: -41.8, y: 8, z: 43 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.capsule(8, 0.5)
        }), new PhysicsObject(world, { // model
            position: { x: -33.5, y: 0, z: 40.8 },
            scale: { x: 0.3, y: 0.5, z: 0.3 },
            geometry: tree2Mesh.geometry,
            material: tree2Mesh.material,
            colliderDesc: RAPIER.ColliderDesc.cuboid(-0.1, -0.1, -0.1)
        }), new PhysicsObject(world, { // hitbox
            position: { x: -33.5, y: 8, z: 40.8 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.capsule(8, 0.5)
        }), new PhysicsObject(world, { // model
            position: { x: -34.85, y: 0, z: 48.45 },
            scale: { x: 0.3, y: 0.6, z: 0.3 },
            geometry: tree1Mesh.geometry,
            material: tree1Mesh.material,
            colliderDesc: RAPIER.ColliderDesc.cuboid(-0.1, -0.1, -0.1)
        }), new PhysicsObject(world, { // hitbox
            position: { x: -34.85, y: 12, z: 48.45 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.capsule(12, 0.5)
        }), new PhysicsObject(world, { // model
            position: { x: -47.5, y: 0, z: 47.7 },
            scale: { x: 0.25, y: 0.3, z: 0.25 },
            geometry: tree1Mesh.geometry,
            material: tree1Mesh.material,
            colliderDesc: RAPIER.ColliderDesc.cuboid(-0.1, -0.1, -0.1)
        }), new PhysicsObject(world, { // hitbox
            position: { x: -47.5, y: 6, z: 47.7 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.capsule(6, 0.75)
        }), new PhysicsObject(world, { // model
            position: { x: -28.5, y: 0, z: 45.5 },
            scale: { x: 0.25, y: 0.3, z: 0.25 },
            geometry: tree3Mesh.geometry,
            material: tree3Mesh.material,
            colliderDesc: RAPIER.ColliderDesc.cuboid(-0.1, -0.1, -0.1)
        }), new PhysicsObject(world, { // hitbox
            position: { x: -28.5, y: 5, z: 45.5 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.capsule(5, 0.75)
        }), new PhysicsObject(world, { // model
            position: { x: -24.2, y: 0, z: 14.5 },
            scale: { x: 0.25, y: 0.3, z: 0.25 },
            geometry: tree1Mesh.geometry,
            material: tree1Mesh.material,
            colliderDesc: RAPIER.ColliderDesc.cuboid(-0.1, -0.1, -0.1)
        }), new PhysicsObject(world, { // hitbox
            position: { x: -24.2, y: 5, z: 14.5 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.capsule(5, 0.5)
        }), new PhysicsObject(world, { // model
            position: { x: -21.1, y: 0, z: 17.5 },
            scale: { x: 0.1, y: 0.25, z: 0.1 },
            geometry: tree2Mesh.geometry,
            material: tree2Mesh.material,
            colliderDesc: RAPIER.ColliderDesc.cuboid(-0.1, -0.1, -0.1)
        }), new PhysicsObject(world, { // hitbox
            position: { x: -21.1, y: 3, z: 17.5 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.capsule(3, 0.4)
        }), new PhysicsObject(world, { // model
            position: { x: -28.4, y: 0, z: 16.3 },
            scale: { x: 0.3, y: 0.5, z: 0.3 },
            geometry: tree3Mesh.geometry,
            material: tree3Mesh.material,
            colliderDesc: RAPIER.ColliderDesc.cuboid(-0.1, -0.1, -0.1)
        }), new PhysicsObject(world, { // hitbox
            position: { x: -28.4, y: 6, z: 16.3 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.capsule(6, 0.7)
        }), new PhysicsObject(world, { // model
            position: { x: -22.3, y: 0, z: 39.2 },
            scale: { x: 0.3, y: 0.4, z: 0.3 },
            geometry: tree2Mesh.geometry,
            material: tree2Mesh.material,
            colliderDesc: RAPIER.ColliderDesc.cuboid(-0.1, -0.1, -0.1)
        }), new PhysicsObject(world, { // hitbox
            position: { x: -22.3, y: 6, z: 39.2 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.capsule(6, 0.7)
        }), 

        // Rock path across river
        new PhysicsObject(world, {
            position: { x: -42.1, y: -1, z: 17 },
            rotation: { x: 0, y: Math.PI/6, z: 0 },
            geometry: new THREE.CapsuleGeometry(0.8, 1, 2, 4),
            material: new THREE.MeshToonMaterial({ color: 0x8f8f8f }),
            colliderDesc: RAPIER.ColliderDesc.capsule(0.5, 0.8)
        }), new PhysicsObject(world, {
            position: { x: -42.75, y: -1, z: 15.1 },
            rotation: { x: 0, y: -Math.PI/4, z: 0 },
            geometry: new THREE.CapsuleGeometry(0.8, 1, 2, 4),
            material: new THREE.MeshToonMaterial({ color: 0x8f8f8f }),
            colliderDesc: RAPIER.ColliderDesc.capsule(0.5, 0.8)
        }), new PhysicsObject(world, {
            position: { x: -42.1, y: -1, z: 13.5 },
            geometry: new THREE.CapsuleGeometry(0.8, 1, 2, 4),
            material: new THREE.MeshToonMaterial({ color: 0x8f8f8f }),
            colliderDesc: RAPIER.ColliderDesc.capsule(0.5, 0.8)
        })
    ]);

    // Farmland
    objects.push(...[
        // Land
        new PhysicsObject(world, {
            position: { x: 5, y: 0.3, z: -35 },
            geometry: new THREE.BoxGeometry(3, 0.5, 30),
            material: new THREE.MeshToonMaterial({ color: 0x5e3d27 }),
            colliderDesc: RAPIER.ColliderDesc.cuboid(1.5, 0.25, 15)
        }), new PhysicsObject(world, {
            position: { x: 8, y: 0.3, z: -34.5 },
            geometry: new THREE.BoxGeometry(3, 0.5, 31),
            material: new THREE.MeshToonMaterial({ color: 0x875737 }),
            colliderDesc: RAPIER.ColliderDesc.cuboid(1.5, 0.25, 15.5)
        }), new PhysicsObject(world, {
            position: { x: 11, y: 0.3, z: -34 },
            geometry: new THREE.BoxGeometry(3, 0.5, 32),
            material: new THREE.MeshToonMaterial({ color: 0x5e3d27 }),
            colliderDesc: RAPIER.ColliderDesc.cuboid(1.5, 0.25, 16)
        }), new PhysicsObject(world, {
            position: { x: 14, y: 0.3, z: -33.5 },
            geometry: new THREE.BoxGeometry(3, 0.5, 33),
            material: new THREE.MeshToonMaterial({ color: 0x875737 }),
            colliderDesc: RAPIER.ColliderDesc.cuboid(1.5, 0.25, 16.5)
        }), new PhysicsObject(world, {
            position: { x: 17, y: 0.3, z: -33 },
            geometry: new THREE.BoxGeometry(3, 0.5, 34),
            material: new THREE.MeshToonMaterial({ color: 0x5e3d27 }),
            colliderDesc: RAPIER.ColliderDesc.cuboid(1.5, 0.25, 17)
        }), new PhysicsObject(world, {
            position: { x: 20, y: 0.3, z: -32.5 },
            geometry: new THREE.BoxGeometry(3, 0.5, 35),
            material: new THREE.MeshToonMaterial({ color: 0x875737 }),
            colliderDesc: RAPIER.ColliderDesc.cuboid(1.5, 0.25, 17.5)
        }), new PhysicsObject(world, {
            position: { x: 23, y: 0.3, z: -32.5 },
            geometry: new THREE.BoxGeometry(3, 0.5, 35),
            material: new THREE.MeshToonMaterial({ color: 0x5e3d27 }),
            colliderDesc: RAPIER.ColliderDesc.cuboid(1.5, 0.25, 17.5)
        }), new PhysicsObject(world, {
            position: { x: 26, y: 0.3, z: -33 },
            geometry: new THREE.BoxGeometry(3, 0.5, 34),
            material: new THREE.MeshToonMaterial({ color: 0x875737 }),
            colliderDesc: RAPIER.ColliderDesc.cuboid(1.5, 0.25, 17)
        }), new PhysicsObject(world, {
            position: { x: 29, y: 0.3, z: -33.5 },
            geometry: new THREE.BoxGeometry(3, 0.5, 33),
            material: new THREE.MeshToonMaterial({ color: 0x5e3d27 }),
            colliderDesc: RAPIER.ColliderDesc.cuboid(1.5, 0.25, 16.5)
        }), new PhysicsObject(world, {
            position: { x: 32, y: 0.3, z: -34 },
            geometry: new THREE.BoxGeometry(3, 0.5, 32),
            material: new THREE.MeshToonMaterial({ color: 0x875737 }),
            colliderDesc: RAPIER.ColliderDesc.cuboid(1.5, 0.25, 16)
        }),

        // Fences
        new PhysicsObject(world, {
            position: { x: 3, y: 1.5, z: -47.5 },
            rotation: { x: 0, y: Math.PI/2, z: 0 },
            scale: { x: 0.25, y: 0.25, z: 0.25 },
            geometry: fence1Mesh.geometry,
            material: fence1Mesh.material,
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.6, 0.3, 0.07)
        }), new PhysicsObject(world, {
            position: { x: 3, y: 1.5, z: -43 },
            rotation: { x: 0, y: Math.PI/2, z: 0 },
            scale: { x: 0.25, y: 0.25, z: 0.25 },
            geometry: fence1Mesh.geometry,
            material: fence1Mesh.material,
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.6, 0.3, 0.07)
        }), new PhysicsObject(world, {
            position: { x: 3, y: 1.5, z: -38.5 },
            rotation: { x: 0, y: Math.PI/2, z: 0 },
            scale: { x: 0.25, y: 0.25, z: 0.25 },
            geometry: fence1Mesh.geometry,
            material: fence1Mesh.material,
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.6, 0.3, 0.07)
        }), new PhysicsObject(world, {
            position: { x: 3, y: 1.5, z: -34 },
            rotation: { x: 0, y: Math.PI/2, z: 0 },
            scale: { x: 0.25, y: 0.25, z: 0.25 },
            geometry: fence1Mesh.geometry,
            material: fence1Mesh.material,
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.6, 0.3, 0.07)
        }), new PhysicsObject(world, {
            position: { x: 3, y: 1.5, z: -29.5 },
            rotation: { x: 0, y: Math.PI/2, z: 0 },
            scale: { x: 0.25, y: 0.25, z: 0.25 },
            geometry: fence1Mesh.geometry,
            material: fence1Mesh.material,
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.6, 0.3, 0.07)
        }), new PhysicsObject(world, {
            position: { x: 3, y: 1.5, z: -25 },
            rotation: { x: 0, y: Math.PI/2, z: 0 },
            scale: { x: 0.25, y: 0.25, z: 0.25 },
            geometry: fence1Mesh.geometry,
            material: fence1Mesh.material,
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.6, 0.3, 0.07)
        }), new PhysicsObject(world, {
            position: { x: 4.5, y: 1.5, z: -21 },
            rotation: { x: 0, y: -Math.PI/4, z: 0 },
            scale: { x: 0.25, y: 0.25, z: 0.25 },
            geometry: fence1Mesh.geometry,
            material: fence1Mesh.material,
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.6, 0.3, 0.07)
        }), new PhysicsObject(world, {
            position: { x: 8, y: 1.5, z: -18.5 },
            rotation: { x: 0, y: -Math.PI/6, z: 0 },
            scale: { x: 0.25, y: 0.25, z: 0.25 },
            geometry: fence1Mesh.geometry,
            material: fence1Mesh.material,
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.6, 0.3, 0.07)
        }), new PhysicsObject(world, {
            position: { x: 12.2, y: 1.5, z: -16.6 },
            rotation: { x: 0, y: -Math.PI/8, z: 0 },
            scale: { x: 0.25, y: 0.25, z: 0.25 },
            geometry: fence1Mesh.geometry,
            material: fence1Mesh.material,
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.6, 0.3, 0.07)
        }), new PhysicsObject(world, {
            position: { x: 22, y: 1.5, z: -15.6 },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 0.25, y: 0.25, z: 0.25 },
            geometry: fence1Mesh.geometry,
            material: fence1Mesh.material,
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.6, 0.3, 0.07)
        }), new PhysicsObject(world, {
            position: { x: 26.7, y: 1.5, z: -16.8 },
            rotation: { x: 0, y: Math.PI/6, z: 0 },
            scale: { x: 0.25, y: 0.25, z: 0.25 },
            geometry: fence1Mesh.geometry,
            material: fence1Mesh.material,
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.6, 0.3, 0.07)
        }), new PhysicsObject(world, {
            position: { x: 30.8, y: 1.5, z: -18.8 },
            rotation: { x: 0, y: Math.PI/8, z: 0 },
            scale: { x: 0.25, y: 0.25, z: 0.25 },
            geometry: fence1Mesh.geometry,
            material: fence1Mesh.material,
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.6, 0.3, 0.07)
        }), new PhysicsObject(world, {
            position: { x: 33.8, y: 1.5, z: -22 },
            rotation: { x: 0, y: Math.PI/2.6, z: 0 },
            scale: { x: 0.25, y: 0.25, z: 0.25 },
            geometry: fence1Mesh.geometry,
            material: fence1Mesh.material,
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.6, 0.3, 0.07)
        }), new PhysicsObject(world, {
            position: { x: 34.7, y: 1.5, z: -26.5 },
            rotation: { x: 0, y: Math.PI/2, z: 0 },
            scale: { x: 0.25, y: 0.25, z: 0.25 },
            geometry: fence1Mesh.geometry,
            material: fence1Mesh.material,
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.6, 0.3, 0.07)
        }), new PhysicsObject(world, {
            position: { x: 34.7, y: 1.5, z: -47.5 },
            rotation: { x: 0, y: Math.PI/2, z: 0 },
            scale: { x: 0.25, y: 0.25, z: 0.25 },
            geometry: fence1Mesh.geometry,
            material: fence1Mesh.material,
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.6, 0.3, 0.07)
        })
    ]);

    // Farmland crops
    for (const x of [29, 24, 19, 14, 9]) {
        const isMelon = (x % 2) === 0;
        for (const z of [-48, -45, -42, -39, -36, -33, -30, -28, -25, -22]) {
            const cropScale = 0.15 + Math.random() * 0.1;
            if (isMelon) {
                objects.push(new PhysicsObject(world, {
                    isStatic: false,
                    position: { x: x, y: 2, z: z },
                    rotation: { x: 0, y: Math.random()*Math.PI, z: 0 },
                    scale: { x: cropScale, y: cropScale, z: cropScale },
                    geometry: melon1Mesh.geometry,
                    material: melon1Mesh.material,
                    colliderDesc: RAPIER.ColliderDesc.capsule(0, cropScale-0.04).setDensity(50.0)
                }));
            } else {
                objects.push(new PhysicsObject(world, {
                    isStatic: false,
                    position: { x: x, y: 2, z: z },
                    rotation: { x: 0, y: Math.random()*Math.PI, z: 0 },
                    scale: { x: cropScale, y: cropScale, z: cropScale },
                    geometry: pumpkin1Mesh.geometry,
                    material: pumpkin1Mesh.material,
                    colliderDesc: RAPIER.ColliderDesc.capsule(0, cropScale-0.07).setDensity(50.0)
                }));
            }
        }
    }

    // Flower garden fences
    objects.push(...[
        new PhysicsObject(world, {
            position: { x: 47.5, y: 1.5, z: -13 },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 0.25, y: 0.25, z: 0.25 },
            geometry: fence1Mesh.geometry,
            material: fence1Mesh.material,
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.6, 0.3, 0.07)
        }), new PhysicsObject(world, {
            position: { x: 38.4, y: 1.5, z: -12 },
            rotation: { x: 0, y: Math.PI/8, z: 0 },
            scale: { x: 0.25, y: 0.25, z: 0.25 },
            geometry: fence1Mesh.geometry,
            material: fence1Mesh.material,
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.6, 0.3, 0.07)
        }), new PhysicsObject(world, {
            position: { x: 36.3, y: 1.5, z: -8.7 },
            rotation: { x: 0, y: Math.PI/2, z: 0 },
            scale: { x: 0.25, y: 0.25, z: 0.25 },
            geometry: fence1Mesh.geometry,
            material: fence1Mesh.material,
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.6, 0.3, 0.07)
        }), new PhysicsObject(world, {
            position: { x: 37.5, y: 1.5, z: -4.5 },
            rotation: { x: 0, y: -Math.PI/3, z: 0 },
            scale: { x: 0.25, y: 0.25, z: 0.25 },
            geometry: fence1Mesh.geometry,
            material: fence1Mesh.material,
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.6, 0.3, 0.07)
        }), new PhysicsObject(world, {
            position: { x: 38.8, y: 1.5, z: 0.1 },
            rotation: { x: 0, y: Math.PI/2, z: 0 },
            scale: { x: 0.25, y: 0.25, z: 0.25 },
            geometry: fence1Mesh.geometry,
            material: fence1Mesh.material,
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.6, 0.3, 0.07)
        }), new PhysicsObject(world, {
            position: { x: 37, y: 1.5, z: 4.3 },
            rotation: { x: 0, y: Math.PI/4, z: 0 },
            scale: { x: 0.25, y: 0.25, z: 0.25 },
            geometry: fence1Mesh.geometry,
            material: fence1Mesh.material,
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.6, 0.3, 0.07)
        }), new PhysicsObject(world, {
            position: { x: 35.3, y: 1.5, z: 8.4 },
            rotation: { x: 0, y: Math.PI/2, z: 0 },
            scale: { x: 0.25, y: 0.25, z: 0.25 },
            geometry: fence1Mesh.geometry,
            material: fence1Mesh.material,
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.6, 0.3, 0.07)
        }), new PhysicsObject(world, {
            position: { x: 35.3, y: 1.5, z: 12.9 },
            rotation: { x: 0, y: Math.PI/2, z: 0 },
            scale: { x: 0.25, y: 0.25, z: 0.25 },
            geometry: fence1Mesh.geometry,
            material: fence1Mesh.material,
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.6, 0.3, 0.07)
        }), new PhysicsObject(world, {
            position: { x: 37, y: 1.5, z: 17 },
            rotation: { x: 0, y: -Math.PI/4, z: 0 },
            scale: { x: 0.25, y: 0.25, z: 0.25 },
            geometry: fence1Mesh.geometry,
            material: fence1Mesh.material,
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.6, 0.3, 0.07)
        }), new PhysicsObject(world, {
            position: { x: 38.8, y: 1.5, z: 21 },
            rotation: { x: 0, y: Math.PI/2, z: 0 },
            scale: { x: 0.25, y: 0.25, z: 0.25 },
            geometry: fence1Mesh.geometry,
            material: fence1Mesh.material,
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.6, 0.3, 0.07)
        }), new PhysicsObject(world, {
            position: { x: 37, y: 1.5, z: 25 },
            rotation: { x: 0, y: Math.PI/4, z: 0 },
            scale: { x: 0.25, y: 0.25, z: 0.25 },
            geometry: fence1Mesh.geometry,
            material: fence1Mesh.material,
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.6, 0.3, 0.07)
        }), new PhysicsObject(world, {
            position: { x: 33.8, y: 1.5, z: 28.2 },
            rotation: { x: 0, y: Math.PI/4, z: 0 },
            scale: { x: 0.25, y: 0.25, z: 0.25 },
            geometry: fence1Mesh.geometry,
            material: fence1Mesh.material,
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.6, 0.3, 0.07)
        }), new PhysicsObject(world, {
            position: { x: 32.2, y: 1.5, z: 32 },
            rotation: { x: 0, y: Math.PI/2, z: 0 },
            scale: { x: 0.25, y: 0.25, z: 0.25 },
            geometry: fence1Mesh.geometry,
            material: fence1Mesh.material,
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.6, 0.3, 0.07)
        }), new PhysicsObject(world, {
            position: { x: 38.5, y: 1.5, z: 39.7 },
            rotation: { x: 0, y: -Math.PI/6, z: 0 },
            scale: { x: 0.25, y: 0.25, z: 0.25 },
            geometry: fence1Mesh.geometry,
            material: fence1Mesh.material,
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.6, 0.3, 0.07)
        }), new PhysicsObject(world, {
            position: { x: 43, y: 1.5, z: 41 },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 0.25, y: 0.25, z: 0.25 },
            geometry: fence1Mesh.geometry,
            material: fence1Mesh.material,
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.6, 0.3, 0.07)
        }), new PhysicsObject(world, {
            position: { x: 47.5, y: 1.5, z: 41 },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 0.25, y: 0.25, z: 0.25 },
            geometry: fence1Mesh.geometry,
            material: fence1Mesh.material,
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.6, 0.3, 0.07)
        }), 
    ]);

    // Garden patches
    const gardenPatchData = [
        { dim: { x: 8, y: 0.25, z: 52 },    pos: { x: 46, y: 0.5, z: 14 },      rot: { x: 0, y: 0, z: 0 } },
        { dim: { x: 5, y: 0.25, z: 10 },    pos: { x: 38, y: 0.5, z: 34 },      rot: { x: 0, y: Math.PI/4, z: 0 } },
        { dim: { x: 5, y: 0.25, z: 10 },    pos: { x: 38, y: 0.5, z: 29 },      rot: { x: 0, y: -Math.PI/4, z: 0 } },
        { dim: { x: 6, y: 0.25, z: 6 },     pos: { x: 41.2, y: 0.5, z: 31.5 },  rot: { x: 0, y: 0, z: 0 } },
        { dim: { x: 3, y: 0.25, z: 3.5 },   pos: { x: 41.5, y: 0.5, z: 38 },    rot: { x: 0, y: -Math.PI/8, z: 0 } },
        { dim: { x: 2.5, y: 0.25, z: 40 },  pos: { x: 40.8, y: 0.5, z: 8 },     rot: { x: 0, y: 0, z: 0 } },
        { dim: { x: 3, y: 0.25, z: 10 },    pos: { x: 38, y: 0.5, z: 10.8 },    rot: { x: 0, y: 0, z: 0 } },
        { dim: { x: 4.4, y: 0.25, z: 4.4 }, pos: { x: 39.5, y: 0.5, z: 15.5 },  rot: { x: 0, y: Math.PI/4, z: 0 } },
        { dim: { x: 4.4, y: 0.25, z: 4.4 }, pos: { x: 39.5, y: 0.5, z: 6 },     rot: { x: 0, y: Math.PI/4, z: 0 } },
        { dim: { x: 2.1, y: 0.25, z: 5 },   pos: { x: 38.5, y: 0.5, z: -8.4 },  rot: { x: 0, y: 0, z: 0 } },
        { dim: { x: 3, y: 0.25, z: 3 },     pos: { x: 39.6, y: 0.5, z: -5.8 },  rot: { x: 0, y: Math.PI/4, z: 0 } },
    ];
    for (const data of gardenPatchData) {
        const [groundMesh, stemsMesh, headsList] = generateGardenObjects(data.dim);
        objects.push(new PhysicsObject(world, {
            position: data.pos,
            rotation: data.rot,
            geometry: groundMesh.geometry,
            material: groundMesh.material,
            colliderDesc: RAPIER.ColliderDesc.cuboid(data.dim.x/2, data.dim.y/2, data.dim.z/2)
        }));

        if (stemsMesh === null) continue;
        objects.push(new PhysicsObject(world, {
            position: data.pos,
            rotation: data.rot,
            geometry: stemsMesh.geometry,
            material: stemsMesh.material,
            colliderDesc: RAPIER.ColliderDesc.cuboid(-0.1, -0.1, -0.1)
        }));
        
        for (const heads of headsList) {
            if (heads.mesh === null) continue;
            objects.push(new PhysicsObject(world, {
                position: data.pos,
                rotation: data.rot,
                geometry: heads.mesh.geometry,
                material: heads.mesh.material,
                colliderDesc: RAPIER.ColliderDesc.cuboid(-0.1, -0.1, -0.1)
            }));
        }
    }

    // Town square
    objects.push(...[
        // Statue
        new PhysicsObject(world, {
            position: { x: 9.3, y: 4.25, z: 0.8 },
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            scale: { x: 0.25, y: 0.25, z: 0.25 },
            geometry: statue1Mesh.geometry,
            material: statue1Mesh.material,
            colliderDesc: RAPIER.ColliderDesc.cuboid(-0.1, -0.1, -0.1)
        }), new PhysicsObject(world, {
            position: { x: 9.3, y: 1.5, z: 0.8 },
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(2.25, 1.5, 1.5)
        }), new PhysicsObject(world, {
            position: { x: 9.3, y: 5.5, z: 0.8 },
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(2, 2.5, 1.25)
        }),

        // Stall 1
        new PhysicsObject(world, {
            position: { x: -5, y: 3.5, z: -13.5 },
            rotation: { x: 0, y: Math.PI/3, z: 0 },
            scale: { x: 0.3, y: 0.3, z: 0.3 },
            geometry: stall1Mesh.geometry,
            material: stall1Mesh.material,
            colliderDesc: RAPIER.ColliderDesc.cuboid(-0.1, -0.1, -0.1)
        }), new PhysicsObject(world, { // front
            position: { x: -3.92, y: 1, z: -12.69 },
            rotation: { x: 0, y: Math.PI/3, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(2.75, 1, 0.7)
        }), new PhysicsObject(world, { // back
            position: { x: -6.67, y: 1, z: -14.29 },
            rotation: { x: 0, y: Math.PI/3, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(2.75, 1, 0.15)
        }), new PhysicsObject(world, { // side
            position: { x: -3.54, y: 1, z: -15.74 },
            rotation: { x: 0, y: Math.PI*(5/6), z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(1.75, 1, 0.15)
        }), new PhysicsObject(world, { // roof
            position: { x: -5, y: 5, z: -13.5 },
            rotation: { x: 0, y: Math.PI/3, z: 0 },
            scale: { x: 0.3, y: 0.3, z: 0.3 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(1, 0.15, 0.75)
        }), 

        // Stall 2
        new PhysicsObject(world, {
            position: { x: -7.3, y: 3.5, z: -5.8 },
            rotation: { x: 0, y: Math.PI/2, z: 0 },
            scale: { x: 0.3, y: 0.3, z: 0.3 },
            geometry: stall2Mesh.geometry,
            material: stall2Mesh.material,
            colliderDesc: RAPIER.ColliderDesc.cuboid(-0.1, -0.1, -0.1)
        }), new PhysicsObject(world, { // front
            position: { x: -5.9, y: 1, z: -5.75 },
            rotation: { x: 0, y: Math.PI/2, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(2.75, 1, 0.7)
        }), new PhysicsObject(world, { // back
            position: { x: -9.08, y: 1, z: -5.80 },
            rotation: { x: 0, y: Math.PI/2, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(2.75, 1, 0.15)
        }), new PhysicsObject(world, { // side
            position: { x: -7.37, y: 1, z: -8.51 },
            rotation: { x: 0, y: Math.PI, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(1.75, 1, 0.15)
        }), new PhysicsObject(world, { // roof
            position: { x: -7.3, y: 5, z: -5.8 },
            rotation: { x: 0, y: Math.PI/2, z: 0 },
            scale: { x: 0.3, y: 0.3, z: 0.3 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(1, 0.15, 0.75)
        }),

        // Benches
        new PhysicsObject(world, {
            position: { x: -3, y: 2, z: 2.15 },
            rotation: { x: 0, y: Math.PI/1.6, z: 0 },
            scale: { x: 0.2, y: 0.2, z: 0.2 },
            geometry: bench1Mesh.geometry,
            material: bench1Mesh.material,
            colliderDesc: RAPIER.ColliderDesc.cuboid(-0.1, -0.1, -0.1)
        }), new PhysicsObject(world, {
            position: { x: -3, y: 1, z: 2.15 },
            rotation: { x: 0, y: Math.PI/1.6, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(2.4, 0.75, 1)
        }), new PhysicsObject(world, {
            position: { x: 14.88, y: 2.4, z: -6.73 },
            rotation: { x: 0, y: -Math.PI/4, z: 0 },
            scale: { x: 0.2, y: 0.2, z: 0.2 },
            geometry: bench1Mesh.geometry,
            material: bench1Mesh.material,
            colliderDesc: RAPIER.ColliderDesc.cuboid(-0.1, -0.1, -0.1)
        }), new PhysicsObject(world, {
            position: { x: 14.88, y: 1.4, z: -6.73 },
            rotation: { x: 0, y: -Math.PI/4, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(2.4, 0.75, 1)
        }), new PhysicsObject(world, {
            position: { x: 8.41, y: 2.4, z: 14.54 },
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            scale: { x: 0.2, y: 0.2, z: 0.2 },
            geometry: bench1Mesh.geometry,
            material: bench1Mesh.material,
            colliderDesc: RAPIER.ColliderDesc.cuboid(-0.1, -0.1, -0.1)
        }), new PhysicsObject(world, {
            position: { x: 8.41, y: 1.4, z: 14.54 },
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(2.4, 0.75, 1)
        })
    ]);

    // [General] Grass
    const grassPatchData = [
        { dim: { x: 20, y: 0, z: 10 }, pos: { x: -40, y: 0.5, z: -45 }, rot: { x: 0, y: 0, z: 0 } },
        { dim: { x: 3, y: 0, z: 10 }, pos: { x: -35, y: 0.5, z: -39.8 }, rot: { x: 0, y: Math.PI/2.2, z: 0 } },
        { dim: { x: 5, y: 0, z: 8 }, pos: { x: -30, y: 0.5, z: -45 }, rot: { x: 0, y: -Math.PI/8, z: 0 } },
        { dim: { x: 17, y: 0, z: 4 }, pos: { x: -41.5, y: 0.5, z: -30 }, rot: { x: 0, y: 0, z: 0 } },
        { dim: { x: 3, y: 0, z: 44 }, pos: { x: -48.5, y: 0.5, z: -9 }, rot: { x: 0, y: 0, z: 0 } },
        { dim: { x: 10, y: 0, z: 21 }, pos: { x: -44, y: 0.5, z: 2.5 }, rot: { x: 0, y: 0, z: 0 } },
        { dim: { x: 10, y: 0, z: 17 }, pos: { x: -34, y: 0.5, z: 0.5 }, rot: { x: 0, y: 0, z: 0 } },
        { dim: { x: 12, y: 0, z: 8 }, pos: { x: -25, y: 0.5, z: -4.3 }, rot: { x: 0, y: 0, z: 0 } },
        { dim: { x: 14, y: 0, z: 8 }, pos: { x: -33.75, y: 0.5, z: 6.2 }, rot: { x: 0, y: Math.PI/8, z: 0 } },
        { dim: { x: 10, y: 0, z: 6 }, pos: { x: -25.25, y: 0.5, z: 0.7 }, rot: { x: 0, y: Math.PI/4, z: 0 } },
        { dim: { x: 8, y: 0, z: 16 }, pos: { x: -22.8, y: 0.5, z: -16 }, rot: { x: 0, y: 0, z: 0 } },
        { dim: { x: 6, y: 0, z: 12 }, pos: { x: -18.75, y: 0.5, z: -18.75 }, rot: { x: 0, y: -Math.PI/8, z: 0 } },
        { dim: { x: 8, y: 0, z: 12 }, pos: { x: -13.3, y: 0.5, z: -36.5 }, rot: { x: 0, y: -Math.PI/8, z: 0 } },
        { dim: { x: 8, y: 0, z: 8 }, pos: { x: -11.75, y: 0.5, z: -45.7 }, rot: { x: 0, y: 0, z: 0 } },
        { dim: { x: 32, y: 0, z: 25 }, pos: { x: -34, y: 0.5, z: 37.5 }, rot: { x: 0, y: 0, z: 0 } },
        { dim: { x: 12, y: 0, z: 6 }, pos: { x: -44, y: 0.5, z: 22 }, rot: { x: 0, y: 0, z: 0 } },
        { dim: { x: 8, y: 0, z: 8 }, pos: { x: -37.9, y: 0.5, z: 25.1 }, rot: { x: 0, y: Math.PI/4, z: 0 } },
        { dim: { x: 8, y: 0, z: 6 }, pos: { x: -17.95, y: 0.5, z: 31.65 }, rot: { x: 0, y: Math.PI/4, z: 0 } },
        { dim: { x: 8, y: 0, z: 3.5 }, pos: { x: -25.7, y: 0.5, z: 15.8 }, rot: { x: 0, y: Math.PI/8, z: 0 } },
        { dim: { x: 4.5, y: 0, z: 25 }, pos: { x: 0.25, y: 0.5, z: -37.5 }, rot: { x: 0, y: 0, z: 0 } },
        { dim: { x: 5, y: 0, z: 8 }, pos: { x: -2.15, y: 0.5, z: -29.25 }, rot: { x: 0, y: -Math.PI/8, z: 0 } },
        { dim: { x: 3.8, y: 0, z: 12 }, pos: { x: -9, y: 0.5, z: -14.85 }, rot: { x: 0, y: -Math.PI/8, z: 0 } },
        { dim: { x: 3.8, y: 0, z: 10 }, pos: { x: -11.2, y: 0.5, z: -4.2 }, rot: { x: 0, y: 0, z: 0 } },
        { dim: { x: 5, y: 0, z: 7 }, pos: { x: 5.5, y: 0.5, z: 18.5 }, rot: { x: 0, y: Math.PI/4, z: 0 } },
        { dim: { x: 27, y: 0, z: 7 }, pos: { x: 4.25, y: 0.5, z: 46.35 }, rot: { x: 0, y: 0, z: 0 } },
        { dim: { x: 5, y: 0, z: 7 }, pos: { x: -4.75, y: 0.5, z: 42.85 }, rot: { x: 0, y: Math.PI/4, z: 0 } },
        { dim: { x: 32, y: 0, z: 2 }, pos: { x: 34, y: 0.5, z: 48.85 }, rot: { x: 0, y: 0, z: 0 } },
        { dim: { x: 10, y: 0, z: 4 }, pos: { x: 21.55, y: 0.5, z: 46.5 }, rot: { x: 0, y: -Math.PI/8, z: 0 } },
        { dim: { x: 7, y: 0, z: 4 }, pos: { x: 3, y: 0.5, z: 20.5 }, rot: { x: 0, y: 0, z: 0 } },
        { dim: { x: 7, y: 0, z: 7 }, pos: { x: 5.75, y: 0.5, z: 32.9 }, rot: { x: 0, y: 0, z: 0 } },
        { dim: { x: 5, y: 0, z: 5 }, pos: { x: 2.3, y: 0.5, z: 32.9 }, rot: { x: 0, y: Math.PI/4, z: 0 } },
        { dim: { x: 20, y: 0, z: 7 }, pos: { x: -14.1, y: 0.5, z: 7.85 }, rot: { x: 0, y: Math.PI/4, z: 0 } },
        { dim: { x: 2, y: 0, z: 15 }, pos: { x: -12.35, y: 0.5, z: 21.35 }, rot: { x: 0, y: Math.PI/4, z: 0 } },
        { dim: { x: 9, y: 0, z: 2 }, pos: { x: -2, y: 0.5, z: 22.3 }, rot: { x: 0, y: Math.PI/4, z: 0 } },
    ];
    for (const data of grassPatchData) {
        const grassesList = generateGrassPatch(data.dim);
        for (const grasses of grassesList) {
            if (grasses.mesh === null) continue;
            objects.push(new PhysicsObject(world, {
                position: data.pos,
                rotation: data.rot,
                geometry: grasses.mesh.geometry,
                material: grasses.mesh.material,
                colliderDesc: RAPIER.ColliderDesc.cuboid(-0.1, -0.1, -0.1)
            }));
        }
    }

    // [General] Benches
    objects.push(...[
        new PhysicsObject(world, { // model
            position: { x: -8, y: 2, z: 45.7 },
            rotation: { x: 0, y: -Math.PI/2, z: 0 },
            scale: { x: 0.2, y: 0.2, z: 0.2 },
            geometry: bench1Mesh.geometry,
            material: bench1Mesh.material,
            colliderDesc: RAPIER.ColliderDesc.cuboid(-0.1, -0.1, -0.1)
        }), new PhysicsObject(world, { // hitbox
            position: { x: -8, y: 1, z: 45.7 },
            rotation: { x: 0, y: -Math.PI/2, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(2.4, 0.75, 1)
        }), new PhysicsObject(world, { // model
            position: { x: -35.2, y: 2, z: -40.6 },
            rotation: { x: 0, y: -Math.PI/12, z: 0 },
            scale: { x: 0.2, y: 0.2, z: 0.2 },
            geometry: bench1Mesh.geometry,
            material: bench1Mesh.material,
            colliderDesc: RAPIER.ColliderDesc.cuboid(-0.1, -0.1, -0.1)
        }), new PhysicsObject(world, { // hitbox
            position: { x: -35.2, y: 1, z: -40.6 },
            rotation: { x: 0, y: -Math.PI/12, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(2.4, 0.75, 1)
        }), new PhysicsObject(world, { // model
            position: { x: 0, y: 2, z: -44 },
            rotation: { x: 0, y: -Math.PI/2, z: 0 },
            scale: { x: 0.2, y: 0.2, z: 0.2 },
            geometry: bench1Mesh.geometry,
            material: bench1Mesh.material,
            colliderDesc: RAPIER.ColliderDesc.cuboid(-0.1, -0.1, -0.1)
        }), new PhysicsObject(world, { // hitbox
            position: { x: 0, y: 1, z: -44 },
            rotation: { x: 0, y: -Math.PI/2, z: 0 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(2.4, 0.75, 1)
        })
    ]);

    // [General] Trees
    objects.push(...[
        new PhysicsObject(world, { // model
            position: { x: -32.05, y: 0, z: -45.45 },
            scale: { x: 0.15, y: 0.3, z: 0.15 },
            geometry: tree3Mesh.geometry,
            material: tree3Mesh.material,
            colliderDesc: RAPIER.ColliderDesc.cuboid(-0.1, -0.1, -0.1)
        }), new PhysicsObject(world, { // hitbox
            position: { x: -32.05, y: 4.5, z: -45.45 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.capsule(4.5, 0.5)
        }), new PhysicsObject(world, { // model
            position: { x: -19.8, y: 0, z: -16.4 },
            scale: { x: 0.15, y: 0.2, z: 0.15 },
            geometry: tree2Mesh.geometry,
            material: tree2Mesh.material,
            colliderDesc: RAPIER.ColliderDesc.cuboid(-0.1, -0.1, -0.1)
        }), new PhysicsObject(world, { // hitbox
            position: { x: -19.8, y: 3, z: -16.4 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.capsule(3, 0.5)
        }), new PhysicsObject(world, { // model
            position: { x: -1, y: 0, z: -28 },
            scale: { x: 0.3, y: 0.4, z: 0.3 },
            geometry: tree1Mesh.geometry,
            material: tree1Mesh.material,
            colliderDesc: RAPIER.ColliderDesc.cuboid(-0.1, -0.1, -0.1)
        }), new PhysicsObject(world, { // hitbox
            position: { x: -1, y: 6, z: -28 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.capsule(6, 0.5)
        }), new PhysicsObject(world, { // model
            position: { x: 9.4, y: 0, z: 35.75 },
            scale: { x: 0.15, y: 0.3, z: 0.15 },
            geometry: tree3Mesh.geometry,
            material: tree3Mesh.material,
            colliderDesc: RAPIER.ColliderDesc.cuboid(-0.1, -0.1, -0.1)
        }), new PhysicsObject(world, { // hitbox
            position: { x: 9.4, y: 4.5, z: 35.75 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.capsule(4.5, 0.5)
        }), new PhysicsObject(world, { // model
            position: { x: 23.25, y: 0, z: -12.25 },
            scale: { x: 0.1, y: 0.2, z: 0.1 },
            geometry: tree2Mesh.geometry,
            material: tree2Mesh.material,
            colliderDesc: RAPIER.ColliderDesc.cuboid(-0.1, -0.1, -0.1)
        }), new PhysicsObject(world, { // hitbox
            position: { x: 23.25, y: 3, z: -12.25 },
            geometry: new THREE.BoxGeometry(0, 0, 0),
            material: new THREE.MeshToonMaterial(),
            colliderDesc: RAPIER.ColliderDesc.capsule(3, 0.5)
        }), 
    ]);

    // Lilypads
    objects.push(...[
        new PhysicsObject(world, {
            position: { x: -45.6, y: 0, z: 14.6 },
            rotation: { x: 0, y: Math.PI/6, z: 0 },
            geometry: new THREE.BoxGeometry(1, 0.1, 1),
            material: new THREE.MeshToonMaterial({ color: 0x2b5c1f }),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.5, 0.05, 0.5)
        }), new PhysicsObject(world, {
            position: { x: -33.2, y: 0, z: 13.9 },
            rotation: { x: 0, y: Math.PI/6, z: 0 },
            geometry: new THREE.BoxGeometry(1.2, 0.1, 1.2),
            material: new THREE.MeshToonMaterial({ color: 0x49823b }),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.6, 0.05, 0.6)
        }), new PhysicsObject(world, {
            position: { x: -19.7, y: 0, z: 6.5 },
            rotation: { x: 0, y: Math.PI/4, z: 0 },
            geometry: new THREE.BoxGeometry(1, 0.1, 1),
            material: new THREE.MeshToonMaterial({ color: 0x2b5c1f }),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.5, 0.05, 0.5)
        }), new PhysicsObject(world, {
            position: { x: -16.3, y: 0, z: -13 },
            rotation: { x: 0, y: Math.PI/4, z: 0 },
            geometry: new THREE.BoxGeometry(1.4, 0.1, 1.4),
            material: new THREE.MeshToonMaterial({ color: 0x49823b }),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.7, 0.05, 0.7)
        }), new PhysicsObject(world, {
            position: { x: -7.75, y: 0, z: -28.15 },
            rotation: { x: 0, y: -Math.PI/8, z: 0 },
            geometry: new THREE.BoxGeometry(1.4, 0.1, 1.4),
            material: new THREE.MeshToonMaterial({ color: 0x2b5c1f }),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.7, 0.05, 0.7)
        }), new PhysicsObject(world, {
            position: { x: -9.5, y: 0, z: 27.7 },
            rotation: { x: 0, y: 0, z: 0 },
            geometry: new THREE.BoxGeometry(1.2, 0.1, 1.2),
            material: new THREE.MeshToonMaterial({ color: 0x49823b }),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.6, 0.05, 0.6)
        }), new PhysicsObject(world, {
            position: { x: -12.6, y: 0, z: 28.15 },
            rotation: { x: 0, y: Math.PI/8, z: 0 },
            geometry: new THREE.BoxGeometry(0.8, 0.1, 0.8),
            material: new THREE.MeshToonMaterial({ color: 0x2b5c1f }),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.4, 0.05, 0.4)
        }), new PhysicsObject(world, {
            position: { x: 15.15, y: 0, z: 41 },
            rotation: { x: 0, y: Math.PI/8, z: 0 },
            geometry: new THREE.BoxGeometry(1, 0.1, 1),
            material: new THREE.MeshToonMaterial({ color: 0x49823b }),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.5, 0.05, 0.5)
        }), new PhysicsObject(world, {
            position: { x: 46.3, y: 0, z: 44 },
            rotation: { x: 0, y: -Math.PI/4, z: 0 },
            geometry: new THREE.BoxGeometry(1.6, 0.1, 1.6),
            material: new THREE.MeshToonMaterial({ color: 0x2b5c1f }),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.8, 0.05, 0.8)
        }), new PhysicsObject(world, {
            position: { x: -9.3, y: 0, z: -29.5 },
            rotation: { x: 0, y: 0, z: 0 },
            geometry: new THREE.BoxGeometry(1.2, 0.1, 1.2),
            material: new THREE.MeshToonMaterial({ color: 0x49823b }),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.6, 0.05, 0.6)
        }), new PhysicsObject(world, {
            position: { x: -6.5, y: 0, z: -31.6 },
            rotation: { x: 0, y: Math.PI/6, z: 0 },
            geometry: new THREE.BoxGeometry(0.9, 0.1, 0.9),
            material: new THREE.MeshToonMaterial({ color: 0x2b5c1f }),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.45, 0.05, 0.45)
        }), 
    ]);

    // Center lines
    if (DEBUG) {
        objects.push(...[new PhysicsObject(world, {
            geometry: new THREE.PlaneGeometry(100, 2),
            material: new THREE.MeshBasicMaterial({ color: 0xff0000, side: THREE.DoubleSide }),
            colliderDesc: RAPIER.ColliderDesc.cuboid(-0.1, -0.1, -0.1)
        }), new PhysicsObject(world, {
            rotation: { x: 0, y: Math.PI/2, z: 0 },
            geometry: new THREE.PlaneGeometry(100, 2),
            material: new THREE.MeshBasicMaterial({ color: 0xff0000, side: THREE.DoubleSide }),
            colliderDesc: RAPIER.ColliderDesc.cuboid(-0.1, -0.1, -0.1)
        })]);
    }

    // Add objects
    for (const object of objects) {
        world.objects.add(object);
    }
}

//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\////\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//
//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\////\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//
