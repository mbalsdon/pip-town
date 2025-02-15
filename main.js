import * as RAPIER from '@dimforge/rapier3d-compat';
import { World } from './src/classes/World';
import { populateWorldObjects } from './src/scripts/populate_world_objects';

//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\////\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//
//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\////\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//

// Init libraries
await RAPIER.init();

// Init world
const world = new World();

// Add objects to world
await populateWorldObjects(world);

// Begin gameplay loop
function animate(currentTime) {
    requestAnimationFrame(animate);
    world.update(currentTime);
}

animate();

//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\////\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//
//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\////\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//

/** TODO
 * * lighting (streetlamps, inside house lights, ambient)
 * * allow null geom/mat/colliders
 * * camera fix (ITS ALWAYS RAYCASTING)
 * * matt pip, veron pip, bob, frog pip on lilypad, general pips...
 * * farmhouse, stables
 * * interaction system
 * * * press E when near enough (arrow or doing math w/ obj coords relative to player)
 * * * options:
 * * * * 1. (?) combination of CanvasTexture and gyro
 * * * * 2. speech bubble overlay (html) appears with A. cahracter name B. 2d character image C. text
 * * music
 * * sound fx
 * * moving pips? give them velocities in a loop
 * * * pushing them would fk their path up, but maybe it would be funny to let that happen
 * * dynamic objects that fall off the map either A) despawn or B) respawn at their startpos
 * * more pips
 * * more world building
 * * when npcs fall over they say ow
 * * remove small parts of models and add them in as dynamics
 * * river pushes you
 * * house_2 quest: furnish the house by pushing in other pips furniture
 * * bridges
 * * stars (fade in/out)
 * * settings menu (fps, render distance)
 * * better hitboxes (convexhull? or just cuboid?)
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
 */