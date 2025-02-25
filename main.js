import * as RAPIER from '@dimforge/rapier3d-compat';
import { World } from './src/classes/World';
import { populateWorldObjects } from './src/scripts/populate_world_objects';
import { register_controls_helper } from './src/scripts/register_controls_helper';

//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//
//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//

(async function() {
    // Init libraries
    await RAPIER.init();

    // Init world
    const world = new World();

    // Add objects to world
    await populateWorldObjects(world);

    setTimeout(register_controls_helper, 2000);

    // Begin gameplay loop
    function animate(currentTime) {
        requestAnimationFrame(animate);
        world.update(currentTime);
    }

    animate();
})();

//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//
//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//

/** TODO
 * * ctrlF todo
 * * phone support
 * * windmill + animals behind farmland
 * * look for optimizations
 * * music
 * * sound fx
 * * * small random sound for each dialogue char
 * * predetermined npc paths
 * * dynamic objects that fall off the map either A) despawn or B) respawn at their startpos
 * * more pips
 * * more world building
 * * when npcs fall over they say ow
 * * river pushes you
 * * house_2 quest: furnish the house by pushing in other pips furniture
 * * * pickupable objects, quest system
 * * bridges
 * * stars (fade in/out)
 * * settings menu (fps, render distance, etc.)
 *
 * * ideas
 * * * ragdoll player physics (unlock XZ rotations)
 * * * cannon shoot a pip
 * * * something with dynamic bodies
 * * * * button that spawns pips
 * * * crash land alien pip
 * * * look into applied forces; powerup(?) that applies big force to dynamics that player comes in contact with
 * * * minimap: orthographic view top down, map x/y to it??
 */