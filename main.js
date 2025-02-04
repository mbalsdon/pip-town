import * as THREE from 'three';
import * as RAPIER from '@dimforge/rapier3d-compat';
import { World } from './src/classes/World';
import { populateWorldObjects } from './src/scripts/populate_world_objects';
import { DEBUG } from './src/consts';

//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\////\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//
//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\////\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//

// Init libraries
await RAPIER.init();

// Init world
const world = new World();

// Add objects to world
await populateWorldObjects(world);

// Lights (TODO: class) ------------------------------------------------
const ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
world.scene.add(ambientLight);

// const tmpPointLight = new THREE.PointLight(0xffffaa, 10, 100);
// tmpPointLight.position.set(0,2,5);
// world.scene.add(tmpPointLight);
// if (DEBUG) world.scene.add(new THREE.PointLightHelper(tmpPointLight));

const tmpHemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.5);
tmpHemiLight.position.set(0,10,0);
world.scene.add(tmpHemiLight);
if (DEBUG) world.scene.add(new THREE.HemisphereLightHelper(tmpHemiLight));

const sunLight = new THREE.DirectionalLight(0xffffaa, 0.5);
sunLight.position.set(50, 80, 50);
sunLight.castShadow = true;
sunLight.shadow.camera.left = -70;
sunLight.shadow.camera.right = 70;
sunLight.shadow.camera.top = 70;
sunLight.shadow.camera.bottom = -70;
sunLight.shadow.camera.near = 1;
sunLight.shadow.camera.far = 200;
sunLight.shadow.mapSize.width = 1024;
sunLight.shadow.mapSize.height = 1024;
world.scene.add(sunLight);
if (DEBUG) {
    world.scene.add(new THREE.CameraHelper(sunLight.shadow.camera));
    world.scene.add(new THREE.DirectionalLightHelper(sunLight));
}
// ----------------------------------------------------------------------

// Begin gameplay loop
function animate(currentTime) {
    requestAnimationFrame(animate);
    world.update(currentTime);
}

animate();

//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\////\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//
//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\////\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//

/** TODO
 * * build out the world
 * * * pip town
 * * * * see map
 * * * * place paths, with house as reference size
 * *
 * * * matt pip & veron pip
 * * * lighting
 * * * skybox
 * * * sun obj (square panel?)
 * * * give grass texture ground a try instead of objs
 *
 * * interaction system
 * * * press E when near enough
 * * * options:
 * * * * 1. (?) combination of CanvasTexture and gyro
 * * * * 2. speech bubble overlay (html) appears with A. cahracter name B. 2d character image C. text
 *
 * * settings menu (fps, render distance)
 * * possible to have camera not go through objects (i.e. ground)?
 * * better hitboxes (convexhull? or just cuboid?)
 *
 * * polish
 * * * moving pips? give them velocities in a loop
 * * * * pushing them would fk their path up, but maybe it would be funny to let that happen
 * * * dynamic objects that fall off the map either A) despawn or B) respawn at their startpos
 * * * more pips
 * * * bob
 * * * day/night mode
 * * * more world building
 * * * when npcs fall over they say ow
 * * * remove small parts of models and add them in as dynamics
 *
 *
 *
 * * ideas
 * * * ragdoll player physics
 * * * * unlock XZ rotations, reset them to 0 if fall over (check in update)
 * * * cannon shoot a pip
 * * * something with dynamic bodies
 * * * * button that spawns pips
 * * * crash land alien pip
 * * * look into applied forces; powerup(?) that applies big force to dynamics that player comes in contact with 
 * * * minimap: orthographic view top down, map x/y to it??
 * 
 * * clean up the code dipshit
 */