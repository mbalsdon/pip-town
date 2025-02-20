import * as THREE from 'three';
import * as RAPIER from '@dimforge/rapier3d-compat';
import { PhysicsObject } from '../classes/PhysicsObject';
import { Player } from '../classes/Player';
import { BufferGeometryUtils, GLTFLoader } from 'three/examples/jsm/Addons.js';
import { DEBUG, DIRECTIONAL_LIGHT_SHADOW_QUALITY, SPAWN_POSITION, CLOUDGEN_STRIDE, CLOUDGEN_RAD, CLOUDGEN_BASE_Y, SUN_TICK_ROTATION, SUN_INIT_POSITION, DEBUG_PLAYER_MODEL, DEBUG_COLLIDERS } from '../consts';
import { LightObject } from '../classes/LightObject';
import { dbgConsoleDayNightCycle } from '../debug';

//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\////\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//
//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\////\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//

const loader = new GLTFLoader();
async function loadGLTF(path, initialRotation) {
    const gltf = await loader.loadAsync(path);

    let mesh;
    mesh = new THREE.Mesh(gltf.scene.children[0].geometry.clone(), gltf.scene.children[0].material.clone());

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

    const grassDensity = 5;
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

function cloudOnTick(inst, speed) {
    const pos = inst.getPosition();
    const newPos = { x: pos.x, y: pos.y, z: pos.z };
    if (pos.x > CLOUDGEN_RAD) {
        newPos.x -= (CLOUDGEN_RAD*2);
    }
    if (pos.z > CLOUDGEN_RAD) {
        newPos.z -= (CLOUDGEN_RAD*2);
    }

    newPos.x += speed;

    inst.setPosition(newPos.x, newPos.y, newPos.z);
}

function dayNightOnTick(sun, moon, hemi) {
    const sunPos = sun.getPosition();
    const moonPos = moon.getPosition();

    const sunMaxY = Math.sqrt(Math.pow(SUN_INIT_POSITION.y, 2) + Math.pow(SUN_INIT_POSITION.z, 2));

    const minOpacityY = sunMaxY * -0.47;
    const maxOpacityY = sunMaxY * -0.12;

    // Fade sun object in/out
    if (sunPos.y > maxOpacityY) {
        sun.mesh.material.opacity = 1;
    } else if (sunPos.y < minOpacityY) {
        sun.mesh.material.opacity = 0;
    } else {
        sun.mesh.material.opacity = Math.min(1, (sunPos.y + Math.abs(minOpacityY)) / Math.abs(maxOpacityY));
    }

    // Fade sun intensity in/out
    sun.light.intensity = 1.0 * ((Math.max(0, Math.min(sunMaxY, sunPos.y))) / sunMaxY);

    // Move sun
    const newSunY = (sunPos.y * Math.cos(SUN_TICK_ROTATION)) - (sunPos.z * Math.sin(SUN_TICK_ROTATION));
    const newSunZ = (sunPos.y * Math.sin(SUN_TICK_ROTATION)) + (sunPos.z * Math.cos(SUN_TICK_ROTATION));
    sun.setPosition(sunPos.x, newSunY, newSunZ);

    // Fade moon object in/out
    if (moonPos.y > maxOpacityY) {
        moon.mesh.material.opacity = 1;
    } else if (moonPos.y < minOpacityY) {
        moon.mesh.material.opacity = 0;
    } else {
        moon.mesh.material.opacity = Math.min(1, (moonPos.y + Math.abs(minOpacityY)) / Math.abs(maxOpacityY));
    }

    // Fade moon intensity in/out
    moon.light.intensity = 0.1 * ((Math.max(0, Math.min(sunMaxY, moonPos.y))) / sunMaxY);

    // Move moon
    const newMoonY = (moonPos.y * Math.cos(SUN_TICK_ROTATION)) - (moonPos.z * Math.sin(SUN_TICK_ROTATION));
    const newMoonZ = (moonPos.y * Math.sin(SUN_TICK_ROTATION)) + (moonPos.z * Math.cos(SUN_TICK_ROTATION));
    moon.setPosition(moonPos.x, newMoonY, newMoonZ);

    // Fade sky color
    const colorHangFactor = sunMaxY * 0.4; // decreasing makes the ends of the gradient "stick" for longer
    const alpha = Math.min(1, Math.abs(sunPos.y) / colorHangFactor);
    if (sunPos.y > 0) {
        sun.world.backgroundColor.lerpColors(sun.world.sunsetColor, sun.world.dayColor, alpha)
    } else {
        sun.world.backgroundColor.lerpColors(sun.world.sunsetColor, sun.world.nightColor, alpha)
    }

    // Fade hemi intensity in/out
    if (sunPos.y > 0) {
        hemi.light.intensity = 0.3;
    } else {
        const normalizedSunPos = 1 - (Math.abs(sunPos.y) / sunMaxY);
        const minIntensity = 0.1;
        const maxIntensityGain = 0.2;
        hemi.light.intensity = minIntensity + (normalizedSunPos * maxIntensityGain);
    }

    if (DEBUG) {
        dbgConsoleDayNightCycle(sun, moon, hemi);
    }
}

function streetLampOnTick(sun, lamp, seed) {
    const sunPos = sun.getPosition();

    if (sunPos.y > 50) {
        lamp.light.intensity = 0;
    } else {
        const offset = seed * 1000;
        const oscillationSpeed = 0.6;
        const baseIntensity = 20;
        const intensityHalfRadius = 3;
        lamp.light.intensity = baseIntensity + (Math.sin(offset + (sunPos.y * oscillationSpeed))) * intensityHalfRadius;
    }
}

//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\////\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//
//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\////\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//

export async function populateWorldObjects(world) {
    const objects = [];

    // Load external models
    const pip1Mesh          = await loadGLTF("/src/assets/statics/pip_1.glb",            { x: -Math.PI/2, y: 0, z: 0 });
    const house1aMesh       = await loadGLTF("/src/assets/statics/house_1a.glb",         { x: -Math.PI/2, y: 0, z: 0 });
    const house1bMesh       = await loadGLTF("/src/assets/statics/house_1b.glb",         { x: -Math.PI/2, y: 0, z: 0 });
    const house1cMesh       = await loadGLTF("/src/assets/statics/house_1c.glb",         { x: -Math.PI/2, y: 0, z: 0 });
    const house2Mesh        = await loadGLTF("/src/assets/statics/house_2.glb",          { x: -Math.PI/2, y: 0, z: 0 });
    const house3Mesh        = await loadGLTF("/src/assets/statics/house_3.glb",          { x: -Math.PI/2, y: 0, z: 0 });
    const house4Mesh        = await loadGLTF("/src/assets/statics/house_4.glb",          { x: -Math.PI/2, y: 0, z: 0 });
    const tree1Mesh         = await loadGLTF("/src/assets/statics/tree_1.glb",           { x: -Math.PI/2, y: 0, z: 0 });
    const tree2Mesh         = await loadGLTF("/src/assets/statics/tree_2.glb",           { x: -Math.PI/2, y: 0, z: 0 });
    const tree3Mesh         = await loadGLTF("/src/assets/statics/tree_3.glb",           { x: -Math.PI/2, y: 0, z: 0 });
    const fence1Mesh        = await loadGLTF("/src/assets/statics/fence_1.glb",          { x: -Math.PI/2, y: 0, z: 0 });
    const stall1Mesh        = await loadGLTF("/src/assets/statics/marketstall_1.glb",    { x: -Math.PI/2, y: 0, z: 0 });
    const stall2Mesh        = await loadGLTF("/src/assets/statics/marketstall_2.glb",    { x: -Math.PI/2, y: 0, z: 0 });
    const statue1Mesh       = await loadGLTF("/src/assets/statics/statue_1.glb",         { x: -Math.PI/2, y: 0, z: 0 });
    const streetlamp1Mesh   = await loadGLTF("/src/assets/statics/streetlamp_1.glb",     { x: -Math.PI/2, y: 0, z: 0 });
    const lamp1Mesh         = await loadGLTF("/src/assets/statics/lamp_1.glb",           { x: -Math.PI/2, y: 0, z: 0 });
    const lamp2Mesh         = await loadGLTF("/src/assets/statics/lamp_2.glb",           { x: -Math.PI/2, y: 0, z: 0 });

    const pumpkin1Mesh      = await loadGLTF("/src/assets/dynamics/pumpkin_1.glb",       { x: -Math.PI/2, y: 0, z: 0 });
    const melon1Mesh        = await loadGLTF("/src/assets/dynamics/melon_1.glb",         { x: -Math.PI/2, y: 0, z: 0 });
    const alarmClock1Mesh   = await loadGLTF("/src/assets/dynamics/alarm_clock_1.glb",   { x: -Math.PI/2, y: 0, z: 0 });
    const apple1Mesh        = await loadGLTF("/src/assets/dynamics/apple_1.glb",         { x: -Math.PI/2, y: 0, z: 0 });
    const beachChair1Mesh   = await loadGLTF("/src/assets/dynamics/beach_chair_1.glb",   { x: -Math.PI/2, y: 0, z: 0 });
    const bench1Mesh        = await loadGLTF("/src/assets/dynamics/bench_1.glb",         { x: -Math.PI/2, y: 0, z: 0 });
    const bin1Mesh          = await loadGLTF("/src/assets/dynamics/bin_1.glb",           { x: -Math.PI/2, y: 0, z: 0 });
    const bottle1Mesh       = await loadGLTF("/src/assets/dynamics/bottle_1.glb",        { x: -Math.PI/2, y: 0, z: 0 });
    const bowl1Mesh         = await loadGLTF("/src/assets/dynamics/bowl_1.glb",          { x: -Math.PI/2, y: 0, z: 0 });
    const bowl2Mesh         = await loadGLTF("/src/assets/dynamics/bowl_2.glb",          { x: -Math.PI/2, y: 0, z: 0 });
    const couch1Mesh        = await loadGLTF("/src/assets/dynamics/couch_1.glb",         { x: -Math.PI/2, y: 0, z: 0 });
    const couch2Mesh        = await loadGLTF("/src/assets/dynamics/couch_2.glb",         { x: -Math.PI/2, y: 0, z: 0 });
    const endTable1Mesh     = await loadGLTF("/src/assets/dynamics/end_table_1.glb",     { x: -Math.PI/2, y: 0, z: 0 });
    const hammer1Mesh       = await loadGLTF("/src/assets/dynamics/hammer_1.glb",        { x: -Math.PI/2, y: 0, z: Math.PI/6 });
    const longTable1Mesh    = await loadGLTF("/src/assets/dynamics/long_table_1.glb",    { x: -Math.PI/2, y: 0, z: 0 });
    const mug1Mesh          = await loadGLTF("/src/assets/dynamics/mug_1.glb",           { x: -Math.PI/2, y: 0, z: 0 });
    const plant1Mesh        = await loadGLTF("/src/assets/dynamics/plant_1.glb",         { x: -Math.PI/2, y: 0, z: 0 });
    const plant10Mesh       = await loadGLTF("/src/assets/dynamics/plant_10.glb",        { x: -Math.PI/2, y: 0, z: 0 });
    const plant11Mesh       = await loadGLTF("/src/assets/dynamics/plant_11.glb",        { x: -Math.PI/2, y: 0, z: 0 });
    const plant12Mesh       = await loadGLTF("/src/assets/dynamics/plant_12.glb",        { x: -Math.PI/2, y: 0, z: 0 });
    const plant2Mesh        = await loadGLTF("/src/assets/dynamics/plant_2.glb",         { x: -Math.PI/2, y: 0, z: 0 });
    const plant3Mesh        = await loadGLTF("/src/assets/dynamics/plant_3.glb",         { x: -Math.PI/2, y: 0, z: 0 });
    const plant4Mesh        = await loadGLTF("/src/assets/dynamics/plant_4.glb",         { x: -Math.PI/2, y: 0, z: 0 });
    const plant5Mesh        = await loadGLTF("/src/assets/dynamics/plant_5.glb",         { x: -Math.PI/2, y: 0, z: 0 });
    const plant6Mesh        = await loadGLTF("/src/assets/dynamics/plant_6.glb",         { x: -Math.PI/2, y: 0, z: 0 });
    const plant7Mesh        = await loadGLTF("/src/assets/dynamics/plant_7.glb",         { x: -Math.PI/2, y: 0, z: 0 });
    const plant8Mesh        = await loadGLTF("/src/assets/dynamics/plant_8.glb",         { x: -Math.PI/2, y: 0, z: 0 });
    const plant9Mesh        = await loadGLTF("/src/assets/dynamics/plant_9.glb",         { x: -Math.PI/2, y: 0, z: 0 });
    const plunger1Mesh      = await loadGLTF("/src/assets/dynamics/plunger_1.glb",       { x: -Math.PI/2, y: 0, z: 0 });
    const pottedTree1Mesh   = await loadGLTF("/src/assets/dynamics/potted_tree_1.glb",   { x: -Math.PI/2, y: 0, z: 0 });
    const pottedTree2Mesh   = await loadGLTF("/src/assets/dynamics/potted_tree_2.glb",   { x: -Math.PI/2, y: 0, z: 0 });
    const pottedTree3Mesh   = await loadGLTF("/src/assets/dynamics/potted_tree_3.glb",   { x: -Math.PI/2, y: 0, z: 0 });
    const pottedTree4Mesh   = await loadGLTF("/src/assets/dynamics/potted_tree_4.glb",   { x: -Math.PI/2, y: 0, z: 0 });
    const pottedTree5Mesh   = await loadGLTF("/src/assets/dynamics/potted_tree_5.glb",   { x: -Math.PI/2, y: 0, z: 0 });
    const rockingChair1Mesh = await loadGLTF("/src/assets/dynamics/rocking_chair_1.glb", { x: -Math.PI/2, y: 0, z: Math.PI/4 });
    const roundTable1Mesh   = await loadGLTF("/src/assets/dynamics/round_table_1.glb",   { x: -Math.PI/2, y: 0, z: 0 });
    const smartphone1Mesh   = await loadGLTF("/src/assets/dynamics/smartphone_1.glb",    { x: -Math.PI/2, y: 0, z: 0 });
    const squareTable1Mesh  = await loadGLTF("/src/assets/dynamics/square_table_1.glb",  { x: -Math.PI/2, y: 0, z: Math.PI/4 });
    const squareTable2Mesh  = await loadGLTF("/src/assets/dynamics/square_table_2.glb",  { x: -Math.PI/2, y: 0, z: 0 });
    const trinket1Mesh      = await loadGLTF("/src/assets/dynamics/trinket_1.glb",       { x: -Math.PI/2, y: 0, z: 0 });
    const trinket2Mesh      = await loadGLTF("/src/assets/dynamics/trinket_2.glb",       { x: -Math.PI/2, y: 0, z: 0 });
    const trinket3Mesh      = await loadGLTF("/src/assets/dynamics/trinket_3.glb",       { x: -Math.PI/2, y: 0, z: Math.PI/6 });
    const tv1Mesh           = await loadGLTF("/src/assets/dynamics/tv_1.glb",            { x: -Math.PI/2, y: 0, z: 0 });
    const tv2Mesh           = await loadGLTF("/src/assets/dynamics/tv_2.glb",            { x: -Math.PI/2, y: 0, z: 0 });
    const woodChair1Mesh    = await loadGLTF("/src/assets/dynamics/wood_chair_1.glb",    { x: -Math.PI/2, y: 0, z: 0 });
    const cheese1Mesh       = await loadGLTF("/src/assets/dynamics/cheese_1.glb",        { x: -Math.PI/2, y: 0, z: 0 });
    const pineapple1Mesh    = await loadGLTF("/src/assets/dynamics/pineapple_1.glb",     { x: -Math.PI/2, y: 0, z: 0 });

    // Player
    // TODO: Bevelling to get onto steps better
    objects.push(new Player(world, {
        position: SPAWN_POSITION,
        scale: { x: 0.1, y: 0.1, z: 0.1 },
        mesh: DEBUG_PLAYER_MODEL ? mug1Mesh : pip1Mesh,
        colliderDesc: DEBUG_PLAYER_MODEL ? RAPIER.ColliderDesc.cuboid(0.02, 0.02, 0.02) : RAPIER.ColliderDesc.cuboid(0.1, 0.09, 0.05),
        colliderProps: { friction: 0.0, restitution: 0.2, density: 1 }
    }));

    // Ground (TODO: merge raised geometries)
    objects.push(...[
        new PhysicsObject(world, { // base
            position: { x: 0, y: -1.5, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(100, 1, 100), new THREE.MeshToonMaterial({ color: 0x2d5518 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(50, 0.5, 50),
            isCameraCollidable: true
        }),

        // Raised part (SE)
        new PhysicsObject(world, {
            position: { x: -34.25, y: -0.25, z: -25 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(31.5, 1.5, 50), new THREE.MeshToonMaterial({ color: 0x2d5518 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(15.75, 0.75, 25),
            isCameraCollidable: true
        }), new PhysicsObject(world, {
            position: { x: -44, y: -0.25, z: 6 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(12, 1.5, 14), new THREE.MeshToonMaterial({ color: 0x2d5518 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(6, 0.75, 7),
            isCameraCollidable: true
        }), new PhysicsObject(world, {
            position: { x: -35, y: -0.25, z: 4 },
            rotation: { x: 0, y: Math.PI/8, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(14, 1.5, 14), new THREE.MeshToonMaterial({ color: 0x2d5518 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(7, 0.75, 7),
            isCameraCollidable: true
        }), new PhysicsObject(world, {
            position: { x: -25.5, y: -0.25, z: 1.3 },
            rotation: { x: 0, y: Math.PI/4, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(12, 1.5, 8), new THREE.MeshToonMaterial({ color: 0x2d5518 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(6, 0.75, 4),
            isCameraCollidable: true
        }), new PhysicsObject(world, {
            position: { x: -19, y: -0.25, z: -25.5 },
            rotation: { x: 0, y: -Math.PI/8, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(12, 1.5, 32), new THREE.MeshToonMaterial({ color: 0x2d5518 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(6, 0.75, 16),
            isCameraCollidable: true
        }), new PhysicsObject(world, {
            position: { x: -15, y: -0.25, z: -44 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(15, 1.5, 12), new THREE.MeshToonMaterial({ color: 0x2d5518 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(7.5, 0.75, 6),
            isCameraCollidable: true
        }),

        // Raised part (SW)
        new PhysicsObject(world, {
            position: { x: -44, y: -0.25, z: 34 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(12, 1.5, 32), new THREE.MeshToonMaterial({ color: 0x2d5518 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(6, 0.75, 16),
            isCameraCollidable: true
        }), new PhysicsObject(world, {
            position: { x: -29, y: -0.25, z: 36.5 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(19, 1.5, 27), new THREE.MeshToonMaterial({ color: 0x2d5518 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(9.5, 0.75, 13.5),
            isCameraCollidable: true
        }), new PhysicsObject(world, {
            position: { x: -38, y: -0.25, z: 23 },
            rotation: { x: 0, y: Math.PI/4, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(7, 1.5, 7), new THREE.MeshToonMaterial({ color: 0x2d5518 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(3.5, 0.75, 3.5),
            isCameraCollidable: true
        }), new PhysicsObject(world, {
            position: { x: -5, y: -0.25, z: 46.25 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(48, 1.5, 7.5), new THREE.MeshToonMaterial({ color: 0x2d5518 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(24, 0.75, 3.75),
            isCameraCollidable: true
        }), new PhysicsObject(world, {
            position: { x: -12.5, y: -0.25, z: 36.4 },
            rotation: { x: 0, y: -Math.PI/4, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(29, 1.5, 9.25), new THREE.MeshToonMaterial({ color: 0x2d5518 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(14.5, 0.75, 4.675),
            isCameraCollidable: true
        }), new PhysicsObject(world, {
            position: { x: -17, y: -0.25, z: 40 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(10, 1.5, 10), new THREE.MeshToonMaterial({ color: 0x2d5518 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(5, 0.75, 5),
            isCameraCollidable: true
        }), new PhysicsObject(world, {
            position: { x: 30, y: -0.25, z: 48.75 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(40, 1.5, 2.5), new THREE.MeshToonMaterial({ color: 0x2d5518 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(20, 0.75, 1.25),
            isCameraCollidable: true
        }), new PhysicsObject(world, {
            position: { x: 23.5, y: -0.25, z: 46 },
            rotation: { x: 0, y: -Math.PI/8, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(13, 1.5, 2.6), new THREE.MeshToonMaterial({ color: 0x2d5518 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(6.5, 0.75, 1.3),
            isCameraCollidable: true
        }), new PhysicsObject(world, {
            position: { x: 21, y: -0.25, z: 47 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(6, 1.5, 3), new THREE.MeshToonMaterial({ color: 0x2d5518 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(3, 0.75, 1.5),
            isCameraCollidable: true
        }),

        // Raised part (N)
        new PhysicsObject(world, {
            position: { x: 23.75, y: -0.25, z: -10 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(52.5, 1.5, 80), new THREE.MeshToonMaterial({ color: 0x2d5518 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(26.25, 0.75, 40),
            isCameraCollidable: true
        }), new PhysicsObject(world, {
            position: { x: -7, y: -0.25, z: 5 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(13, 1.5, 31), new THREE.MeshToonMaterial({ color: 0x2d5518 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(6.5, 0.75, 15.5),
            isCameraCollidable: true
        }), new PhysicsObject(world, {
            position: { x: 26, y: -0.25, z: 33 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(48, 1.5, 9), new THREE.MeshToonMaterial({ color: 0x2d5518 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(24, 0.75, 4.5),
            isCameraCollidable: true
        }), new PhysicsObject(world, {
            position: { x: 0, y: -0.25, z: -20 },
            rotation: { x: 0, y: 3*Math.PI/8, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(29, 1.5, 17.5), new THREE.MeshToonMaterial({ color: 0x2d5518 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(14.5, 0.75, 8.75),
            isCameraCollidable: true
        }), new PhysicsObject(world, {
            position: { x: -4.5, y: -0.25, z: 24.4 },
            rotation: { x: 0, y: -Math.PI/4, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(28, 1.5, 9.1), new THREE.MeshToonMaterial({ color: 0x2d5518 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(14, 0.75, 4.55),
            isCameraCollidable: true
        }), new PhysicsObject(world, {
            position: { x: 40.5, y: -0.25, z: 40 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(19, 1.5, 5), new THREE.MeshToonMaterial({ color: 0x2d5518 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(9.5, 0.75, 2.5),
            isCameraCollidable: true
        }), new PhysicsObject(world, {
            position: { x: 27, y: -0.25, z: 36.5 },
            rotation: { x: 0, y: -Math.PI/8, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(14, 1.5, 7.5), new THREE.MeshToonMaterial({ color: 0x2d5518 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(7, 0.75, 3.75),
            isCameraCollidable: true
        }), new PhysicsObject(world, {
            position: { x: -19.5, y: -0.25, z: 17 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(23, 1.5, 3), new THREE.MeshToonMaterial({ color: 0x2d5518 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(11.5, 0.75, 1.5),
            isCameraCollidable: true
        }), new PhysicsObject(world, {
            position: { x: -31, y: -0.25, z: 16.5 },
            rotation: { x: 0, y: Math.PI/4, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(2, 1.5, 2), new THREE.MeshToonMaterial({ color: 0x2d5518 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(1, 0.75, 1),
            isCameraCollidable: true
        }), new PhysicsObject(world, {
            position: { x: -25, y: -0.25, z: 14 },
            rotation: { x: 0, y: Math.PI/8, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(12, 1.5, 2.25), new THREE.MeshToonMaterial({ color: 0x2d5518 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(6, 0.75, 1.125),
            isCameraCollidable: true
        }), new PhysicsObject(world, {
            position: { x: -18, y: -0.25, z: 9 },
            rotation: { x: 0, y: Math.PI/4, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(22, 1.5, 3.5), new THREE.MeshToonMaterial({ color: 0x2d5518 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(11, 0.75, 1.75),
            isCameraCollidable: true
        }), new PhysicsObject(world, {
            position: { x: -15.5, y: -0.25, z: 11.5 },
            rotation: { x: 0, y: Math.PI/4, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(15, 1.5, 4), new THREE.MeshToonMaterial({ color: 0x2d5518 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(7.5, 0.75, 2),
            isCameraCollidable: true
        }), new PhysicsObject(world, {
            position: { x: -13, y: -0.25, z: 14 },
            rotation: { x: 0, y: Math.PI/4, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(10, 1.5, 4), new THREE.MeshToonMaterial({ color: 0x2d5518 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(5, 0.75, 2),
            isCameraCollidable: true
        }),
    ]);

    // River
    objects.push(new PhysicsObject(world, {
        position: { x: 0, y: -0.5, z: 0 },
        mesh: new THREE.Mesh(new THREE.BoxGeometry(99.9, 1, 99.9), new THREE.MeshToonMaterial({ color: 0x60bbe6, transparent: true, opacity: 0.5, depthWrite: false })),
    }));

    // FUTURE: may need to use these for river pushing
    // objects.push(...[
    //     // N-to-E
    //     new PhysicsObject(world, {
    //         position: { x: 40, y: -0.5, z: 45 },
    //    //         geometry: new THREE.BoxGeometry(20, 1, 5),
    //         material: new THREE.MeshToonMaterial({ color: 0x60bbe6, transparent: true, opacity: 0.5, depthWrite: false }),
    //    //     }), new PhysicsObject(world, {
    //         position: { x: 25, y: -0.5, z: 42.5 },
    //         rotation: { x: 0, y: -Math.PI/8, z: 0 },
    //         geometry: new THREE.BoxGeometry(15, 1, 5),
    //         material: new THREE.MeshToonMaterial({ color: 0x60bbe6, transparent: true, opacity: 0.5, depthWrite: false }),
    //    //     }), new PhysicsObject(world, {
    //         position: { x: 10, y: -0.5, z: 40 },
    //    //         geometry: new THREE.BoxGeometry(20, 1, 5),
    //         material: new THREE.MeshToonMaterial({ color: 0x60bbe6, transparent: true, opacity: 0.5, depthWrite: false }),
    //    //     }), new PhysicsObject(world, {
    //         position: { x: -8.5, y: -0.5, z: 30.4 },
    //         rotation: { x: 0, y: -Math.PI/4, z: 0 },
    //         geometry: new THREE.BoxGeometry(29.5, 1, 5),
    //         material: new THREE.MeshToonMaterial({ color: 0x60bbe6, transparent: true, opacity: 0.5, depthWrite: false }),
    //    //     }), new PhysicsObject(world, {
    //         position: { x: -25, y: -0.5, z: 20.75 },
    //    //         geometry: new THREE.BoxGeometry(15.5, 1, 5),
    //         material: new THREE.MeshToonMaterial({ color: 0x60bbe6, transparent: true, opacity: 0.5, depthWrite: false }),
    //    //     }), new PhysicsObject(world, {
    //         position: { x: -34.5, y: -0.5, z: 18 },
    //         rotation: { x: 0, y: -Math.PI/4, z: 0 },
    //         geometry: new THREE.BoxGeometry(10, 1, 5),
    //         material: new THREE.MeshToonMaterial({ color: 0x60bbe6, transparent: true, opacity: 0.5, depthWrite: false }),
    //    //     }), new PhysicsObject(world, {
    //         position: { x: -43, y: -0.5, z: 15.5 },
    //    //         geometry: new THREE.BoxGeometry(14, 1, 5),
    //         material: new THREE.MeshToonMaterial({ color: 0x60bbe6, transparent: true, opacity: 0.5, depthWrite: false }),
    //    //     }),

    //     // S-to-W
    //     new PhysicsObject(world, {
    //         position: { x: -32, y: -0.5, z: 13 },
    //         rotation: { x: 0, y: Math.PI/8, z: 0 },
    //         geometry: new THREE.BoxGeometry(14, 1, 5),
    //         material: new THREE.MeshToonMaterial({ color: 0x60bbe6, transparent: true, opacity: 0.5, depthWrite: false }),
    //    //     }), new PhysicsObject(world, {
    //         position: { x: -21, y: -0.5, z: 6 },
    //         rotation: { x: 0, y: Math.PI/4, z: 0 },
    //         geometry: new THREE.BoxGeometry(15, 1, 5),
    //         material: new THREE.MeshToonMaterial({ color: 0x60bbe6, transparent: true, opacity: 0.5, depthWrite: false }),
    //    //     }), new PhysicsObject(world, {
    //         position: { x: -16, y: -0.5, z: -5 },
    //         rotation: { x: 0, y: Math.PI/2, z: 0 },
    //         geometry: new THREE.BoxGeometry(15, 1, 5),
    //         material: new THREE.MeshToonMaterial({ color: 0x60bbe6, transparent: true, opacity: 0.5, depthWrite: false }),
    //    //     }), new PhysicsObject(world, {
    //         castShadow: false,
    //         receiveShadow: false,
    //         position: { x: -10, y: -0.5, z: -25 },
    //         rotation: { x: 0, y: 3*Math.PI/8, z: 0 },
    //         geometry: new THREE.BoxGeometry(30, 1, 5),
    //         material: new THREE.MeshToonMaterial({ color: 0x60bbe6, transparent: true, opacity: 0.5, depthWrite: false }),
    //    //     }), new PhysicsObject(world, {
    //         castShadow: false,
    //         receiveShadow: false,
    //         position: { x: -5, y: -0.5, z: -43 },
    //         rotation: { x: 0, y: Math.PI/2, z: 0 },
    //         geometry: new THREE.BoxGeometry(14, 1, 5),
    //         material: new THREE.MeshToonMaterial({ color: 0x60bbe6, transparent: true, opacity: 0.5, depthWrite: false }),
    //    //     }),
    // ]);

    // Paths
    // FUTURE: Bevelling (https://stackoverflow.com/questions/68696415/three-js-how-to-make-a-fully-beveled-cube)
    objects.push(...[
        // Southbound
        new PhysicsObject(world, {
            position: { x: -45, y: 0.6, z: -36 },
            rotation: { x: 0, y: Math.PI/2, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(6, 0.9, 10), new THREE.MeshToonMaterial({ color: 0xaaaaaa })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(3, 0.45, 5)
        }), new PhysicsObject(world, {
            position: { x: -35, y: 0.5, z: -35 },
            rotation: { x: 0, y: Math.PI/2.25, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(5, 0.4, 15), new THREE.MeshToonMaterial({ color: 0xcccccc })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(2.5, 0.2, 7.5),
            isCameraCollidable: true
        }), new PhysicsObject(world, {
            position: { x: -26, y: 0.7, z: -32 },
            rotation: { x: 0, y: Math.PI/2.4, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(5, 0.56, 7), new THREE.MeshToonMaterial({ color: 0xaaaaaa })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(2.5, 0.28, 3.5),
            isCameraCollidable: true
        }), new PhysicsObject(world, {
            position: { x: -21, y: 0.57, z: -29 },
            rotation: { x: 0, y: Math.PI/3.3, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.24, 7), new THREE.MeshToonMaterial({ color: 0xbbbbbb })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(2.6, 0.12, 3.5),
            isCameraCollidable: true
        }), new PhysicsObject(world, {
            position: { x: -15, y: 0.74, z: -27 },
            rotation: { x: 0, y: Math.PI/2.5, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(5, 0.7, 9.2), new THREE.MeshToonMaterial({ color: 0x999999 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(2.5, 0.35, 4.6),
            isCameraCollidable: true
        }), new PhysicsObject(world, {
            position: { x: -6, y: 0.74, z: -23 },
            rotation: { x: 0, y: Math.PI/2.9, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(4.9, 0.4, 11.2), new THREE.MeshToonMaterial({ color: 0xaaaaaa })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(2.45, 0.2, 5.6),
            isCameraCollidable: true
        }), new PhysicsObject(world, {
            position: { x: 2, y: 0.74, z: -17 },
            rotation: { x: 0, y: Math.PI/3.4, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.82, 9.5), new THREE.MeshToonMaterial({ color: 0xbbbbbb })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(2.2, 0.41, 4.75),
            isCameraCollidable: true
        }), new PhysicsObject(world, {
            position: { x: 8, y: 0.74, z: -12 },
            rotation: { x: 0, y: Math.PI/4, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.36, 7.9), new THREE.MeshToonMaterial({ color: 0x999999 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(2.4, 0.18, 3.85),
            isCameraCollidable: true
        }), new PhysicsObject(world, {
            position: { x: 14, y: 0.74, z: -6 },
            rotation: { x: 0, y: Math.PI/4.5, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.68, 10.8), new THREE.MeshToonMaterial({ color: 0xaaaaaa })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(2.6, 0.34, 5.4),
            isCameraCollidable: true
        }),

        // N-to-E
        new PhysicsObject(world, {
            position: { x: 45, y: 0.78, z: -17 },
            rotation: { x: 0, y: 0.1, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(10, 0.3, 5), new THREE.MeshToonMaterial({ color: 0xaaaaaa })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(5, 0.15, 2.5),
            isCameraCollidable: true
        }), new PhysicsObject(world, {
            position: { x: 37, y: 0.5, z: -15 },
            rotation: { x: 0, y: 0.3, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(9, 0.6, 4.5), new THREE.MeshToonMaterial({ color: 0x999999 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(4.5, 0.3, 2.25),
            isCameraCollidable: true
        }), new PhysicsObject(world, {
            position: { x: 28, y: 0.65, z: -9.5 },
            rotation: { x: 0, y: 0.6, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(14, 0.6, 5.2), new THREE.MeshToonMaterial({ color: 0xb6b6b6 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(7, 0.3, 2.6),
            isCameraCollidable: true
        }), new PhysicsObject(world, {
            position: { x: 20, y: 0.4, z: -2 },
            rotation: { x: 0, y: Math.PI/3, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(10, 0.6, 5.5), new THREE.MeshToonMaterial({ color: 0x9a9a9a })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(5, 0.3, 2.75),
            isCameraCollidable: true
        }), new PhysicsObject(world, {
            position: { x: 17, y: 0.68, z: 6 },
            rotation: { x: 0, y: 0.1, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.6, 10), new THREE.MeshToonMaterial({ color: 0xbbbbbb })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(2.5, 0.3, 5),
            isCameraCollidable: true
        }), new PhysicsObject(world, {
            position: { x: 16, y: 0.43, z: 15 },
            rotation: { x: 0, y: -0.35, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(5, 0.6, 8.8), new THREE.MeshToonMaterial({ color: 0x8f8f8f })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(2.5, 0.3, 4.4),
            isCameraCollidable: true
        }), new PhysicsObject(world, {
            position: { x: 11, y: 0.64, z: 22 },
            rotation: { x: 0, y: -Math.PI/4, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.6, 10.4), new THREE.MeshToonMaterial({ color: 0xaeaeae })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(2.2, 0.3, 5.2),
            isCameraCollidable: true
        }), new PhysicsObject(world, {
            position: { x: 4, y: 0.43, z: 26 },
            rotation: { x: 0, y: 0.1+Math.PI/2, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.6, 10.4), new THREE.MeshToonMaterial({ color: 0xa1a1a1 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(2.8, 0.3, 5.2),
            isCameraCollidable: true
        }), new PhysicsObject(world, {
            position: { x: -2, y: 0.7, z: 28 },
            rotation: { x: 0, y: -1.2, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.6, 7.6), new THREE.MeshToonMaterial({ color: 0xb6b6b6 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(2.8, 0.3, 3.8),
            isCameraCollidable: true
        }), new PhysicsObject(world, {
            position: { x: -8, y: 0.35, z: 32 },
            rotation: { x: 0, y: -Math.PI/4, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.6, 11.2), new THREE.MeshToonMaterial({ color: 0x9f9f9f })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(2.6, 0.3, 5.6),
            isCameraCollidable: true
        }), new PhysicsObject(world, {
            position: { x: -12.5, y: 0.55, z: 40 },
            rotation: { x: 0, y: -0.2, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.6, 10.8), new THREE.MeshToonMaterial({ color: 0xacacac })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(2.9, 0.3, 5.4),
            isCameraCollidable: true
        }), new PhysicsObject(world, {
            position: { x: -13, y: 0.4, z: 47 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(6, 0.6, 6), new THREE.MeshToonMaterial({ color: 0xa1a1a1 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(3, 0.3, 3),
            isCameraCollidable: true
        }),

        // Town square tiling inner
        new PhysicsObject(world, {
            position: { x: 3, y: 0.6, z: -10 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(7.5, 0.3, 7.5), new THREE.MeshToonMaterial({ color: 0xa4a4a4 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(3.75, 0.15, 3.75),
            isCameraCollidable: true
        }), new PhysicsObject(world, {
            position: { x: 7, y: 0.4, z: -5 },
            rotation: { x: 0, y: Math.PI/4, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(7.5, 0.3, 7.5), new THREE.MeshToonMaterial({ color: 0x8f8f8f })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(3.75, 0.15, 3.75),
            isCameraCollidable: true
        }), new PhysicsObject(world, {
            position: { x: 12, y: 0.5, z: -1 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(7.5, 0.3, 7.5), new THREE.MeshToonMaterial({ color: 0xb1b1b1 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(3.75, 0.15, 3.75),
            isCameraCollidable: true
        }), new PhysicsObject(world, {
            position: { x: 11, y: 0.6, z: 4 },
            rotation: { x: 0, y: Math.PI/4, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(7.5, 0.3, 7.5), new THREE.MeshToonMaterial({ color: 0xa2a2a2 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(3.75, 0.15, 3.75),
            isCameraCollidable: true
        }), new PhysicsObject(world, {
            position: { x: 12, y: 0.45, z: 9 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(7.5, 0.3, 7.5), new THREE.MeshToonMaterial({ color: 0x959595 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(3.75, 0.15, 3.75),
            isCameraCollidable: true
        }), new PhysicsObject(world, {
            position: { x: 6, y: 0.57, z: -2 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(10, 0.3, 10), new THREE.MeshToonMaterial({ color: 0xb5b5b5 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(5, 0.15, 5),
            isCameraCollidable: true
        }),

        // Town square tiling border
        new PhysicsObject(world, {
            position: { x: -0.5, y: 0.6, z: -11.5 },
            rotation: { x: 0, y: -0.4, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(4, 0.5, 11), new THREE.MeshToonMaterial({ color: 0x919191 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(2, 0.25, 5.5),
            isCameraCollidable: true
        }), new PhysicsObject(world, {
            position: { x: 0, y: 0.49, z: -3 },
            rotation: { x: 0, y: 0.4, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(5, 0.6, 10), new THREE.MeshToonMaterial({ color: 0xaeaeae })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(2.5, 0.3, 5),
            isCameraCollidable: true
        }), new PhysicsObject(world, {
            position: { x: 3.5, y: 0.72, z: 4.5 },
            rotation: { x: 0, y: 0.5, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(7, 0.5, 10), new THREE.MeshToonMaterial({ color: 0x939393 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(3.5, 0.25, 5),
            isCameraCollidable: true
        }), new PhysicsObject(world, {
            position: { x: 9.5, y: 0.64, z: 12.5 },
            rotation: { x: 0, y: Math.PI/4, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(7, 0.6, 12), new THREE.MeshToonMaterial({ color: 0xb2b2b2 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(3.5, 0.3, 6),
            isCameraCollidable: true
        }),
    ]);

    // House 1a
    objects.push(...[
        new PhysicsObject(world, { // house model
            position: { x: -22, y: 0.5, z: -42 },
            scale: { x: 0.5, y: 0.5, z: 0.5 },
            rotation: { x: 0, y: -Math.PI/8, z: 0 },
            mesh: house1aMesh.clone(),
        }), new PhysicsObject(world, { // path connector
            position: { x: -23.5, y: 0.35, z: -34.5 },
            rotation: { x: 0, y: 3*Math.PI/8, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(3, 0.5, 2.5), new THREE.MeshToonMaterial({ color: 0xbbbbbb })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(1.5, 0.25, 1.25)
        }),

        // Colliders
        new PhysicsObject(world, { // left
            position: { x: -26.4, y: 2.5, z: -43.6 },
            rotation: { x: 0, y: -Math.PI/8, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(0.5, 5, 9.5), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 2.5, 4.75),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // right
            position: { x: -17.65, y: 2.5, z: -40.3 },
            rotation: { x: 0, y: -Math.PI/8, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(0.5, 5, 9), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 2.5, 4.5),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // back
            position: { x: -20, y: 2.5, z: -46.25 },
            rotation: { x: 0, y: 3*Math.PI/8, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(0.5, 5, 9), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 2.5, 4.5),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // front left
            position: { x: -26, y: 2.5, z: -38.6 },
            rotation: { x: 0, y: 3*Math.PI/8, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(0.6, 5, 4.6), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.3, 2.5, 2.3),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // front right
            position: { x: -20.1, y: 2.5, z: -36.1 },
            rotation: { x: 0, y: 3*Math.PI/8, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(0.6, 5, 2), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.3, 2.5, 1),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // front top
            position: { x: -22.5, y: 4, z: -37.1 },
            rotation: { x: 0, y: 3*Math.PI/8, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(0.6, 2, 3.5), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.3, 1, 1.75),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // floor
            position: { x: -22, y: 0.75, z: -42 },
            rotation: { x: 0, y: 3*Math.PI/8, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(10, 0.5, 10), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(5, 0.25, 5),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // entrance step
            position: { x: -22.5, y: 0.5, z: -36.65 },
            rotation: { x: 0, y: 3*Math.PI/8, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.5, 3), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.75, 0.25, 1.5),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // inner roof
            position: { x: -22, y: 5, z: -42 },
            rotation: { x: 0, y: 3*Math.PI/8, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(10, 0.5, 10), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(5, 0.25, 5),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // left outer roof
            position: { x: -25, y: 7, z: -43 },
            rotation: { x: 0, y: -Math.PI/8, z: Math.PI/6 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(8, 0.8, 12), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(4, 0.4, 6),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // right outer roof
            position: { x: -19, y: 7, z: -41 },
            rotation: { x: 0, y: -Math.PI/8, z: -Math.PI/6 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(8, 0.8, 12), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(4, 0.4, 6),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // front outer roof
            position: { x: -24, y: 6, z: -37.25 },
            rotation: { x: 0, y: -Math.PI/8, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(6, 2, 1), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(3, 1, 0.5),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // back outer roof
            position: { x: -20, y: 6, z: -46.5 },
            rotation: { x: 0, y: -Math.PI/8, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(6, 2, 1), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(3, 1, 0.5),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // bed
            position: { x: -18.5, y: 1.25, z: -44 },
            rotation: { x: 0, y: 3*Math.PI/8, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(2, 1, 2.4), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(1, 0.5, 1.2),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // kitchen counter
            position: { x: -25.66, y: 1.5, z: -43.37 },
            rotation: { x: 0, y: 3*Math.PI/8, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(4, 1, 0.8), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(2, 0.5, 0.4),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // window shelf
            position: { x: -18, y: 1.8, z: -40.5 },
            rotation: { x: 0, y: 3*Math.PI/8, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(4, 1, 0.8), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(4.6, 0.2, 0.3),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // fridge
            position: { x: -24.55, y: 1.9, z: -46.03 },
            rotation: { x: 0, y: 3*Math.PI/8, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(1.6, 4.2, 0.8), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.8, 2.1, 0.4),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // oven
            position: { x: -26.81, y: 1.5, z: -40.83 }, // -x/+z > | +x/+z ^
            rotation: { x: 0, y: 3*Math.PI/8, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 9.2), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.6, 0.5, 0.6),
            isCameraCollidable: true
        }),

        // Dynamics
        new LightObject(world, { // floor lamp
            isStatic: false,
            castShadow: false,
            position: { x: -18.5, y: 2.32, z: -41.85 },
            scale: { x: 0.04, y: 0.04, z: 0.04 },
            mesh: lamp1Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.01, 0.0525, 0.01),
            colliderProps: { friction: 1, restitution: 0.2, density: 10 },
            light: new THREE.PointLight(0xf0b895, 2),
            lightRelPos: { x: 0, y: 1, z: 0 },
            lightCastShadow: true,
        }), new PhysicsObject(world, {
            isStatic: false,
            position: { x: -25.6, y: 2.2, z: -43.4 },
            scale: { x: 0.3, y: 0.3, z: 0.3 },
            mesh: apple1Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.04, 0.04, 0.04),
            colliderProps: { friction: 1, restitution: 0.2, density: 20 },
        }), new PhysicsObject(world, {
            isStatic: false,
            position: { x: -25.25, y: 2.2, z: -44.35 },
            scale: { x: 0.4, y: 0.4, z: 0.4 },
            mesh: mug1Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.06, 0.06, 0.04),
            colliderProps: { friction: 1, restitution: 0.2, density: 20 },
        }), new PhysicsObject(world, {
            isStatic: false,
            position: { x: -19.3, y: 2.15, z: -36.95 },
            scale: { x: 0.4, y: 0.4, z: 0.4 },
            mesh: trinket1Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.08, 0.02, 0.08),
            colliderProps: { friction: 1, restitution: 0.2, density: 20 },
        }), new PhysicsObject(world, {
            isStatic: false,
            position: { x: -18.6, y: 2.15, z: -38.7 },
            scale: { x: 0.4, y: 0.4, z: 0.4 },
            mesh: plant1Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.08, 0.04, 0.08),
            colliderProps: { friction: 1, restitution: 0, density: 20 },
        }), new PhysicsObject(world, {
            isStatic: false,
            position: { x: -18.1, y: 2.15, z: -39.8 },
            scale: { x: 0.4, y: 0.4, z: 0.4 },
            mesh: plant2Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.08, 0.04, 0.08),
            colliderProps: { friction: 1, restitution: 0, density: 20 },
        }), new PhysicsObject(world, {
            isStatic: false,
            position: { x: -17.9, y: 2.15, z: -40.42 },
            scale: { x: 0.4, y: 0.4, z: 0.4 },
            mesh: plant4Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.08, 0.04, 0.08),
            colliderProps: { friction: 1, restitution: 0, density: 20 },
        }), new PhysicsObject(world, {
            isStatic: false,
            position: { x: -17, y: 2.15, z: -42.42 },
            scale: { x: 0.4, y: 0.4, z: 0.4 },
            mesh: plant10Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.08, 0.04, 0.08),
            colliderProps: { friction: 1, restitution: 0, density: 20 },
        })
    ]);

    // House 1b
    objects.push(...[
        new PhysicsObject(world, { // house model
            position: { x: 30, y: 0.5, z: 2 },
            scale: { x: 0.5, y: 0.5, z: 0.5 },
            rotation: { x: 0, y: 1.25*Math.PI, z: 0 },
            mesh: house1bMesh.clone(),
        }), new PhysicsObject(world, { // path connector
            position: { x: 24, y: 0.35, z: -2 },
            rotation: { x: 0, y: 1.25*Math.PI, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(3, 0.5, 2.5), new THREE.MeshToonMaterial({ color: 0xbbbbbb })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(1.5, 0.25, 1.25)
        }),

        // Colliders
        new PhysicsObject(world, { // left
            position: { x: 33.4, y: 3, z: -1.4 }, // -x/+z > | +x/+z ^
            rotation: { x: 0, y: 1.25*Math.PI, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(0.5, 4, 10), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 2, 5),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // right
            position: { x: 26.6, y: 3, z: 5.4 }, // -x/+z > | +x/+z ^
            rotation: { x: 0, y: 1.25*Math.PI, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(0.5, 4, 2.5), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 2, 5),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // back
            position: { x: 33.4, y: 3, z: 5.4 }, // -x/+z > | +x/+z ^
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(0.5, 4, 10), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 2, 5),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // front left
            position: { x: 28.3, y: 3, z: -3.1 }, // -x/+z > | +x/+z ^
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(0.5, 4, 5), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 2, 2.5),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // front right
            position: { x: 23.8, y: 3, z: 1.4 }, // -x/+z > | +x/+z ^
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(0.5, 4, 1.9), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 2, 0.95),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // front top
            position: { x: 25.5, y: 4.1, z: -0.3 }, // -x/+z > | +x/+z ^
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.8, 3.8), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 0.9, 1.9),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // floor
            position: { x: 30, y: 0.75, z: 2 },
            rotation: { x: 0, y: 1.25*Math.PI, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(10, 0.5, 10), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(5, 0.25, 5),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // entrance step
            position: { x: 25.1, y: 0.5, z: -0.8 },
            rotation: { x: 0, y: 1.25*Math.PI, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(3, 0.5, 1), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(1.5, 0.25, 0.5),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // inner roof
            position: { x: 30, y: 5.2, z: 2 },
            rotation: { x: 0, y: 1.25*Math.PI, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(10, 0.5, 10), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(5, 0.25, 5),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // left outer roof
            position: { x: 32, y: 7, z: 0 }, // -x/+z >
            rotation: { x: 0, y: 1.25*Math.PI, z: Math.PI/6 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(8, 1, 12), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(4, 0.5, 6),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // right outer roof
            position: { x: 28, y: 7, z: 4 }, // -x/+z >
            rotation: { x: 0, y: 1.25*Math.PI, z: -Math.PI/6 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(8, 1, 12), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(4, 0.5, 6),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // front outer roof
            position: { x: 26.45, y: 6.2, z: -1.95 },
            rotation: { x: 0, y: 1.25*Math.PI, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(7, 2, 0.5), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(3.5, 1, 0.25),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // back outer roof
            position: { x: 33.55, y: 6.2, z: 5.95 },
            rotation: { x: 0, y: 1.25*Math.PI, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(7, 2, 0.5), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(3.5, 1, 0.25),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // bed
            position: { x: 32, y: 1.4, z: 4.7 }, // -x/+z > | +x/+z ^
            rotation: { x: 0, y: 1.25*Math.PI, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(2, 0.7, 2.6), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(1, 0.35, 1.3),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // sink counter
            position: { x: 32.8, y: 1.4, z: -0.9 }, // -x/+z > | +x/+z ^
            rotation: { x: 0, y: 1.25*Math.PI, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(1, 1.2, 4), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.5, 0.6, 2),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // fridge
            position: { x: 34.75, y: 2.5, z: 1.1 }, // -x/+z > | +x/+z ^
            rotation: { x: 0, y: 1.25*Math.PI, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(1, 3, 1.5), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.5, 1.5, 0.75),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // window shelf
            position: { x: 26.9, y: 1.75, z: 5 }, // -x/+z > | +x/+z ^
            rotation: { x: 0, y: 1.25*Math.PI, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 9.2), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 0.25, 4.6),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // oven
            position: { x: 30.75, y: 1.5, z: -2.8 }, // -x/+z > | +x/+z ^
            rotation: { x: 0, y: 1.25*Math.PI, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 9.2), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.6, 0.5, 0.6),
            isCameraCollidable: true
        }),

        // Dynamics
        new LightObject(world, { // floor lamp
            isStatic: false,
            castShadow: false,
            position: { x: 33.55, y: 2.32, z: 3.5 },
            scale: { x: 0.04, y: 0.04, z: 0.04 },
            mesh: lamp1Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.01, 0.0525, 0.01),
            colliderProps: { friction: 1, restitution: 0.2, density: 10 },
            light: new THREE.PointLight(0xf0b895, 2),
            lightRelPos: { x: 0, y: 1, z: 0 },
            lightCastShadow: true,
        }), new PhysicsObject(world, {
            isStatic: false,
            position: { x: 33.7, y: 2.15, z: 0.15 },
            scale: { x: 0.4, y: 0.4, z: 0.4 },
            mesh: mug1Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.06, 0.06, 0.04),
            colliderProps: { friction: 1, restitution: 0.2, density: 20 },
        }), new PhysicsObject(world, {
            isStatic: false,
            position: { x: 33.35, y: 2.15, z: -0.4 },
            scale: { x: 0.4, y: 0.4, z: 0.4 },
            mesh: bowl2Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.08, 0.04, 0.08),
            colliderProps: { friction: 1, restitution: 0.2, density: 20 },
        }), new PhysicsObject(world, {
            isStatic: false,
            position: { x: 34.85, y: 4.15, z: 1.05 },
            scale: { x: 0.4, y: 0.4, z: 0.4 },
            mesh: bowl1Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.08, 0.04, 0.08),
            colliderProps: { friction: 1, restitution: 0.2, density: 20 }
        }), new PhysicsObject(world, {
            isStatic: false,
            position: { x: 30.5, y: 2.05, z: 6.4 },
            scale: { x: 0.4, y: 0.4, z: 0.4 },
            mesh: rockingChair1Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.2, 0.4, 0.2),
            colliderProps: { friction: 1, restitution: 0, density: 20 }
        }), new PhysicsObject(world, {
            isStatic: false,
            position: { x: 25.6, y: 2.15, z: 3.65 },
            scale: { x: 0.4, y: 0.4, z: 0.4 },
            mesh: plant5Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.08, 0.04, 0.08),
            colliderProps: { friction: 1, restitution: 0, density: 20 },
        }), new PhysicsObject(world, {
            isStatic: false,
            position: { x: 26.12, y: 2.15, z: 4.21 },
            scale: { x: 0.4, y: 0.4, z: 0.4 },
            mesh: plant6Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.08, 0.04, 0.08),
            colliderProps: { friction: 1, restitution: 0, density: 20 },
        }), new PhysicsObject(world, {
            isStatic: false,
            position: { x: 27.66, y: 2.15, z: 5.7 },
            scale: { x: 0.4, y: 0.4, z: 0.4 },
            mesh: plant9Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.08, 0.04, 0.08),
            colliderProps: { friction: 1, restitution: 0, density: 20 },
        }), new PhysicsObject(world, {
            isStatic: false,
            position: { x: 28.2, y: 2.15, z: 6.35 },
            scale: { x: 0.4, y: 0.4, z: 0.4 },
            mesh: plant11Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.1, 0.05, 0.1),
            colliderProps: { friction: 1, restitution: 0, density: 20 },
        }), new PhysicsObject(world, {
            isStatic: false,
            position: { x: 29.66, y: 2.15, z: 7.72 },
            scale: { x: 0.4, y: 0.4, z: 0.4 },
            mesh: smartphone1Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.05, 0.02, 0.1),
            colliderProps: { friction: 1, restitution: 0.2, density: 20 },
        }), new PhysicsObject(world, {
            isStatic: false,
            position: { x: 29.93, y: 1.4, z: -3.55 },
            scale: { x: 0.4, y: 0.4, z: 0.4 },
            mesh: bin1Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.1, 0.12, 0.1),
            colliderProps: { friction: 1, restitution: 0.4, density: 5 },
        })
    ]);

    // House 1c
    objects.push(...[
        new PhysicsObject(world, { // house model
            position: { x: 17, y: 0.5, z: 30 },
            scale: { x: 0.5, y: 0.5, z: 0.5 },
            rotation: { x: 0, y: 1.25*Math.PI, z: 0 },
            mesh: house1cMesh.clone(),
        }), new PhysicsObject(world, { // path connector
            position: { x: 11, y: 0.35, z: 26 },
            rotation: { x: 0, y: 1.25*Math.PI, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.5, 2.5), new THREE.MeshToonMaterial({ color: 0x9f9f9f })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(1.25, 0.25, 1.25)
        }),

        // Colliders
        new PhysicsObject(world, { // left
            position: { x: 20.4, y: 3, z: 26.6 },
            rotation: { x: 0, y: 1.25*Math.PI, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(0.5, 4, 10), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 2, 5),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // right
            position: { x: 13.6, y: 3, z: 33.4 },
            rotation: { x: 0, y: 1.25*Math.PI, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(0.5, 4, 10), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 2, 5),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // back
            position: { x: 20.4, y: 3, z: 33.4 },
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(0.5, 4, 10), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 2, 5),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // front left
            position: { x: 15.3, y: 3, z: 24.9 },
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(0.5, 4, 5), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 2, 2.5),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // front right
            position: { x: 10.8, y: 3, z: 29.4 },
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(0.5, 4, 1.9), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 2, 0.95),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // front top
            position: { x: 12.5, y: 4.1, z: 27.7 },
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.8, 3.8), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 0.9, 1.9),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // floor
            position: { x: 17, y: 0.75, z: 30 },
            rotation: { x: 0, y: 1.25*Math.PI, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(10, 0.5, 10), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(5, 0.25, 5),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // entrance step
            position: { x: 12.1, y: 0.5, z: 27.2 },
            rotation: { x: 0, y: 1.25*Math.PI, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(3, 0.5, 1), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(1.5, 0.25, 0.5),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // inner roof
            position: { x: 17, y: 5.2, z: 30 },
            rotation: { x: 0, y: 1.25*Math.PI, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(10, 0.5, 10), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(5, 0.25, 5),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // left outer roof
            position: { x: 19, y: 7, z: 28 },
            rotation: { x: 0, y: 1.25*Math.PI, z: Math.PI/6 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(8, 1, 12), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(4, 0.5, 6),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // right outer roof
            position: { x: 15, y: 7, z: 32 },
            rotation: { x: 0, y: 1.25*Math.PI, z: -Math.PI/6 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(8, 1, 12), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(4, 0.5, 6),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // front outer roof
            position: { x: 13.45, y: 6.2, z: 26.05 },
            rotation: { x: 0, y: 1.25*Math.PI, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(7, 2, 0.5), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(3.5, 1, 0.25),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // back outer roof
            position: { x: 20.55, y: 6.2, z: 33.95 },
            rotation: { x: 0, y: 1.25*Math.PI, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(7, 2, 0.5), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(3.5, 1, 0.25),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // bed
            position: { x: 19, y: 1.4, z: 32.7 },
            rotation: { x: 0, y: 1.25*Math.PI, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(2, 0.7, 2.6), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(1, 0.35, 1.3),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // kitchen counter
            position: { x: 19.3, y: 1.5, z: 26.7 },
            rotation: { x: 0, y: Math.PI/4, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(0.8, 5, 5.2), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.4, 0.5, 2.6),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // window shelf
            position: { x: 14, y: 1.75, z: 33 },
            rotation: { x: 0, y: Math.PI/4, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 9), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 0.25, 4.5),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // window shelf
            position: { x: 21.75, y: 2.5, z: 29.1 },
            rotation: { x: 0, y: Math.PI/4, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(1, 3, 1.4), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.5, 1.5, 0.7),
            isCameraCollidable: true
        }),

        // Dynamics
        new LightObject(world, { // table lamp
            isStatic: false,
            castShadow: false,
            position: { x: 17.64, y: 2.4, z: 25.2 },
            scale: { x: 0.05, y: 0.05, z: 0.05 },
            mesh: lamp2Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.capsule(0.01, 0.01),
            colliderProps: { friction: 1, restitution: 0.2, density: 10 },
            light: new THREE.PointLight(0xf0e195, 3),
            lightCastShadow: true,
        }), new PhysicsObject(world, {
            isStatic: false,
            position: { x: 19.77, y: 2.15, z: 27.18 },
            scale: { x: 0.4, y: 0.4, z: 0.4 },
            mesh: trinket3Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.08, 0.03, 0.04),
            colliderProps: { friction: 1, restitution: 0.2, density: 20 }
        }), new PhysicsObject(world, {
            isStatic: false,
            position: { x: 20.8, y: 2.15, z: 28.2 },
            scale: { x: 0.07, y: 0.07, z: 0.07 },
            mesh: melon1Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.capsule(0, 0.02),
            colliderProps: { friction: 1, restitution: 0.2, density: 20 }
        }), new PhysicsObject(world, {
            isStatic: false,
            position: { x: 20.25, y: 2.15, z: 27.75 },
            scale: { x: 0.2, y: 0.2, z: 0.2 },
            mesh: hammer1Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.01, 0.01, 0.04),
            colliderProps: { friction: 1, restitution: 0.2, density: 20 }
        }), new PhysicsObject(world, {
            isStatic: false,
            position: { x: 15.76, y: 2.15, z: 34.83 },
            rotation: { x: 0, y: Math.PI/4, z: 0 },
            scale: { x: 0.4, y: 0.4, z: 0.4 },
            mesh: plant12Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.08, 0.04, 0.08),
            colliderProps: { friction: 1, restitution: 0, density: 20 },
        }), new PhysicsObject(world, {
            isStatic: false,
            position: { x: 15.34, y: 2.15, z: 34.42 },
            rotation: { x: 0, y: Math.PI/4, z: 0 },
            scale: { x: 0.4, y: 0.4, z: 0.4 },
            mesh: plant5Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.08, 0.04, 0.08),
            colliderProps: { friction: 1, restitution: 0, density: 20 },
        }), new PhysicsObject(world, {
            isStatic: false,
            position: { x: 14.9, y: 2.15, z: 34 },
            rotation: { x: 0, y: Math.PI/4, z: 0 },
            scale: { x: 0.4, y: 0.4, z: 0.4 },
            mesh: plant7Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.08, 0.04, 0.08),
            colliderProps: { friction: 1, restitution: 0, density: 20 },
        }), new PhysicsObject(world, {
            isStatic: false,
            position: { x: 14.32, y: 2.15, z: 33.44 },
            rotation: { x: 0, y: Math.PI/4, z: 0 },
            scale: { x: 0.4, y: 0.4, z: 0.4 },
            mesh: plant8Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.08, 0.04, 0.08),
            colliderProps: { friction: 1, restitution: 0, density: 20 },
        }), new PhysicsObject(world, {
            isStatic: false,
            position: { x: 13.77, y: 2.15, z: 32.9 },
            rotation: { x: 0, y: Math.PI/4, z: 0 },
            scale: { x: 0.4, y: 0.4, z: 0.4 },
            mesh: plant9Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.08, 0.04, 0.08),
            colliderProps: { friction: 1, restitution: 0, density: 20 },
        }), new PhysicsObject(world, {
            isStatic: false,
            position: { x: 13.35, y: 2.15, z: 32.5 },
            rotation: { x: 0, y: Math.PI/4, z: 0 },
            scale: { x: 0.4, y: 0.4, z: 0.4 },
            mesh: plant1Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.08, 0.04, 0.08),
            colliderProps: { friction: 1, restitution: 0, density: 20 },
        }), new PhysicsObject(world, {
            isStatic: false,
            position: { x: 12.78, y: 2.15, z: 31.94 },
            rotation: { x: 0, y: Math.PI/4, z: 0 },
            scale: { x: 0.4, y: 0.4, z: 0.4 },
            mesh: plant2Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.08, 0.04, 0.08),
            colliderProps: { friction: 1, restitution: 0, density: 20 },
        }), new PhysicsObject(world, {
            isStatic: false,
            position: { x: 12.34, y: 2.15, z: 31.5 },
            rotation: { x: 0, y: Math.PI/4, z: 0 },
            scale: { x: 0.4, y: 0.4, z: 0.4 },
            mesh: plant4Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.08, 0.04, 0.08),
            colliderProps: { friction: 1, restitution: 0, density: 20 },
        }), new PhysicsObject(world, {
            isStatic: false,
            position: { x: 18.2, y: 1.3, z: 34.2 },
            rotation: { x: 0, y: Math.PI/4, z: 0 },
            scale: { x: 0.4, y: 0.4, z: 0.4 },
            mesh: endTable1Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.14, 0.155, 0.14),
            colliderProps: { friction: 1, restitution: 0, density: 20 },
        }), new PhysicsObject(world, {
            isStatic: false,
            position: { x: 18.26, y: 2.1, z: 34.15 },
            rotation: { x: 0, y: Math.PI, z: 0 },
            scale: { x: 0.3, y: 0.3, z: 0.3 },
            mesh: alarmClock1Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.07, 0.07, 0.04),
            colliderProps: { friction: 1, restitution: 0.2, density: 15 }
        }), new PhysicsObject(world, {
            isStatic: false,
            position: { x: 22.67, y: 1.4, z: 30 },
            scale: { x: 0.4, y: 0.4, z: 0.4 },
            mesh: bin1Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.1, 0.12, 0.1),
            colliderProps: { friction: 1, restitution: 0.4, density: 5 },
        }),
    ]);

    // House 2
    objects.push(...[
        new PhysicsObject(world, { // house model
            position: { x: 28, y: 0.5, z: 20 },
            scale: { x: 0.5, y: 0.5, z: 0.5 },
            rotation: { x: 0, y: 1.25*Math.PI, z: 0 },
            mesh: house2Mesh.clone(),
        }), new PhysicsObject(world, { // path connector
            position: { x: 20, y: 0.35, z: 14.75 },
            rotation: { x: 0, y: 1.25*Math.PI, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.6, 4), new THREE.MeshToonMaterial({ color: 0xbbbbbb })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(1.25, 0.3, 2)
        }),

        // Colliders
        new PhysicsObject(world, { // left
            position: { x: 31.4, y: 4, z: 16.6 }, // -x/+z > | +x/+z ^
            rotation: { x: 0, y: 1.25*Math.PI, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(0.5, 6, 14), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 3, 7),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // right
            position: { x: 24.6, y: 4, z: 23.4 }, // -x/+z > | +x/+z ^
            rotation: { x: 0, y: 1.25*Math.PI, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(0.5, 6, 14), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 3, 7),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // back
            position: { x: 32.95, y: 4, z: 24.95 }, // -x/+z > | +x/+z ^
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(0.5, 6, 10), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 3, 5),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // front left
            position: { x: 24.5, y: 4, z: 13.6 }, // -x/+z > | +x/+z ^
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(0.5, 6, 5), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 3, 2.5),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // front right
            position: { x: 20.1, y: 4, z: 18 }, // -x/+z > | +x/+z ^
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(0.5, 6, 1.5), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 3, 0.75),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // front top
            position: { x: 21.7, y: 5.5, z: 16.4 }, // -x/+z > | +x/+z ^
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(0.5, 3, 2.8), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 1.5, 1.4),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // inside left
            position: { x: 32.75, y: 4, z: 18.75 }, // -x/+z > | +x/+z ^
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(0.5, 6, 1.5), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 3, 0.75),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // inside right
            position: { x: 28.35, y: 4, z: 23.15 }, // -x/+z > | +x/+z ^
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(0.5, 6, 5), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 3, 2.5),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // inside top
            position: { x: 31.2, y: 5.5, z: 20.3 }, // -x/+z > | +x/+z ^
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(0.5, 3, 3.2), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 1.5, 1.6),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // floor
            position: { x: 28, y: 0.75, z: 20 },
            rotation: { x: 0, y: 1.25*Math.PI, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(10, 0.5, 14.5), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(5, 0.25, 7.25),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // entrance step
            position: { x: 21.1, y: 0.5, z: 15.9 },
            rotation: { x: 0, y: 1.25*Math.PI, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(3, 0.5, 1), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(1.5, 0.25, 0.5),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // inner roof
            position: { x: 28, y: 6.75, z: 20 },
            rotation: { x: 0, y: 1.25*Math.PI, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(10, 0.5, 14.5), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(5, 0.25, 7.25),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // left outer roof
            position: { x: 30, y: 9, z: 18 }, // -x/+z > | +x/+z ^
            rotation: { x: 0, y: 1.25*Math.PI, z: Math.PI/6 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(8, 0.5, 16.5), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(4, 0.25, 8.25),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // right outer roof
            position: { x: 26, y: 9, z: 22 }, // -x/+z > | +x/+z ^
            rotation: { x: 0, y: 1.25*Math.PI, z: -Math.PI/6 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(8, 0.5, 16.5), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(4, 0.25, 8.25),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // front outer roof
            position: { x: 23, y: 8, z: 15 }, // -x/+z > | +x/+z ^
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(0.5, 2, 6), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 1, 3),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // back outer roof
            position: { x: 32.95, y: 8, z: 24.95 }, // -x/+z > | +x/+z ^
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(0.5, 2, 6), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 1, 3),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // sink
            position: { x: 34.5, y: 1.5, z: 22.2 }, // -x/+z > | +x/+z ^
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(1.4, 1, 3), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.7, 0.5, 1.5),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // toilet
            position: { x: 27.9, y: 1.5, z: 25.1 }, // -x/+z > | +x/+z ^
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(0.6, 1, 0.6), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.3, 0.5, 0.3),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // shower (floor)
            position: { x: 30.3, y: 1.2, z: 26.2 }, // -x/+z > | +x/+z ^
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(1, 0.2, 3), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.5, 0.1, 1.5),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // window shelf bottom
            position: { x: 29.2, y: 1.9, z: 15.5 }, // -x/+z > | +x/+z ^
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(9, 0.5, 1), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(4.5, 0.25, 0.5),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // window shelf top
            position: { x: 29.2, y: 4.9, z: 15.5 }, // -x/+z > | +x/+z ^
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(9, 0.5, 1), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(4.5, 0.25, 0.5),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // window shelf left
            position: { x: 26.95, y: 3.4, z: 13.25 }, // -x/+z > | +x/+z ^
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(0.5, 3, 1), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 1.5, 0.5),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // window shelf right
            position: { x: 31.55, y: 3.4, z: 17.8 }, // -x/+z > | +x/+z ^
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(0.5, 3, 1), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 1.5, 0.5),
            isCameraCollidable: true
        }),

        // Dynamics
        new PhysicsObject(world, {
            isStatic: false,
            position: { x: 26.05, y: 1.6, z: 21.45 },
            scale: { x: 0.8, y: 0.8, z: 0.8 },
            mesh: roundTable1Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(1, 0.45, 1),
            colliderProps: { friction: 1, restitution: 0, density: 20 }
        }), new PhysicsObject(world, {
            isStatic: false,
            position: { x: 26.4, y: 2.25, z: 21.72 },
            rotation: { x: 0, y: Math.PI/4, z: 0 },
            scale: { x: 0.4, y: 0.4, z: 0.4 },
            mesh: plant3Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.08, 0.04, 0.08),
            colliderProps: { friction: 1, restitution: 0, density: 20 }
        }), 
    ]);

    // House 3
    objects.push(...[
        new PhysicsObject(world, {
            position: { x: -8.5, y: 0.5, z: 13 },
            scale: { x: 0.5, y: 0.5, z: 0.5 },
            rotation: { x: 0, y: -1.25*Math.PI, z: 0 },
            mesh: house3Mesh.clone(),
        }), new PhysicsObject(world, { // path connector
            position: { x: 1.7, y: 0.35, z: 10.9 },
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.6, 4), new THREE.MeshToonMaterial({ color: 0x9f9f9f })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(1.25, 0.3, 2)
        }),

        // Colliders
        new PhysicsObject(world, { // [floor] (F1)
            position: { x: -6.4, y: 0.75, z: 15.1 }, // -x/-z > | -x/+z ^
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(13.4, 0.5, 15), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(6.7, 0.25, 7.5),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // [entrance step] (F1)
            position: { x: 1.25, y: 0.5, z: 11.4 },
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(3, 0.5, 1), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(1.5, 0.25, 0.5),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // [outer wall] left (F1)
            position: { x: -1.8, y: 3, z: 19.7 }, // -x/-z > | -x/+z ^
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(0.5, 5, 15), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 2.5, 7.5),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // [outer wall] right (F1)
            position: { x: -11, y: 3, z: 10.5 }, // -x/-z > | -x/+z ^
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(0.5, 5, 15), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 2.5, 7.5),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // [outer wall] back (F1)
            position: { x: -11.5, y: 3, z: 20.2 }, // -x/-z > | -x/+z ^
            rotation: { x: 0, y: 0.25*Math.PI, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(0.5, 5, 13), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 2.5, 6.5),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // [outer wall] front-left (F1)
            position: { x: 2.5, y: 3, z: 13.75 }, // -x/-z > | -x/+z ^
            rotation: { x: 0, y: 0.25*Math.PI, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(0.5, 5, 2), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 2.5, 1),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // [outer wall] front-right (F1)
            position: { x: -3.05, y: 3, z: 8.2 }, // -x/-z > | -x/+z ^
            rotation: { x: 0, y: 0.25*Math.PI, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(0.5, 5, 7.5), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 2.5, 3.75),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // [outer wall] front-top (F1)
            position: { x: 0.7, y: 4.75, z: 11.95 }, // -x/-z > | -x/+z ^
            rotation: { x: 0, y: 0.25*Math.PI, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.5, 3.2), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 0.75, 1.6),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // [inner wall] left (F1)
            position: { x: -7.4, y: 3, z: 19.4 }, // -x/-z > | -x/+z ^
            rotation: { x: 0, y: 0.25*Math.PI, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(0.5, 5, 8), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 2.5, 4),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // [inner wall] top (F1)
            position: { x: -11.3, y: 4.75, z: 15.5 }, // -x/-z > | -x/+z ^
            rotation: { x: 0, y: 0.25*Math.PI, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.5, 3.2), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 0.75, 1.6),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // [inner wall] right (F1)
            position: { x: -13, y: 3, z: 13.8 }, // -x/-z > | -x/+z ^
            rotation: { x: 0, y: 0.25*Math.PI, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(0.5, 5, 1.8), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 2.5, 0.9),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // [kitchen counter] (F1)
            position: { x: -8.8, y: 1.5, z: 9.8 }, // -x/-z > | -x/+z ^
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(1.6, 2, 4.8), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.8, 1, 2.4),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // [stairs] (F1)
            position: { x: -8, y: 2, z: 21.3 }, // -x/-z > | -x/+z ^
            rotation: { x: 0, y: 0.75*Math.PI, z: -Math.PI/4 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(9, 0.5, 3.2), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(4.5, 0.25, 1.6),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // [floor] large (F2)
            position: { x: -5.2, y: 5.75, z: 13.9 }, // -x/-z > | -x/+z ^
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(13.4, 0.5, 11.5), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(6.7, 0.25, 5.75),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // [floor] stair-adj (F2)
            position: { x: -12.8, y: 5.75, z: 16.9 }, // -x/-z > | -x/+z ^
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(6.9, 0.5, 3.5), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(3.45, 0.25, 1.75),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // [floor] balcony (F2)
            position: { x: -12.5, y: 5.75, z: 9 }, // -x/-z > | -x/+z ^
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(5, 0.5, 15), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(2.5, 0.25, 7.5),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // [outer wall] left (F2)
            position: { x: -1.8, y: 9, z: 19.7 }, // -x/-z > | -x/+z ^
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(0.5, 6, 15), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 3, 7.5),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // [outer wall] right-left (F2)
            position: { x: -9.4, y: 9, z: 8.9 }, // -x/-z > | -x/+z ^
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(0.5, 6, 10.5), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 3, 5.25),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // [outer wall] right-top  (F2)
            position: { x: -14.18, y: 10.5, z: 13.67 }, // -x/-z > | -x/+z ^
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(0.5, 3, 3), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 1.5, 1.5),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // [outer wall] right-right  (F2)
            position: { x: -15.5, y: 9, z: 15.1 }, // -x/-z > | -x/+z ^
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(0.5, 6, 1), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 3, 0.5),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // [outer wall] front (F2)
            position: { x: -1.3, y: 9, z: 10.0 }, // -x/-z > | -x/+z ^
            rotation: { x: 0, y: 0.25*Math.PI, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(0.5, 6, 13), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 3, 6.5),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // [outer wall] back (F2)
            position: { x: -11.5, y: 9, z: 20.2 }, // -x/-z > | -x/+z ^
            rotation: { x: 0, y: 0.25*Math.PI, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(0.5, 6, 13), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 3, 6.5),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // [inner wall] stair_bed-left (F2)
            position: { x: -12.7, y: 9, z: 17.9 }, // -x/-z > | -x/+z ^
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(0.5, 6, 1), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 3, 0.5),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // [outer wall] stair_bed-top  (F2)
            position: { x: -11.3, y: 10.5, z: 16.5 }, // -x/-z > | -x/+z ^
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(0.5, 3, 3), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 1.5, 1.5),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // [inner wall] stair_bed-right/bath_bed-right (F2)
            position: { x: -9.45, y: 9, z: 14.6 }, // -x/-z > | -x/+z ^
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(0.5, 6, 2.5), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 3, 1.25),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // [outer wall] bath_bed-top  (F2)
            position: { x: -7.5, y: 10.5, z: 12.6 }, // -x/-z > | -x/+z ^
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(0.5, 3, 3), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 1.5, 1.5),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // [inner wall] bath_bed-left (F2)
            position: { x: -4.8, y: 9, z: 9.95 }, // -x/-z > | -x/+z ^
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(0.5, 6, 4.6), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 3, 2.3),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // [inner wall] stair_bed (F2)
            position: { x: -6.1, y: 9, z: 17.9 }, // -x/-z > | -x/+z ^
            rotation: { x: 0, y: 0.25*Math.PI, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(0.5, 6, 9), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 3, 4.5),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // [balcony fence] left (F2)
            position: { x: -17.6, y: 6.5, z: 14 }, // -x/-z > | -x/+z ^
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(2, 1, 0.5), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(2, 0.5, 0.25),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // [balcony fence] right (F2)
            position: { x: -7.4, y: 6.5, z: 3.8 }, // -x/-z > | -x/+z ^
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(4, 1, 0.5), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(2, 0.5, 0.25),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // [balcony fence] right (F2)
            position: { x: -14.3, y: 6.5, z: 7.55 }, // -x/-z > | -x/+z ^
            rotation: { x: 0, y: 0.25*Math.PI, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(14, 1, 0.5), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(7, 0.5, 0.25),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // [bed] (F2)
            position: { x: -6.4, y: 6.25, z: 8.1 }, // -x/-z > | -x/+z ^
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(2, 0.5, 4), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(1, 0.25, 2),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // [bathroom sink] (F2)
            position: { x: 0.5, y: 6.5, z: 16.3 }, // -x/-z > | -x/+z ^
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(1.5, 1, 3), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.75, 0.5, 1.5),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // [toilet] (F2)
            position: { x: -4.55, y: 6.5, z: 18.4 }, // -x/-z > | -x/+z ^
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 1), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.4, 0.3, 0.5),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // [post] front
            position: { x: -9, y: 5.75, z: 2.3 }, // -x/-z > | -x/+z ^
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(0.5, 11, 0.5), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 5.5, 0.25),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // [post] back
            position: { x: -19.35, y: 5.75, z: 12.55 }, // -x/-z > | -x/+z ^
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(0.5, 11, 0.5), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 5.5, 0.25),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // [inner roof] main
            position: { x: -6.4, y: 11.75, z: 15.1 }, // -x/-z > | -x/+z ^
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(13.4, 0.5, 15), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(6.7, 0.25, 7.5),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // [inner roof] balcony
            position: { x: -12.5, y: 11.75, z: 9 }, // -x/-z > | -x/+z ^
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(5, 0.5, 15), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(2.5, 0.25, 7.5),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // [outer roof] front (F1)
            position: { x: -3, y: 13.75, z: 7.7 }, // -x/-z > | -x/+z ^
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(12, 4, 0.8), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(6, 2, 0.4),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // [outer roof] back (F1)
            position: { x: -13.5, y: 13.75, z: 18.2 }, // -x/-z > | -x/+z ^
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(12, 4, 1), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(6, 2, 0.5),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // [outer roof] left (F1)
            position: { x: -4.5, y: 15.5, z: 17 }, // -x/-z > | -x/+z ^
            rotation: { x: 0, y: 0.75*Math.PI, z: Math.PI/6 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(13, 1, 16), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(6.5, 0.5, 8),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // [outer roof] right (F1)
            position: { x: -12.5, y: 15.5, z: 9 }, // -x/-z > | -x/+z ^
            rotation: { x: 0, y: 0.75*Math.PI, z: -Math.PI/6 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(13, 1, 16), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(6.5, 0.5, 8),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // [window shelf] bottom (F1)
            position: { x: -1.3, y: 1.75, z: 18.15 },
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(1, 0.5, 7), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.5, 0.25, 3.5),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // [window shelf] top (F1)
            position: { x: -1.3, y: 4.25, z: 18.15 },
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(1, 0.5, 7), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.5, 0.25, 3.5),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // [window shelf] left (F1)
            position: { x: 0.3, y: 3, z: 16.55 },
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(1, 2, 0.5), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.5, 1, 0.25),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // [window shelf] right (F1)
            position: { x: -2.85, y: 3, z: 19.7 },
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(1, 2, 0.5), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.5, 1, 0.25),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // [fridge] (F1)
            position: { x: -3.75, y: 2.5, z: 8.6 },
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(1.8, 3.8, 1.7), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.9, 1.9, 0.85),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // [window shelf] bottom (F2)
            position: { x: -0.5, y: 7.25, z: 11.95 },
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.5, 1), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(2.7, 0.25, 0.5),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // [window shelf] top (F2)
            position: { x: -0.5, y: 9.75, z: 11.95 },
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.5, 1), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(2.7, 0.25, 0.5),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // [window shelf] left (F1)
            position: { x: -1.85, y: 8.5, z: 10.55 },
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(0.5, 2, 1), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 1, 0.5),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // [window shelf] right (F1)
            position: { x: 1, y: 8.5, z: 13.45 },
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(0.5, 2, 1), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 1, 0.5),
            isCameraCollidable: true
        }),

        // Dynamics
        new LightObject(world, { // [table lamp] (F1)
            isStatic: false,
            castShadow: false,
            position: { x: -5.2, y: 2.85, z: 20.13 },
            scale: { x: 0.1, y: 0.1, z: 0.1 },
            mesh: lamp2Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.05, 0.08, 0.05),
            colliderProps: { friction: 1, restitution: 0.2, density: 10 },
            light: new THREE.PointLight(0xf0e195, 3),
            lightCastShadow: true
        }), new LightObject(world, { // [floor lamp] model (F2)
            isStatic: false,
            castShadow: false,
            position: { x: -9.95, y: 7.315, z: 13.87 },
            scale: { x: 0.04, y: 0.04, z: 0.04 },
            mesh: lamp1Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.01, 0.0525, 0.01),
            colliderProps: { friction: 1, restitution: 0.2, density: 10 },
            light: new THREE.PointLight(0xf0b895, 2),
            lightRelPos: { x: 0, y: 1, z: 0 },
            lightCastShadow: true,
        }), new PhysicsObject(world, {
            isStatic: false,
            position: { x: -0.28, y: 2.15, z: 17.13 },
            rotation: { x: 0, y: Math.PI/4, z: 0 },
            scale: { x: 0.4, y: 0.4, z: 0.4 },
            mesh: plant9Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.08, 0.04, 0.08),
            colliderProps: { friction: 1, restitution: 0, density: 20 }
        }), new PhysicsObject(world, {
            isStatic: false,
            position: { x: -0.6, y: 2.15, z: 17.5 },
            rotation: { x: 0, y: Math.PI/4, z: 0 },
            scale: { x: 0.4, y: 0.4, z: 0.4 },
            mesh: plant7Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.08, 0.04, 0.08),
            colliderProps: { friction: 1, restitution: 0, density: 20 },
        }), new PhysicsObject(world, {
            isStatic: false,
            position: { x: -0.94, y: 2.15, z: 17.82 },
            rotation: { x: 0, y: Math.PI/4, z: 0 },
            scale: { x: 0.4, y: 0.4, z: 0.4 },
            mesh: plant8Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.08, 0.04, 0.08),
            colliderProps: { friction: 1, restitution: 0, density: 20 },
        }), new PhysicsObject(world, {
            isStatic: false,
            position: { x: -1.43, y: 2.15, z: 18.3 },
            rotation: { x: 0, y: Math.PI/4, z: 0 },
            scale: { x: 0.4, y: 0.4, z: 0.4 },
            mesh: plant6Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.08, 0.04, 0.08),
            colliderProps: { friction: 1, restitution: 0, density: 20 },
        }), new PhysicsObject(world, {
            isStatic: false,
            position: { x: -1.83, y: 2.15, z: 18.74 },
            rotation: { x: 0, y: Math.PI/4, z: 0 },
            scale: { x: 0.4, y: 0.4, z: 0.4 },
            mesh: plant5Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.08, 0.04, 0.08),
            colliderProps: { friction: 1, restitution: 0, density: 20 },
        }), new PhysicsObject(world, {
            isStatic: false,
            position: { x: -2.3, y: 2.15, z: 19.2 },
            rotation: { x: 0, y: Math.PI/4, z: 0 },
            scale: { x: 0.4, y: 0.4, z: 0.4 },
            mesh: plant4Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.08, 0.04, 0.08),
            colliderProps: { friction: 1, restitution: 0, density: 20 },
        }), new PhysicsObject(world, {
            isStatic: false,
            position: { x: -6.78, y: 1.55, z: 18.5 },
            rotation: { x: 0, y: Math.PI*0.75, z: 0 },
            scale: { x: 0.5, y: 0.5, z: 0.5 },
            mesh: longTable1Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(1.5, 0.25, 0.36),
            colliderProps: { friction: 1, restitution: 0, density: 20 }
        }), new PhysicsObject(world, {
            isStatic: false,
            position: { x: -6.98, y: 2.8, z: 18.3 },
            rotation: { x: 0, y: Math.PI*0.75, z: 0 },
            scale: { x: 0.7, y: 0.7, z: 0.7 },
            mesh: tv2Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(1.2, 0.55, 0.1),
            colliderProps: { friction: 1, restitution: 0, density: 20 }
        }), new PhysicsObject(world, {
            isStatic: false,
            position: { x: -8.38, y: 2.1, z: 16.43 },
            rotation: { x: 0, y: Math.PI/4, z: 0 },
            scale: { x: 0.4, y: 0.4, z: 0.4 },
            mesh: plant11Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.08, 0.04, 0.08),
            colliderProps: { friction: 1, restitution: 0, density: 20 }
        }), new PhysicsObject(world, {
            isStatic: false,
            position: { x: -3.89, y: 1.45, z: 15.57 },
            rotation: { x: 0, y: -Math.PI*0.25, z: 0 },
            scale: { x: 0.3, y: 0.3, z: 0.3 },
            mesh: couch2Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.5, 0.12, 0.2),
            colliderProps: { friction: 1, restitution: 0, density: 20 }
        }), new PhysicsObject(world, {
            isStatic: false,
            position: { x: -2.35, y: 1.45, z: 10.4 },
            scale: { x: 0.8, y: 0.8, z: 0.8 },
            mesh: pottedTree4Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.4, 0.35, 0.4),
            colliderProps: { friction: 1, restitution: 0, density: 20 }
        }), new PhysicsObject(world, {
            isStatic: false,
            position: { x: -11.38, y: 1.65, z: 12.18 },
            scale: { x: 0.8, y: 0.8, z: 0.8 },
            mesh: bin1Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.5, 0.5, 0.5),
            colliderProps: { friction: 1, restitution: 0.4, density: 5 }
        }), new PhysicsObject(world, {
            isStatic: false,
            position: { x: -9.15, y: 2.62, z: 10.18 },
            scale: { x: 0.05, y: 0.05, z: 0.05 },
            rotation: { x: 0, y: Math.PI/4, z: 0 },
            mesh: cheese1Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.006, 0.006, 0.01),
            colliderProps: { friction: 1, restitution: 0.4, density: 20 }
        }), new PhysicsObject(world, {
            isStatic: false,
            position: { x: -7.69, y: 3, z: 8.89 },
            scale: { x: 0.15, y: 0.15, z: 0.15 },
            rotation: { x: 0, y: Math.PI/4, z: 0 },
            mesh: pineapple1Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.05, 0.07, 0.05),
            colliderProps: { friction: 1, restitution: 0.4, density: 20 }
        }), new PhysicsObject(world, {
            isStatic: false,
            position: { x: -8.62, y: 2.65, z: 9.51 },
            scale: { x: 0.4, y: 0.4, z: 0.4 },
            mesh: bowl2Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.08, 0.04, 0.08),
            colliderProps: { friction: 1, restitution: 0.2, density: 20 }
        }), new PhysicsObject(world, {
            isStatic: false,
            position: { x: -10.16, y: 6.5, z: 6.14 },
            rotation: { x: 0, y: Math.PI/3.5, z: 0 },
            scale: { x: 0.8, y: 0.4, z: 0.5 },
            mesh: squareTable1Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(1.35, 0.18, 0.35),
            colliderProps: { friction: 1, restitution: 0, density: 20 }
        }), new PhysicsObject(world, {
            isStatic: false,
            position: { x: -7.68, y: 6.8, z: 5.7 },
            rotation: { x: 0, y: -Math.PI*0.75, z: 0 },
            scale: { x: 0.4, y: 0.4, z: 0.4 },
            mesh: beachChair1Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 0.3, 0.25),
            colliderProps: { friction: 1, restitution: 0, density: 20 }
        }), new PhysicsObject(world, {
            isStatic: false,
            position: { x: -11.71, y: 7, z: 8.64 },
            scale: { x: 0.4, y: 0.4, z: 0.4 },
            mesh: rockingChair1Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.2, 0.4, 0.2),
            colliderProps: { friction: 1, restitution: 0, density: 20 }
        }), new PhysicsObject(world, {
            isStatic: false,
            position: { x: -9.92, y: 7.05, z: 5.71 },
            scale: { x: 0.3, y: 0.3, z: 0.3 },
            mesh: apple1Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.04, 0.04, 0.04),
            colliderProps: { friction: 1, restitution: 0.2, density: 20 }
        }), new PhysicsObject(world, {
            isStatic: false,
            position: { x: -10.95, y: 7.05, z: 6.95 },
            scale: { x: 0.4, y: 0.4, z: 0.4 },
            mesh: bowl1Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.08, 0.05, 0.08),
            colliderProps: { friction: 1, restitution: 0.4, density: 20 }
        }), new PhysicsObject(world, {
            isStatic: false,
            position: { x: -17.5, y: 6.35, z: 12.3 },
            rotation: { x: 0, y: Math.PI/2, z: 0 },
            scale: { x: 0.4, y: 0.4, z: 0.4 },
            mesh: pottedTree2Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.12, 0.14, 0.12),
            colliderProps: { friction: 1, restitution: 0, density: 20 }
        }), new PhysicsObject(world, {
            isStatic: false,
            position: { x: -4.32, y: 6.4, z: 8.3 },
            rotation: { x: 0, y: Math.PI/4, z: 0 },
            scale: { x: 0.4, y: 0.4, z: 0.4 },
            mesh: endTable1Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.14, 0.155, 0.14),
            colliderProps: { friction: 1, restitution: 0, density: 20 }
        }), new PhysicsObject(world, {
            isStatic: false,
            position: { x: -4.32, y: 7.1, z: 8.3 },
            rotation: { x: 0, y: Math.PI*1.25, z: 0 },
            scale: { x: 0.3, y: 0.3, z: 0.3 },
            mesh: alarmClock1Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.07, 0.07, 0.04),
            colliderProps: { friction: 1, restitution: 0.2, density: 15 }
        }), new PhysicsObject(world, {
            isStatic: false,
            position: { x: -1.28, y: 7.6, z: 11.07 },
            rotation: { x: 0, y: Math.PI/4, z: 0 },
            scale: { x: 0.4, y: 0.4, z: 0.4 },
            mesh: plant7Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.08, 0.04, 0.08),
            colliderProps: { friction: 1, restitution: 0, density: 20 }
        }), new PhysicsObject(world, {
            isStatic: false,
            position: { x: 0.3, y: 7.6, z: 12.76 },
            scale: { x: 0.4, y: 0.4, z: 0.4 },
            mesh: plant10Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.08, 0.04, 0.08),
            colliderProps: { friction: 1, restitution: 0, density: 20 }
        }), new PhysicsObject(world, {
            isStatic: false,
            position: { x: -5.13, y: 6.5, z: 17.53 },
            scale: { x: 0.5, y: 0.5, z: 0.5 },
            mesh: plunger1Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.05, 0.25, 0.05),
            colliderProps: { friction: 1, restitution: 0, density: 20 }
        }), new PhysicsObject(world, {
            isStatic: false,
            position: { x: -5.04, y: 6.45, z: 11.67 },
            rotation: { x: 0, y: Math.PI/4, z: 0 },
            scale: { x: 0.8, y: 0.8, z: 0.8 },
            mesh: pottedTree5Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.4, 0.35, 0.4),
            colliderProps: { friction: 1, restitution: 0, density: 20 }
        }), new PhysicsObject(world, {
            isStatic: false,
            position: { x: 1.85, y: 6.3, z: 14.59 },
            scale: { x: 0.4, y: 0.4, z: 0.4 },
            mesh: bin1Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.1, 0.12, 0.1),
            colliderProps: { friction: 1, restitution: 0.4, density: 5 }
        }),
    ]);

    // House 4
    objects.push(...[
        new PhysicsObject(world, { // house model
            position: { x: -37, y: 0.5, z: -18 },
            scale: { x: 0.5, y: 0.5, z: 0.5 },
            rotation: { x: 0, y: Math.PI, z: 0 },
            mesh: house4Mesh.clone(),
        }), new PhysicsObject(world, { // path connector
            position: { x: -31, y: 0.35, z: -30 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.6, 4), new THREE.MeshToonMaterial({ color: 0x9f9f9f })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(1.25, 0.3, 2)
        }),

        // Colliders
        new PhysicsObject(world, { // left
            position: { x: -27.3, y: 3, z: -18 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(0.5, 4, 20), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 2, 10),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // right
            position: { x: -46.7, y: 3, z: -18 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(0.5, 4, 20), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 2, 10),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // back
            position: { x: -37, y: 3, z: -8.3 },
            rotation: { x: 0, y: Math.PI/2, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(0.5, 4, 20), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 2, 10),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // front left
            position: { x: -28.2, y: 3, z: -27.7 },
            rotation: { x: 0, y: Math.PI/2, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(0.5, 4, 2), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 2, 1),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // front right
            position: { x: -39.5, y: 3, z: -27.7 },
            rotation: { x: 0, y: Math.PI/2, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(0.5, 4, 14.4), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 2, 7.2),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // front top
            position: { x: -30.7, y: 4.3, z: -27.7 },
            rotation: { x: 0, y: Math.PI/2, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.4, 3.4), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 0.7, 1.7),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // inside long left
            position: { x: -34.65, y: 3, z: -15.8 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(0.5, 4, 14.6), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 2, 7.3),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // inside long top
            position: { x: -34.65, y: 4.2, z: -24.6 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.4, 3.2), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 0.7, 1.6),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // inside long right
            position: { x: -34.65, y: 3, z: -26.9 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(0.5, 4, 1.3), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 2, 0.65),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // inside short left
            position: { x: -38.5, y: 3, z: -18.8 },
            rotation: { x: 0, y: Math.PI/2, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(0.5, 4, 8), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 2, 4),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // inside short top
            position: { x: -44, y: 4.2, z: -18.8 },
            rotation: { x: 0, y: Math.PI/2, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.4, 3.2), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 0.7, 1.6),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // inside short top
            position: { x: -46.2, y: 3, z: -18.8 },
            rotation: { x: 0, y: Math.PI/2, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(0.5, 4, 1.2), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 2, 0.6),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // floor
            position: { x: -37, y: 0.75, z: -18 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(20, 0.5, 20), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(10, 0.25, 10),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // entrance step
            position: { x: -30.7, y: 0.5, z: -28.6 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(3, 0.5, 1), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(1.5, 0.25, 0.5),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // inner roof
            position: { x: -37, y: 5.2, z: -18 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(20, 0.5, 20), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(10, 0.25, 10),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // left outer roof
            position: { x: -31, y: 7.2, z: -18 },
            rotation: { x: 0, y: 0, z: -Math.PI/8 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(14, 1, 22), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(7, 0.5, 11),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // right outer roof
            position: { x: -43, y: 7.2, z: -18 },
            rotation: { x: 0, y: Math.PI, z: -Math.PI/8 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(14, 1, 22), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(7, 0.5, 11),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // front outer roof
            position: { x: -37, y: 6, z: -27.7 },
            rotation: { x: 0, y: Math.PI/2, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(0.5, 2.4, 12), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 1.2, 6),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // back outer roof
            position: { x: -37, y: 6, z: -8.3 },
            rotation: { x: 0, y: Math.PI/2, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(0.5, 2.4, 12), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.25, 1.2, 6),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // tv table
            position: { x: -31.05, y: 1.5, z: -9.1 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(4.2, 1, 1.1), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(2.1, 0.5, 0.55),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // sink counter
            position: { x: -42.5, y: 1.5, z: -26.9 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(5.6, 1, 1), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(2.8, 0.5, 0.5),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // fridge
            position: { x: -38.3, y: 1.5, z: -26.9 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(1.6, 5, 1), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.8, 2.5, 0.5),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // bed
            position: { x: -44.1, y: 1.4, z: -12.75 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.8, 4), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(2.2, 0.4, 2),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // bedroom long shelf
            position: { x: -40.64, y: 1.875, z: -9.07 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(11.5, 0.25, 1), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(5.75, 0.125, 0.5),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // bedroom bottom short shelf
            position: { x: -38.6, y: 2.2, z: -18.2 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.14, 1), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(3.2, 0.07, 0.5),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // bedroom top short shelf
            position: { x: -38.6, y: 3.45, z: -18.2 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.14, 1), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(3.2, 0.07, 0.5),
            isCameraCollidable: true
        }),

        // Dynamics
        new LightObject(world, { // floor lamp
            isStatic: false,
            castShadow: false,
            position: { x: -33.5, y: 2.32, z: -17.88 },
            scale: { x: 0.04, y: 0.04, z: 0.04 },
            mesh: lamp1Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.01, 0.0525, 0.01),
            colliderProps: { friction: 1, restitution: 0.2, density: 10 },
            light: new THREE.PointLight(0xf0b895, 2),
            lightRelPos: { x: 0, y: 1, z: 0 },
            lightCastShadow: true,
        }), new LightObject(world, { // table lamp
            isStatic: false,
            castShadow: false,
            position: { x: -41.14, y: 2.6, z: -9.06 },
            scale: { x: 0.05, y: 0.05, z: 0.05 },
            mesh: lamp2Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.capsule(0.01, 0.01),
            colliderProps: { friction: 1, restitution: 0.2, density: 10 },
            light: new THREE.PointLight(0xf0e195, 3),
            lightCastShadow: true,
        }), new PhysicsObject(world, {
            isStatic: false,
            position: { x: -31, y: 2.9, z: -8.85 },
            rotation: { x: 0, y: Math.PI, z: 0 },
            scale: { x: 0.25, y: 0.25, z: 0.25 },
            mesh: tv1Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.37, 0.21, 0.03),
            colliderProps: { friction: 1, restitution: 0.1, density: 15 }
        }), new PhysicsObject(world, {
            isStatic: false,
            position: { x: -32.62, y: 2.15, z: -9.21 },
            rotation: { x: 0, y: Math.PI/4, z: 0 },
            scale: { x: 0.4, y: 0.4, z: 0.4 },
            mesh: plant8Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.08, 0.04, 0.08),
            colliderProps: { friction: 1, restitution: 0, density: 20 }
        }), new PhysicsObject(world, {
            isStatic: false,
            position: { x: -29.44, y: 2.15, z: -9.38 },
            rotation: { x: 0, y: Math.PI/4, z: 0 },
            scale: { x: 0.4, y: 0.4, z: 0.4 },
            mesh: plant3Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.08, 0.04, 0.08),
            colliderProps: { friction: 1, restitution: 0, density: 20 }
        }), new PhysicsObject(world, {
            isStatic: false,
            position: { x: -31, y: 1.45, z: -12.46 },
            scale: { x: 0.3, y: 0.3, z: 0.3 },
            mesh: couch1Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.5, 0.12, 0.2),
            colliderProps: { friction: 1, restitution: 0, density: 20 },
        }), new PhysicsObject(world, {
            isStatic: false,
            position: { x: -29, y: 1.55, z: -17.25 },
            rotation: { x: 0, y: -Math.PI/3, z: 0 },
            scale: { x: 0.3, y: 0.3, z: 0.3 },
            mesh: squareTable2Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.3, 0.15, 0.2),
            colliderProps: { friction: 1, restitution: 0, density: 20 },
        }), new PhysicsObject(world, {
            isStatic: false,
            position: { x: -29.2, y: 2.35, z: -17.4 },
            scale: { x: 0.3, y: 0.3, z: 0.3 },
            mesh: bottle1Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.02, 0.07, 0.02),
            colliderProps: { friction: 1, restitution: 0, density: 20 }
        }), new PhysicsObject(world, {
            isStatic: false,
            position: { x: -28.58, y: 2.35, z: -17.06 },
            scale: { x: 0.3, y: 0.3, z: 0.3 },
            mesh: bottle1Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.02, 0.07, 0.02),
            colliderProps: { friction: 1, restitution: 0, density: 20 }
        }), new PhysicsObject(world, {
            isStatic: false,
            position: { x: -33.33, y: 1.4, z: -21.28 },
            scale: { x: 0.1, y: 0.1, z: 0.1 },
            rotation: { x: 0, y: Math.PI/4, z: 0 },
            mesh: woodChair1Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.03, 0.035, 0.03),
            colliderProps: { friction: 1, restitution: 0, density: 20 }
        }), new PhysicsObject(world, {
            isStatic: false,
            position: { x: -38.58, y: 1.55, z: -21.5 },
            scale: { x: 0.4, y: 0.4, z: 0.4 },
            mesh: squareTable2Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.5, 0.3, 0.3),
            colliderProps: { friction: 1, restitution: 0, density: 20 },
        }), new PhysicsObject(world, {
            isStatic: false,
            position: { x: -36.07, y: 1.5, z: -21.33 },
            scale: { x: 0.15, y: 0.15, z: 0.15 },
            rotation: { x: 0, y: -Math.PI/2, z: 0 },
            mesh: woodChair1Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.06, 0.07, 0.06),
            colliderProps: { friction: 1, restitution: 0, density: 20 }
        }), new PhysicsObject(world, {
            isStatic: false,
            position: { x: -41, y: 1.5, z: -21.45 },
            scale: { x: 0.15, y: 0.15, z: 0.15 },
            rotation: { x: 0, y: Math.PI/2.1, z: 0 },
            mesh: woodChair1Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.06, 0.07, 0.06),
            colliderProps: { friction: 1, restitution: 0, density: 20 }
        }), new PhysicsObject(world, {
            isStatic: false,
            position: { x: -37.8, y: 1.5, z: -19.83 },
            scale: { x: 0.15, y: 0.15, z: 0.15 },
            rotation: { x: 0, y: Math.PI*0.9, z: 0 },
            mesh: woodChair1Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.06, 0.07, 0.06),
            colliderProps: { friction: 1, restitution: 0, density: 20 }
        }), new PhysicsObject(world, {
            isStatic: false,
            position: { x: -39.9, y: 1.5, z: -19.96 },
            scale: { x: 0.15, y: 0.15, z: 0.15 },
            rotation: { x: 0, y: Math.PI, z: 0 },
            mesh: woodChair1Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.06, 0.07, 0.06),
            colliderProps: { friction: 1, restitution: 0, density: 20 }
        }), new PhysicsObject(world, {
            isStatic: false,
            position: { x: -37.7, y: 2.65, z: -21.2 },
            scale: { x: 0.05, y: 0.05, z: 0.05 },
            rotation: { x: 0, y: Math.PI/4, z: 0 },
            mesh: cheese1Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.006, 0.006, 0.01),
            colliderProps: { friction: 1, restitution: 0.4, density: 20 }
        }), new PhysicsObject(world, {
            isStatic: false,
            position: { x: -39.03, y: 2.65, z: -21.18 },
            scale: { x: 0.4, y: 0.4, z: 0.4 },
            mesh: bowl1Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.08, 0.05, 0.08),
            colliderProps: { friction: 1, restitution: 0.4, density: 20 }
        }), new PhysicsObject(world, {
            isStatic: false,
            position: { x: -38.26, y: 2.65, z: -21.69 },
            scale: { x: 0.4, y: 0.4, z: 0.4 },
            mesh: mug1Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.06, 0.06, 0.04),
            colliderProps: { friction: 1, restitution: 0.2, density: 20 },
        }), new PhysicsObject(world, {
            isStatic: false,
            position: { x: -41.6, y: 2.3, z: -26.9 },
            scale: { x: 0.07, y: 0.07, z: 0.07 },
            mesh: pumpkin1Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.capsule(0, 0.02),
            colliderProps: { friction: 1, restitution: 0.2, density: 20 }
        }), new PhysicsObject(world, {
            isStatic: false,
            position: { x: -40.7, y: 2.15, z: -26.91 },
            scale: { x: 0.4, y: 0.4, z: 0.4 },
            mesh: plant6Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.08, 0.04, 0.08),
            colliderProps: { friction: 1, restitution: 0, density: 20 }
        }), new PhysicsObject(world, {
            isStatic: false,
            position: { x: -45.85, y: 1.4, z: -26.9 },
            scale: { x: 0.4, y: 0.4, z: 0.4 },
            mesh: pottedTree1Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.12, 0.14, 0.12),
            colliderProps: { friction: 1, restitution: 0, density: 20 }
        }), new PhysicsObject(world, {
            isStatic: false,
            position: { x: -28.15, y: 1.4, z: -25.21 },
            rotation: { x: 0, y: Math.PI/2, z: 0 },
            scale: { x: 0.4, y: 0.4, z: 0.4 },
            mesh: pottedTree2Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.12, 0.14, 0.12),
            colliderProps: { friction: 1, restitution: 0, density: 20 }
        }), new PhysicsObject(world, {
            isStatic: false,
            position: { x: -28.4, y: 1.4, z: -19.83 },
            scale: { x: 0.4, y: 0.4, z: 0.4 },
            mesh: pottedTree2Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.12, 0.14, 0.12),
            colliderProps: { friction: 1, restitution: 0, density: 20 }
        }), new PhysicsObject(world, {
            isStatic: false,
            position: { x: -41, y: 3.8, z: -18.05 },
            rotation: { x: 0, y: Math.PI, z: 0 },
            scale: { x: 0.4, y: 0.4, z: 0.4 },
            mesh: trinket2Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.12, 0.1, 0.12),
            colliderProps: { friction: 1, restitution: 0, density: 20 }
        }), new PhysicsObject(world, {
            isStatic: false,
            position: { x: -39.18, y: 3.9, z: -18.02 },
            scale: { x: 0.4, y: 0.4, z: 0.4 },
            mesh: trinket3Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.08, 0.03, 0.04),
            colliderProps: { friction: 1, restitution: 0.2, density: 20 }
        }), new PhysicsObject(world, {
            isStatic: false,
            position: { x: -38.45, y: 3.65, z: -18.04 },
            rotation: { x: 0, y: Math.PI/4, z: 0 },
            scale: { x: 0.4, y: 0.4, z: 0.4 },
            mesh: trinket3Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.08, 0.03, 0.04),
            colliderProps: { friction: 1, restitution: 0.2, density: 20 }
        }), new PhysicsObject(world, {
            isStatic: false,
            position: { x: -36.78, y: 3.65, z: -18.09 },
            rotation: { x: 0, y: Math.PI/4, z: 0 },
            scale: { x: 0.4, y: 0.4, z: 0.4 },
            mesh: plant3Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.08, 0.04, 0.08),
            colliderProps: { friction: 1, restitution: 0, density: 20 }
        }), new PhysicsObject(world, {
            isStatic: false,
            position: { x: -36.3, y: 2.35, z: -18.1 },
            scale: { x: 0.4, y: 0.4, z: 0.4 },
            mesh: trinket1Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.08, 0.02, 0.08),
            colliderProps: { friction: 1, restitution: 0.2, density: 20 },
        }), new PhysicsObject(world, {
            isStatic: false,
            position: { x: -40.6, y: 2.4, z: -18.1 },
            rotation: { x: 0, y: Math.PI/2, z: 0 },
            scale: { x: 0.4, y: 0.4, z: 0.4 },
            mesh: trinket3Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.08, 0.03, 0.04),
            colliderProps: { friction: 1, restitution: 0.2, density: 20 }
        }), new PhysicsObject(world, {
            isStatic: false,
            position: { x: -38.66, y: 2.4, z: -18 },
            scale: { x: 0.4, y: 0.4, z: 0.4 },
            mesh: plant6Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.08, 0.04, 0.08),
            colliderProps: { friction: 1, restitution: 0, density: 20 }
        }), new PhysicsObject(world, {
            isStatic: false,
            position: { x: -36.68, y: 2.15, z: -9.26 },
            scale: { x: 0.4, y: 0.4, z: 0.4 },
            mesh: plant9Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.08, 0.04, 0.08),
            colliderProps: { friction: 1, restitution: 0, density: 20 }
        }), new PhysicsObject(world, {
            isStatic: false,
            position: { x: -37.27, y: 2.15, z: -8.95 },
            scale: { x: 0.4, y: 0.4, z: 0.4 },
            mesh: plant1Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.08, 0.04, 0.08),
            colliderProps: { friction: 1, restitution: 0, density: 20 }
        }), new PhysicsObject(world, {
            isStatic: false,
            position: { x: -37.77, y: 2.15, z: -9.03 },
            scale: { x: 0.4, y: 0.4, z: 0.4 },
            mesh: plant9Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.08, 0.04, 0.08),
            colliderProps: { friction: 1, restitution: 0, density: 20 }
        }), new PhysicsObject(world, {
            isStatic: false,
            position: { x: -38.35, y: 2.15, z: -9.03 },
            scale: { x: 0.4, y: 0.4, z: 0.4 },
            mesh: plant4Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.08, 0.04, 0.08),
            colliderProps: { friction: 1, restitution: 0, density: 20 }
        }), new PhysicsObject(world, {
            isStatic: false,
            position: { x: -39.15, y: 2.15, z: -9.03 },
            scale: { x: 0.4, y: 0.4, z: 0.4 },
            mesh: plant11Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.08, 0.04, 0.08),
            colliderProps: { friction: 1, restitution: 0, density: 20 }
        }), new PhysicsObject(world, {
            isStatic: false,
            position: { x: -40.03, y: 2.15, z: -9.03 },
            scale: { x: 0.4, y: 0.4, z: 0.4 },
            mesh: plant5Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.08, 0.04, 0.08),
            colliderProps: { friction: 1, restitution: 0, density: 20 }
        }), new PhysicsObject(world, {
            isStatic: false,
            position: { x: -42.72, y: 2.15, z: -9.06 },
            scale: { x: 0.4, y: 0.4, z: 0.4 },
            mesh: plant12Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.08, 0.04, 0.08),
            colliderProps: { friction: 1, restitution: 0, density: 20 }
        }), new PhysicsObject(world, {
            isStatic: false,
            position: { x: -36, y: 1.5, z: -13.23 },
            rotation: { x: 0, y: Math.PI/2, z: 0 },
            scale: { x: 0.8, y: 0.4, z: 0.5 },
            mesh: squareTable1Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(1.35, 0.18, 0.35),
            colliderProps: { friction: 1, restitution: 0, density: 20 }
        }), new PhysicsObject(world, {
            isStatic: false,
            position: { x: -36.37, y: 2.05, z: -14.5 },
            scale: { x: 0.4, y: 0.4, z: 0.4 },
            mesh: plant1Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.08, 0.04, 0.08),
            colliderProps: { friction: 1, restitution: 0, density: 20 }
        }), new PhysicsObject(world, {
            isStatic: false,
            position: { x: -35.74, y: 2.05, z: -14.24 },
            scale: { x: 0.4, y: 0.4, z: 0.4 },
            mesh: plant2Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.08, 0.04, 0.08),
            colliderProps: { friction: 1, restitution: 0, density: 20 }
        }), new PhysicsObject(world, {
            isStatic: false,
            position: { x: -36.22, y: 2.05, z: -13.34 },
            scale: { x: 0.4, y: 0.4, z: 0.4 },
            mesh: plant3Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.08, 0.04, 0.08),
            colliderProps: { friction: 1, restitution: 0, density: 20 }
        }), new PhysicsObject(world, {
            isStatic: false,
            position: { x: -35.77, y: 2.05, z: -11.85 },
            scale: { x: 0.4, y: 0.4, z: 0.4 },
            mesh: plant10Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.08, 0.04, 0.08),
            colliderProps: { friction: 1, restitution: 0, density: 20 }
        }), new PhysicsObject(world, {
            isStatic: false,
            position: { x: -45.56, y: 1.4, z: -16.05 },
            scale: { x: 0.8, y: 0.8, z: 0.8 },
            mesh: pottedTree3Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.5, 0.3, 0.5),
            colliderProps: { friction: 1, restitution: 0, density: 20 }
        })
    ]);

    // Forest
    objects.push(...[
        // Trees
        new PhysicsObject(world, { // model
            position: { x: -44, y: 0, z: 7.5 },
            scale: { x: 0.75, y: 0.75, z: 0.75 },
            mesh: tree1Mesh.clone(),
        }), new PhysicsObject(world, { // hitbox
            position: { x: -44.5, y: 12, z: 7.3 },
            colliderDesc: RAPIER.ColliderDesc.capsule(12, 1.5)
        }), new PhysicsObject(world, { // model
            position: { x: -34.75, y: 0, z: 0 },
            scale: { x: 0.25, y: 0.25, z: 0.25 },
            mesh: tree2Mesh.clone(),
        }), new PhysicsObject(world, { // hitbox
            position: { x: -34.75, y: 3, z: 0 },
            colliderDesc: RAPIER.ColliderDesc.capsule(3, 0.5)
        }), new PhysicsObject(world, { // model
            position: { x: -36.25, y: 0, z: 9.25 },
            scale: { x: 0.4, y: 0.4, z: 0.4 },
            mesh: tree3Mesh.clone(),
        }), new PhysicsObject(world, { // hitbox
            position: { x: -36.25, y: 6, z: 9.25 },
            colliderDesc: RAPIER.ColliderDesc.capsule(6, 1.5)
        }), new PhysicsObject(world, { // model
            position: { x: -42.75, y: 0, z: -2 },
            scale: { x: 0.2, y: 0.2, z: 0.2 },
            mesh: tree3Mesh.clone(),
        }), new PhysicsObject(world, { // hitbox
            position: { x: -42.75, y: 2.5, z: -2 },
            colliderDesc: RAPIER.ColliderDesc.capsule(2.6, 1)
        }), new PhysicsObject(world, { // model
            position: { x: -27, y: 0, z: 4 },
            scale: { x: 0.25, y: 0.25, z: 0.25 },
            mesh: tree1Mesh.clone(),
        }), new PhysicsObject(world, { // hitbox
            position: { x: -27, y: 3, z: 4 },
            colliderDesc: RAPIER.ColliderDesc.capsule(3, 0.75)
        }), new PhysicsObject(world, { // model
            position: { x: -47.25, y: 0, z: 20.75 },
            scale: { x: 0.3, y: 0.3, z: 0.3 },
            mesh: tree2Mesh.clone(),
        }), new PhysicsObject(world, { // hitbox
            position: { x: -47.25, y: 4, z: 20.75 },
            colliderDesc: RAPIER.ColliderDesc.capsule(4, 0.75)
        }), new PhysicsObject(world, { // model
            position: { x: -40.35, y: 0, z: 19.75 },
            scale: { x: 0.3, y: 0.6, z: 0.3 },
            mesh: tree1Mesh.clone(),
        }), new PhysicsObject(world, { // hitbox
            position: { x: -40.35, y: 10, z: 19.75 },
            colliderDesc: RAPIER.ColliderDesc.capsule(10, 0.75)
        }), new PhysicsObject(world, { // model
            position: { x: -41.65, y: 0, z: 27 },
            scale: { x: 0.25, y: 0.4, z: 0.25 },
            mesh: tree3Mesh.clone(),
        }), new PhysicsObject(world, { // hitbox
            position: { x: -41.65, y: 6, z: 27 },
            colliderDesc: RAPIER.ColliderDesc.capsule(6, 0.75)
        }), new PhysicsObject(world, { // model
            position: { x: -32.85, y: 0, z: 25.5 },
            scale: { x: 0.4, y: 0.2, z: 0.4 },
            mesh: tree1Mesh.clone(),
        }), new PhysicsObject(world, { // hitbox
            position: { x: -32.85, y: 3, z: 25.5 },
            colliderDesc: RAPIER.ColliderDesc.capsule(3, 0.75)
        }), new PhysicsObject(world, { // model
            position: { x: -47.15, y: 0, z: 31.8 },
            scale: { x: 0.3, y: 0.6, z: 0.3 },
            mesh: tree3Mesh.clone(),
        }), new PhysicsObject(world, { // hitbox
            position: { x: -47.15, y: 10, z: 31.8 },
            colliderDesc: RAPIER.ColliderDesc.capsule(10, 1)
        }), new PhysicsObject(world, { // model
            position: { x: -37.5, y: 0, z: 32.4 },
            scale: { x: 0.4, y: 0.4, z: 0.4 },
            mesh: tree1Mesh.clone(),
        }), new PhysicsObject(world, { // hitbox
            position: { x: -37.5, y: 7, z: 32.4 },
            colliderDesc: RAPIER.ColliderDesc.capsule(7, 1)
        }), new PhysicsObject(world, { // model
            position: { x: -28, y: 0, z: 32.6 },
            scale: { x: 0.5, y: 0.9, z: 0.5 },
            mesh: tree3Mesh.clone(),
        }), new PhysicsObject(world, { // hitbox
            position: { x: -28, y: 15, z: 32.6 },
            colliderDesc: RAPIER.ColliderDesc.capsule(15, 1.5)
        }), new PhysicsObject(world, { // model
            position: { x: -22.5, y: 0, z: 26 },
            scale: { x: 0.3, y: 0.3, z: 0.3 },
            mesh: tree1Mesh.clone(),
        }), new PhysicsObject(world, { // hitbox
            position: { x: -22.5, y: 5, z: 26 },
            colliderDesc: RAPIER.ColliderDesc.capsule(5, 0.75)
        }), new PhysicsObject(world, { // model
            position: { x: -43.8, y: 0, z: 37.3 },
            scale: { x: 0.2, y: 0.3, z: 0.2 },
            mesh: tree2Mesh.clone(),
        }), new PhysicsObject(world, { // hitbox
            position: { x: -43.8, y: 4, z: 37.3 },
            colliderDesc: RAPIER.ColliderDesc.capsule(4, 0.5)
        }), new PhysicsObject(world, { // model
            position: { x: -47.4, y: 0, z: 41.3 },
            scale: { x: 0.2, y: 0.5, z: 0.2 },
            mesh: tree1Mesh.clone(),
        }), new PhysicsObject(world, { // hitbox
            position: { x: -47.4, y: 8, z: 41.3 },
            colliderDesc: RAPIER.ColliderDesc.capsule(8, 0.5)
        }), new PhysicsObject(world, { // model
            position: { x: -41.8, y: 0, z: 43 },
            scale: { x: 0.4, y: 0.4, z: 0.4 },
            mesh: tree3Mesh.clone(),
        }), new PhysicsObject(world, { // hitbox
            position: { x: -41.8, y: 8, z: 43 },
            colliderDesc: RAPIER.ColliderDesc.capsule(8, 0.5)
        }), new PhysicsObject(world, { // model
            position: { x: -33.5, y: 0, z: 40.8 },
            scale: { x: 0.3, y: 0.5, z: 0.3 },
            mesh: tree2Mesh.clone(),
        }), new PhysicsObject(world, { // hitbox
            position: { x: -33.5, y: 8, z: 40.8 },
            colliderDesc: RAPIER.ColliderDesc.capsule(8, 0.5)
        }), new PhysicsObject(world, { // model
            position: { x: -34.85, y: 0, z: 48.45 },
            scale: { x: 0.3, y: 0.6, z: 0.3 },
            mesh: tree1Mesh.clone(),
        }), new PhysicsObject(world, { // hitbox
            position: { x: -34.85, y: 12, z: 48.45 },
            colliderDesc: RAPIER.ColliderDesc.capsule(12, 0.5)
        }), new PhysicsObject(world, { // model
            position: { x: -47.5, y: 0, z: 47.7 },
            scale: { x: 0.25, y: 0.3, z: 0.25 },
            mesh: tree1Mesh.clone(),
        }), new PhysicsObject(world, { // hitbox
            position: { x: -47.5, y: 6, z: 47.7 },
            colliderDesc: RAPIER.ColliderDesc.capsule(6, 0.75)
        }), new PhysicsObject(world, { // model
            position: { x: -28.5, y: 0, z: 45.5 },
            scale: { x: 0.25, y: 0.3, z: 0.25 },
            mesh: tree3Mesh.clone(),
        }), new PhysicsObject(world, { // hitbox
            position: { x: -28.5, y: 5, z: 45.5 },
            colliderDesc: RAPIER.ColliderDesc.capsule(5, 0.75)
        }), new PhysicsObject(world, { // model
            position: { x: -24.2, y: 0, z: 14.5 },
            scale: { x: 0.25, y: 0.3, z: 0.25 },
            mesh: tree1Mesh.clone(),
        }), new PhysicsObject(world, { // hitbox
            position: { x: -24.2, y: 5, z: 14.5 },
            colliderDesc: RAPIER.ColliderDesc.capsule(5, 0.5)
        }), new PhysicsObject(world, { // model
            position: { x: -21.1, y: 0, z: 17.5 },
            scale: { x: 0.1, y: 0.25, z: 0.1 },
            mesh: tree2Mesh.clone(),
        }), new PhysicsObject(world, { // hitbox
            position: { x: -21.1, y: 3, z: 17.5 },
            colliderDesc: RAPIER.ColliderDesc.capsule(3, 0.4)
        }), new PhysicsObject(world, { // model
            position: { x: -28.4, y: 0, z: 16.3 },
            scale: { x: 0.3, y: 0.5, z: 0.3 },
            mesh: tree3Mesh.clone(),
        }), new PhysicsObject(world, { // hitbox
            position: { x: -28.4, y: 6, z: 16.3 },
            colliderDesc: RAPIER.ColliderDesc.capsule(6, 0.7)
        }), new PhysicsObject(world, { // model
            position: { x: -22.3, y: 0, z: 39.2 },
            scale: { x: 0.3, y: 0.4, z: 0.3 },
            mesh: tree2Mesh.clone(),
        }), new PhysicsObject(world, { // hitbox
            position: { x: -22.3, y: 6, z: 39.2 },
            colliderDesc: RAPIER.ColliderDesc.capsule(6, 0.7)
        }),

        // Rock path across river
        new PhysicsObject(world, {
            position: { x: -42.1, y: -1, z: 17 },
            rotation: { x: 0, y: Math.PI/6, z: 0 },
            mesh: new THREE.Mesh(new THREE.CapsuleGeometry(0.8, 1, 2, 4), new THREE.MeshToonMaterial({ color: 0x8f8f8f })),
            colliderDesc: RAPIER.ColliderDesc.capsule(0.5, 0.8)
        }), new PhysicsObject(world, {
            position: { x: -42.75, y: -1, z: 15.1 },
            rotation: { x: 0, y: -Math.PI/4, z: 0 },
            mesh: new THREE.Mesh(new THREE.CapsuleGeometry(0.8, 1, 2, 4), new THREE.MeshToonMaterial({ color: 0x8f8f8f })),
            colliderDesc: RAPIER.ColliderDesc.capsule(0.5, 0.8)
        }), new PhysicsObject(world, {
            position: { x: -42.1, y: -1, z: 13.5 },
            mesh: new THREE.Mesh(new THREE.CapsuleGeometry(0.8, 1, 2, 4), new THREE.MeshToonMaterial({ color: 0x8f8f8f })),
            colliderDesc: RAPIER.ColliderDesc.capsule(0.5, 0.8)
        })
    ]);

    // Farmland
    objects.push(...[
        // Land
        new PhysicsObject(world, {
            position: { x: 5, y: 0.3, z: -35 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(3, 0.5, 30), new THREE.MeshToonMaterial({ color: 0x5e3d27 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(1.5, 0.25, 15)
        }), new PhysicsObject(world, {
            position: { x: 8, y: 0.3, z: -34.5 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(3, 0.5, 31), new THREE.MeshToonMaterial({ color: 0x875737 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(1.5, 0.25, 15.5)
        }), new PhysicsObject(world, {
            position: { x: 11, y: 0.3, z: -34 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(3, 0.5, 32), new THREE.MeshToonMaterial({ color: 0x5e3d27 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(1.5, 0.25, 16)
        }), new PhysicsObject(world, {
            position: { x: 14, y: 0.3, z: -33.5 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(3, 0.5, 33), new THREE.MeshToonMaterial({ color: 0x875737 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(1.5, 0.25, 16.5)
        }), new PhysicsObject(world, {
            position: { x: 17, y: 0.3, z: -33 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(3, 0.5, 34), new THREE.MeshToonMaterial({ color: 0x5e3d27 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(1.5, 0.25, 17)
        }), new PhysicsObject(world, {
            position: { x: 20, y: 0.3, z: -32.5 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(3, 0.5, 35), new THREE.MeshToonMaterial({ color: 0x875737 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(1.5, 0.25, 17.5)
        }), new PhysicsObject(world, {
            position: { x: 23, y: 0.3, z: -32.5 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(3, 0.5, 35), new THREE.MeshToonMaterial({ color: 0x5e3d27 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(1.5, 0.25, 17.5)
        }), new PhysicsObject(world, {
            position: { x: 26, y: 0.3, z: -33 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(3, 0.5, 34), new THREE.MeshToonMaterial({ color: 0x875737 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(1.5, 0.25, 17)
        }), new PhysicsObject(world, {
            position: { x: 29, y: 0.3, z: -33.5 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(3, 0.5, 33), new THREE.MeshToonMaterial({ color: 0x5e3d27 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(1.5, 0.25, 16.5)
        }), new PhysicsObject(world, {
            position: { x: 32, y: 0.3, z: -34 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(3, 0.5, 32), new THREE.MeshToonMaterial({ color: 0x875737 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(1.5, 0.25, 16)
        }),

        // Fences
        new PhysicsObject(world, {
            position: { x: 3, y: 1.5, z: -47.5 },
            rotation: { x: 0, y: Math.PI/2, z: 0 },
            scale: { x: 0.25, y: 0.25, z: 0.25 },
            mesh: fence1Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.6, 0.3, 0.07)
        }), new PhysicsObject(world, {
            position: { x: 3, y: 1.5, z: -43 },
            rotation: { x: 0, y: Math.PI/2, z: 0 },
            scale: { x: 0.25, y: 0.25, z: 0.25 },
            mesh: fence1Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.6, 0.3, 0.07)
        }), new PhysicsObject(world, {
            position: { x: 3, y: 1.5, z: -38.5 },
            rotation: { x: 0, y: Math.PI/2, z: 0 },
            scale: { x: 0.25, y: 0.25, z: 0.25 },
            mesh: fence1Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.6, 0.3, 0.07)
        }), new PhysicsObject(world, {
            position: { x: 3, y: 1.5, z: -34 },
            rotation: { x: 0, y: Math.PI/2, z: 0 },
            scale: { x: 0.25, y: 0.25, z: 0.25 },
            mesh: fence1Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.6, 0.3, 0.07)
        }), new PhysicsObject(world, {
            position: { x: 3, y: 1.5, z: -29.5 },
            rotation: { x: 0, y: Math.PI/2, z: 0 },
            scale: { x: 0.25, y: 0.25, z: 0.25 },
            mesh: fence1Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.6, 0.3, 0.07)
        }), new PhysicsObject(world, {
            position: { x: 3, y: 1.5, z: -25 },
            rotation: { x: 0, y: Math.PI/2, z: 0 },
            scale: { x: 0.25, y: 0.25, z: 0.25 },
            mesh: fence1Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.6, 0.3, 0.07)
        }), new PhysicsObject(world, {
            position: { x: 4.5, y: 1.5, z: -21 },
            rotation: { x: 0, y: -Math.PI/4, z: 0 },
            scale: { x: 0.25, y: 0.25, z: 0.25 },
            mesh: fence1Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.6, 0.3, 0.07)
        }), new PhysicsObject(world, {
            position: { x: 8, y: 1.5, z: -18.5 },
            rotation: { x: 0, y: -Math.PI/6, z: 0 },
            scale: { x: 0.25, y: 0.25, z: 0.25 },
            mesh: fence1Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.6, 0.3, 0.07)
        }), new PhysicsObject(world, {
            position: { x: 12.2, y: 1.5, z: -16.6 },
            rotation: { x: 0, y: -Math.PI/8, z: 0 },
            scale: { x: 0.25, y: 0.25, z: 0.25 },
            mesh: fence1Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.6, 0.3, 0.07)
        }), new PhysicsObject(world, {
            position: { x: 22, y: 1.5, z: -15.6 },
            scale: { x: 0.25, y: 0.25, z: 0.25 },
            mesh: fence1Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.6, 0.3, 0.07)
        }), new PhysicsObject(world, {
            position: { x: 26.7, y: 1.5, z: -16.8 },
            rotation: { x: 0, y: Math.PI/6, z: 0 },
            scale: { x: 0.25, y: 0.25, z: 0.25 },
            mesh: fence1Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.6, 0.3, 0.07)
        }), new PhysicsObject(world, {
            position: { x: 30.8, y: 1.5, z: -18.8 },
            rotation: { x: 0, y: Math.PI/8, z: 0 },
            scale: { x: 0.25, y: 0.25, z: 0.25 },
            mesh: fence1Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.6, 0.3, 0.07)
        }), new PhysicsObject(world, {
            position: { x: 33.8, y: 1.5, z: -22 },
            rotation: { x: 0, y: Math.PI/2.6, z: 0 },
            scale: { x: 0.25, y: 0.25, z: 0.25 },
            mesh: fence1Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.6, 0.3, 0.07)
        }), new PhysicsObject(world, {
            position: { x: 34.7, y: 1.5, z: -26.5 },
            rotation: { x: 0, y: Math.PI/2, z: 0 },
            scale: { x: 0.25, y: 0.25, z: 0.25 },
            mesh: fence1Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.6, 0.3, 0.07)
        }), new PhysicsObject(world, {
            position: { x: 34.7, y: 1.5, z: -47.5 },
            rotation: { x: 0, y: Math.PI/2, z: 0 },
            scale: { x: 0.25, y: 0.25, z: 0.25 },
            mesh: fence1Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.6, 0.3, 0.07)
        })
    ]);

    // Farmland crops
    for (const x of [29, 24, 19, 14, 9]) {
        const isMelon = (x % 2) === 0;
        for (const z of [-48, -45, -42, -39, -36, -33, -30, -28, -25, -22]) {
            const minCropScale = 0.15;
            const maxCropScale = 0.25;
            const cropScale = minCropScale + Math.random() * (maxCropScale - minCropScale);
            if (isMelon) {
                objects.push(new PhysicsObject(world, {
                    isStatic: false,
                    position: { x: x, y: 1.39, z: z },
                    rotation: { x: 0, y: Math.random()*Math.PI, z: 0 },
                    scale: { x: cropScale, y: cropScale, z: cropScale },
                    mesh: melon1Mesh.clone(),
                    colliderDesc: RAPIER.ColliderDesc.capsule(0, cropScale-0.04),
                    colliderProps: { friction: 0.2, restitution: 0.2, density: 50 + (cropScale * 100) },
                }));
            } else {
                objects.push(new PhysicsObject(world, {
                    isStatic: false,
                    position: { x: x, y: 1.39, z: z },
                    rotation: { x: 0, y: Math.random()*Math.PI, z: 0 },
                    scale: { x: cropScale, y: cropScale, z: cropScale },
                    mesh: pumpkin1Mesh.clone(),
                    colliderDesc: RAPIER.ColliderDesc.capsule(0, cropScale-0.07),
                    colliderProps: { friction: 0.2, restitution: 0.2, density: 50 + (cropScale * 100) }
                }));
            }
        }
    }

    // Flower garden fences
    objects.push(...[
        new PhysicsObject(world, {
            position: { x: 47.5, y: 1.5, z: -13 },
            scale: { x: 0.25, y: 0.25, z: 0.25 },
            mesh: fence1Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.6, 0.3, 0.07)
        }), new PhysicsObject(world, {
            position: { x: 38.4, y: 1.5, z: -12 },
            rotation: { x: 0, y: Math.PI/8, z: 0 },
            scale: { x: 0.25, y: 0.25, z: 0.25 },
            mesh: fence1Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.6, 0.3, 0.07)
        }), new PhysicsObject(world, {
            position: { x: 36.3, y: 1.5, z: -8.7 },
            rotation: { x: 0, y: Math.PI/2, z: 0 },
            scale: { x: 0.25, y: 0.25, z: 0.25 },
            mesh: fence1Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.6, 0.3, 0.07)
        }), new PhysicsObject(world, {
            position: { x: 37.5, y: 1.5, z: -4.5 },
            rotation: { x: 0, y: -Math.PI/3, z: 0 },
            scale: { x: 0.25, y: 0.25, z: 0.25 },
            mesh: fence1Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.6, 0.3, 0.07)
        }), new PhysicsObject(world, {
            position: { x: 38.8, y: 1.5, z: 0.1 },
            rotation: { x: 0, y: Math.PI/2, z: 0 },
            scale: { x: 0.25, y: 0.25, z: 0.25 },
            mesh: fence1Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.6, 0.3, 0.07)
        }), new PhysicsObject(world, {
            position: { x: 37, y: 1.5, z: 4.3 },
            rotation: { x: 0, y: Math.PI/4, z: 0 },
            scale: { x: 0.25, y: 0.25, z: 0.25 },
            mesh: fence1Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.6, 0.3, 0.07)
        }), new PhysicsObject(world, {
            position: { x: 35.3, y: 1.5, z: 8.4 },
            rotation: { x: 0, y: Math.PI/2, z: 0 },
            scale: { x: 0.25, y: 0.25, z: 0.25 },
            mesh: fence1Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.6, 0.3, 0.07)
        }), new PhysicsObject(world, {
            position: { x: 35.3, y: 1.5, z: 12.9 },
            rotation: { x: 0, y: Math.PI/2, z: 0 },
            scale: { x: 0.25, y: 0.25, z: 0.25 },
            mesh: fence1Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.6, 0.3, 0.07)
        }), new PhysicsObject(world, {
            position: { x: 37, y: 1.5, z: 17 },
            rotation: { x: 0, y: -Math.PI/4, z: 0 },
            scale: { x: 0.25, y: 0.25, z: 0.25 },
            mesh: fence1Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.6, 0.3, 0.07)
        }), new PhysicsObject(world, {
            position: { x: 38.8, y: 1.5, z: 21 },
            rotation: { x: 0, y: Math.PI/2, z: 0 },
            scale: { x: 0.25, y: 0.25, z: 0.25 },
            mesh: fence1Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.6, 0.3, 0.07)
        }), new PhysicsObject(world, {
            position: { x: 37, y: 1.5, z: 25 },
            rotation: { x: 0, y: Math.PI/4, z: 0 },
            scale: { x: 0.25, y: 0.25, z: 0.25 },
            mesh: fence1Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.6, 0.3, 0.07)
        }), new PhysicsObject(world, {
            position: { x: 33.8, y: 1.5, z: 28.2 },
            rotation: { x: 0, y: Math.PI/4, z: 0 },
            scale: { x: 0.25, y: 0.25, z: 0.25 },
            mesh: fence1Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.6, 0.3, 0.07)
        }), new PhysicsObject(world, {
            position: { x: 32.2, y: 1.5, z: 32 },
            rotation: { x: 0, y: Math.PI/2, z: 0 },
            scale: { x: 0.25, y: 0.25, z: 0.25 },
            mesh: fence1Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.6, 0.3, 0.07)
        }), new PhysicsObject(world, {
            position: { x: 38.5, y: 1.5, z: 39.7 },
            rotation: { x: 0, y: -Math.PI/6, z: 0 },
            scale: { x: 0.25, y: 0.25, z: 0.25 },
            mesh: fence1Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.6, 0.3, 0.07)
        }), new PhysicsObject(world, {
            position: { x: 43, y: 1.5, z: 41 },
            scale: { x: 0.25, y: 0.25, z: 0.25 },
            mesh: fence1Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.6, 0.3, 0.07)
        }), new PhysicsObject(world, {
            position: { x: 47.5, y: 1.5, z: 41 },
            scale: { x: 0.25, y: 0.25, z: 0.25 },
            mesh: fence1Mesh.clone(),
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
            mesh: groundMesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(data.dim.x/2, data.dim.y/2, data.dim.z/2)
        }));

        if (stemsMesh === null) continue;
        objects.push(new PhysicsObject(world, {
            position: data.pos,
            rotation: data.rot,
            mesh: stemsMesh.clone(),
        }));

        for (const heads of headsList) {
            if (heads.mesh === null) continue;
            objects.push(new PhysicsObject(world, {
                position: data.pos,
                rotation: data.rot,
                mesh: heads.mesh.clone(),
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
            mesh: statue1Mesh.clone(),
        }), new PhysicsObject(world, {
            position: { x: 9.3, y: 1.5, z: 0.8 },
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            colliderDesc: RAPIER.ColliderDesc.cuboid(2.25, 1.5, 1.5),
        }), new PhysicsObject(world, {
            position: { x: 9.3, y: 5.5, z: 0.8 },
            rotation: { x: 0, y: 0.75*Math.PI, z: 0 },
            colliderDesc: RAPIER.ColliderDesc.cuboid(2, 2.5, 1.25),
        }),

        // Stall 1
        new PhysicsObject(world, { // model
            position: { x: -5, y: 3.5, z: -13.5 },
            rotation: { x: 0, y: Math.PI/3, z: 0 },
            scale: { x: 0.3, y: 0.3, z: 0.3 },
            mesh: stall1Mesh.clone(),
        }), new PhysicsObject(world, { // front
            position: { x: -3.92, y: 1, z: -12.69 },
            rotation: { x: 0, y: Math.PI/3, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(5.5, 2, 1.4), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(2.75, 1, 0.7),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // back
            position: { x: -6.67, y: 1, z: -14.29 },
            rotation: { x: 0, y: Math.PI/3, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(5.5, 2, 0.3), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(2.75, 1, 0.15),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // side
            position: { x: -3.54, y: 1, z: -15.74 },
            rotation: { x: 0, y: Math.PI*(5/6), z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(3.5, 2, 0.3), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(1.75, 1, 0.15),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // roof
            position: { x: -5, y: 5, z: -13.5 },
            rotation: { x: 0, y: Math.PI/3, z: 0 },
            scale: { x: 0.3, y: 0.3, z: 0.3 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(2, 0.3, 1.5), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(1, 0.15, 0.75),
            isCameraCollidable: true
        }),

        // Stall 2
        new PhysicsObject(world, { // model
            position: { x: -7.3, y: 3.5, z: -5.8 },
            rotation: { x: 0, y: Math.PI/2, z: 0 },
            scale: { x: 0.3, y: 0.3, z: 0.3 },
            mesh: stall2Mesh.clone(),
        }), new PhysicsObject(world, { // front
            position: { x: -5.9, y: 1, z: -5.75 },
            rotation: { x: 0, y: Math.PI/2, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(5.5, 2, 1.4), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(2.75, 1, 0.7),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // back
            position: { x: -9.08, y: 1, z: -5.80 },
            rotation: { x: 0, y: Math.PI/2, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(5.5, 2, 0.3), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(2.75, 1, 0.15),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // side
            position: { x: -7.37, y: 1, z: -8.51 },
            rotation: { x: 0, y: Math.PI, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(3.5, 2, 0.3), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(1.75, 1, 0.15),
            isCameraCollidable: true
        }), new PhysicsObject(world, { // roof
            position: { x: -7.3, y: 5, z: -5.8 },
            rotation: { x: 0, y: Math.PI/2, z: 0 },
            scale: { x: 0.3, y: 0.3, z: 0.3 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(2, 0.3, 1.5), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(1, 0.15, 0.75),
            isCameraCollidable: true
        }),

        // Benches
        new PhysicsObject(world, {
            isStatic: false,
            position: { x: -3, y: 1.2, z: 2.15 },
            rotation: { x: 0, y: Math.PI/1.6, z: 0 },
            scale: { x: 0.4, y: 0.4, z: 0.4 },
            mesh: bench1Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(1, 0.25, 0.3),
            colliderProps: { friction: 1, restitution: 0, density: 10 }
        }), new PhysicsObject(world, {
            isStatic: false,
            position: { x: 17.62, y: 1.2, z: -9.86 },
            rotation: { x: 0, y: -Math.PI/4, z: 0 },
            scale: { x: 0.4, y: 0.4, z: 0.4 },
            mesh: bench1Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(1, 0.25, 0.3),
            colliderProps: { friction: 1, restitution: 0, density: 10 },
        }), new PhysicsObject(world, {
            isStatic: false,
            position: { x: 22.67, y: 1.2, z: 7.66 },
            rotation: { x: 0, y: -Math.PI/2, z: 0 },
            scale: { x: 0.4, y: 0.4, z: 0.4 },
            mesh: bench1Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(1, 0.25, 0.3),
            colliderProps: { friction: 1, restitution: 0, density: 10 },
        }),
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
                mesh: grasses.mesh.clone(),
            }));
        }
    }

    // [General] Benches
    objects.push(...[
        new PhysicsObject(world, {
            isStatic: false,
            position: { x: -8, y: 2, z: 45.7 },
            rotation: { x: 0, y: -Math.PI/2, z: 0 },
            scale: { x: 0.4, y: 0.4, z: 0.4 },
            mesh: bench1Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(1, 0.25, 0.3),
            colliderProps: { friction: 1, restitution: 0, density: 10 },
        }), new PhysicsObject(world, {
            isStatic: false,
            position: { x: -35.2, y: 2, z: -40.6 },
            rotation: { x: 0, y: -Math.PI/12, z: 0 },
            scale: { x: 0.4, y: 0.4, z: 0.4 },
            mesh: bench1Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(1, 0.25, 0.3),
            colliderProps: { friction: 1, restitution: 0, density: 10 },
        }), new PhysicsObject(world, {
            isStatic: false,
            position: { x: 0, y: 2, z: -44 },
            rotation: { x: 0, y: -Math.PI/2, z: 0 },
            scale: { x: 0.4, y: 0.4, z: 0.4 },
            mesh: bench1Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.cuboid(1, 0.25, 0.3),
            colliderProps: { friction: 1, restitution: 0, density: 10 },
        })
    ]);

    // [General] Trees
    objects.push(...[
        new PhysicsObject(world, { // model
            position: { x: -32.05, y: 0, z: -45.45 },
            scale: { x: 0.15, y: 0.3, z: 0.15 },
            mesh: tree3Mesh.clone(),
        }), new PhysicsObject(world, { // hitbox
            position: { x: -32.05, y: 4.5, z: -45.45 },
            colliderDesc: RAPIER.ColliderDesc.capsule(4.5, 0.5)
        }), new PhysicsObject(world, { // model
            position: { x: -19.8, y: 0, z: -16.4 },
            scale: { x: 0.15, y: 0.2, z: 0.15 },
            mesh: tree2Mesh.clone(),
        }), new PhysicsObject(world, { // hitbox
            position: { x: -19.8, y: 3, z: -16.4 },
            colliderDesc: RAPIER.ColliderDesc.capsule(3, 0.5)
        }), new PhysicsObject(world, { // model
            position: { x: -1, y: 0, z: -28 },
            scale: { x: 0.3, y: 0.4, z: 0.3 },
            mesh: tree1Mesh.clone(),
        }), new PhysicsObject(world, { // hitbox
            position: { x: -1, y: 6, z: -28 },
            colliderDesc: RAPIER.ColliderDesc.capsule(6, 0.5)
        }), new PhysicsObject(world, { // model
            position: { x: 9.4, y: 0, z: 35.75 },
            scale: { x: 0.15, y: 0.3, z: 0.15 },
            mesh: tree3Mesh.clone(),
        }), new PhysicsObject(world, { // hitbox
            position: { x: 9.4, y: 4.5, z: 35.75 },
            colliderDesc: RAPIER.ColliderDesc.capsule(4.5, 0.5)
        }), new PhysicsObject(world, { // model
            position: { x: 23.25, y: 0, z: -12.25 },
            scale: { x: 0.1, y: 0.2, z: 0.1 },
            mesh: tree2Mesh.clone(),
        }), new PhysicsObject(world, { // hitbox
            position: { x: 23.25, y: 3, z: -12.25 },
            colliderDesc: RAPIER.ColliderDesc.capsule(3, 0.5)
        }),
    ]);

    // Lilypads
    objects.push(...[
        new PhysicsObject(world, {
            position: { x: -45.6, y: 0, z: 14.6 },
            rotation: { x: 0, y: Math.PI/6, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(1, 0.1, 1), new THREE.MeshToonMaterial({ color: 0x2b5c1f })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.5, 0.05, 0.5)
        }), new PhysicsObject(world, {
            position: { x: -33.2, y: 0, z: 13.9 },
            rotation: { x: 0, y: Math.PI/6, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.1, 1.2), new THREE.MeshToonMaterial({ color: 0x49823b })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.6, 0.05, 0.6)
        }), new PhysicsObject(world, {
            position: { x: -19.7, y: 0, z: 6.5 },
            rotation: { x: 0, y: Math.PI/4, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(1, 0.1, 1), new THREE.MeshToonMaterial({ color: 0x2b5c1f })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.5, 0.05, 0.5)
        }), new PhysicsObject(world, {
            position: { x: -16.3, y: 0, z: -13 },
            rotation: { x: 0, y: Math.PI/4, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.1, 1.4), new THREE.MeshToonMaterial({ color: 0x49823b })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.7, 0.05, 0.7)
        }), new PhysicsObject(world, {
            position: { x: -7.75, y: 0, z: -28.15 },
            rotation: { x: 0, y: -Math.PI/8, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.1, 1.4), new THREE.MeshToonMaterial({ color: 0x2b5c1f })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.7, 0.05, 0.7)
        }), new PhysicsObject(world, {
            position: { x: -9.5, y: 0, z: 27.7 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.1, 1.2), new THREE.MeshToonMaterial({ color: 0x49823b })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.6, 0.05, 0.6)
        }), new PhysicsObject(world, {
            position: { x: -12.6, y: 0, z: 28.15 },
            rotation: { x: 0, y: Math.PI/8, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.1, 0.8), new THREE.MeshToonMaterial({ color: 0x2b5c1f })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.4, 0.05, 0.4)
        }), new PhysicsObject(world, {
            position: { x: 15.15, y: 0, z: 41 },
            rotation: { x: 0, y: Math.PI/8, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(1, 0.1, 1), new THREE.MeshToonMaterial({ color: 0x49823b })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.5, 0.05, 0.5)
        }), new PhysicsObject(world, {
            position: { x: 46.3, y: 0, z: 44 },
            rotation: { x: 0, y: -Math.PI/4, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.1, 1.6), new THREE.MeshToonMaterial({ color: 0x2b5c1f })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.8, 0.05, 0.8)
        }), new PhysicsObject(world, {
            position: { x: -9.3, y: 0, z: -29.5 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.1, 1.2), new THREE.MeshToonMaterial({ color: 0x49823b })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.6, 0.05, 0.6)
        }), new PhysicsObject(world, {
            position: { x: -6.5, y: 0, z: -31.6 },
            rotation: { x: 0, y: Math.PI/6, z: 0 },
            mesh: new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.1, 0.9), new THREE.MeshToonMaterial({ color: 0x2b5c1f })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(0.45, 0.05, 0.45)
        }),
    ]);

    // Clouds
    for (let x = -CLOUDGEN_RAD; x <= CLOUDGEN_RAD; x += CLOUDGEN_STRIDE) {
        for (let z = -CLOUDGEN_RAD; z <= CLOUDGEN_RAD; z += CLOUDGEN_STRIDE) {
            const offsetX = (Math.random() * CLOUDGEN_STRIDE) - CLOUDGEN_STRIDE/2;
            const offsetZ = (Math.random() * CLOUDGEN_STRIDE) - CLOUDGEN_STRIDE/2;
            const offsetY = (Math.random() * 30) - 15;
            objects.push(new PhysicsObject(world, {
                position: {
                    x: x+offsetX,
                    y: CLOUDGEN_BASE_Y+offsetY,
                    z: z+offsetZ
                },
                mesh: new THREE.Mesh(
                    new THREE.BoxGeometry(
                        5 + (Math.random() * 25),
                        2 + (Math.random() * 5),
                        5 + (Math.random() * 25)
                    ),
                    new THREE.MeshMatcapMaterial({ color: 0xffffff, transparent: true, opacity: 0.4 + (Math.random() * 0.3), depthWrite: false }),
                ),
                colliderDesc: RAPIER.ColliderDesc.cuboid(-0.1, -0.1, -0.1),
                onTick: function() { cloudOnTick(this, 0.02 + (Math.random() * 0.05)); }
            }));
        }
    }

    // Ambient light
    objects.push(new LightObject(world, {
        colliderDesc: RAPIER.ColliderDesc.cuboid(-0.1, -0.1, -0.1),
        light: new THREE.AmbientLight(0xffffff, 0.05)
    }));

    // Hemisphere light
    const hemisphereLight = new THREE.HemisphereLight(0x455d75, 0xffc87a, 0.3);
    const hemiObject = new LightObject(world, {
        position: { x: 0, y: 30, z: 0 },
        colliderDesc: RAPIER.ColliderDesc.cuboid(-0.1, -0.1, -0.1),
        light: hemisphereLight
    });

    // Sun
    const sunLight = new THREE.DirectionalLight(0xffecb3, 0.9);
    sunLight.shadow.camera.left = -200;
    sunLight.shadow.camera.right = 200;
    sunLight.shadow.camera.top = 200;
    sunLight.shadow.camera.bottom = -200;
    sunLight.shadow.camera.near = 1;
    sunLight.shadow.camera.far = 600;
    sunLight.shadow.mapSize.width = DIRECTIONAL_LIGHT_SHADOW_QUALITY;
    sunLight.shadow.mapSize.height = DIRECTIONAL_LIGHT_SHADOW_QUALITY;
    const sunObject = new LightObject(world, {
        position: SUN_INIT_POSITION,
        mesh: new THREE.Mesh(new THREE.CapsuleGeometry(30, 0), new THREE.MeshBasicMaterial({ color: 0xffdd75, transparent: true, opacity: 1.0 })),
        colliderDesc: RAPIER.ColliderDesc.cuboid(-0.1, -0.1, -0.1),
        light: sunLight,
        lightCastShadow: true
    });

    // Moon
    const moonLight = new THREE.DirectionalLight(0xffffff, 0.1);
    moonLight.shadow.camera.left = -200;
    moonLight.shadow.camera.right = 200;
    moonLight.shadow.camera.top = 200;
    moonLight.shadow.camera.bottom = -200;
    moonLight.shadow.camera.near = 1;
    moonLight.shadow.camera.far = 600;
    moonLight.shadow.mapSize.width = DIRECTIONAL_LIGHT_SHADOW_QUALITY;
    moonLight.shadow.mapSize.height = DIRECTIONAL_LIGHT_SHADOW_QUALITY;
    const moonObject = new LightObject(world, {
        position: { x: 200, y: -SUN_INIT_POSITION.y, z: -SUN_INIT_POSITION.z },
        mesh: new THREE.Mesh(new THREE.CapsuleGeometry(10, 0), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1.0 })),
        colliderDesc: RAPIER.ColliderDesc.cuboid(-0.1, -0.1, -0.1),
        light: moonLight,
        lightCastShadow: true,
        // FUTURE: Day/night cycle class so that we don't do the following:
        onTick: function() { dayNightOnTick(sunObject, this, hemiObject); }
    });

    objects.push(...[sunObject, moonObject, hemiObject]);

    // Outdoor lamps
    const lampSeeds = Array.from({ length: 5 }, () => Math.random());
    objects.push(...[
        new PhysicsObject(world, { // model+hitbox
            castShadow: false,
            position: { x: 13.3, y: 4.25, z: -13.7 },
            scale: { x: 0.1, y: 0.1, z: 0.1 },
            mesh: streetlamp1Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.capsule(0.35, 0.05),
        }), new LightObject(world, { // light
            position: { x: 13.3, y: 7.25, z: -13.7 },
            mesh: new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 1), new THREE.MeshToonMaterial({ color: 0xffb566 , transparent: true, opacity: 0.8 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(-0.1, -0.1, -0.1),
            light: new THREE.PointLight(0xffb566, 20),
            lightCastShadow: true,
            onTick: function() { streetLampOnTick(sunObject, this, lampSeeds[0]); }
        }), new PhysicsObject(world, { // model+hitbox
            castShadow: false,
            position: { x: 6.3, y: 4.25, z: 19.2 },
            scale: { x: 0.1, y: 0.1, z: 0.1 },
            mesh: streetlamp1Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.capsule(0.35, 0.05),
        }), new LightObject(world, { // light
            position: { x: 6.3, y: 7.25, z: 19.2 },
            mesh: new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 1), new THREE.MeshToonMaterial({ color: 0xffb566 , transparent: true, opacity: 0.8 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(-0.1, -0.1, -0.1),
            light: new THREE.PointLight(0xffb566, 20),
            lightCastShadow: true,
            onTick: function() { streetLampOnTick(sunObject, this, lampSeeds[1]); }
        }), new PhysicsObject(world, { // model+hitbox
            castShadow: false,
            position: { x: -19.8, y: 4.25, z: -33 },
            scale: { x: 0.1, y: 0.1, z: 0.1 },
            mesh: streetlamp1Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.capsule(0.35, 0.05),
        }), new LightObject(world, { // light
            position: { x: -19.8, y: 7.25, z: -33 },
            mesh: new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 1), new THREE.MeshToonMaterial({ color: 0xffb566 , transparent: true, opacity: 0.8 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(-0.1, -0.1, -0.1),
            light: new THREE.PointLight(0xffb566, 20),
            lightCastShadow: true,
            onTick: function() { streetLampOnTick(sunObject, this, lampSeeds[2]); }
        }), new PhysicsObject(world, { // model+hitbox
            castShadow: false,
            position: { x: 33.5, y: 4.25, z: -7.6 },
            scale: { x: 0.1, y: 0.1, z: 0.1 },
            mesh: streetlamp1Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.capsule(0.35, 0.05),
        }), new LightObject(world, { // light
            position: { x: 33.5, y: 7.25, z: -7.6 },
            mesh: new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 1), new THREE.MeshToonMaterial({ color: 0xffb566 , transparent: true, opacity: 0.8 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(-0.1, -0.1, -0.1),
            light: new THREE.PointLight(0xffb566, 20),
            lightCastShadow: true,
            onTick: function() { streetLampOnTick(sunObject, this, lampSeeds[3]); }
        }), new PhysicsObject(world, { // model+hitbox
            castShadow: false,
            position: { x: -8, y: 4.25, z: 40.95 },
            scale: { x: 0.1, y: 0.1, z: 0.1 },
            mesh: streetlamp1Mesh.clone(),
            colliderDesc: RAPIER.ColliderDesc.capsule(0.35, 0.05),
        }), new LightObject(world, { // light
            position: { x: -8, y: 7.25, z: 40.95 },
            mesh: new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 1), new THREE.MeshToonMaterial({ color: 0xffb566 , transparent: true, opacity: 0.8 })),
            colliderDesc: RAPIER.ColliderDesc.cuboid(-0.1, -0.1, -0.1),
            light: new THREE.PointLight(0xffb566, 20),
            lightCastShadow: true,
            onTick: function() { streetLampOnTick(sunObject, this, lampSeeds[4]); }
        }),
    ]);

    // Center lines
    if (DEBUG_COLLIDERS) {
        objects.push(...[new PhysicsObject(world, {
            mesh: new THREE.Mesh(new THREE.PlaneGeometry(100, 2), new THREE.MeshBasicMaterial({ color: 0xff0000, side: THREE.DoubleSide })),
        }), new PhysicsObject(world, {
            rotation: { x: 0, y: Math.PI/2, z: 0 },
            mesh: new THREE.Mesh(new THREE.PlaneGeometry(100, 2), new THREE.MeshBasicMaterial({ color: 0xff0000, side: THREE.DoubleSide })),
        })]);
    }

    // Add objects
    for (const object of objects) {
        world.objects.add(object);
    }
}

//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\////\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//
//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\////\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//
