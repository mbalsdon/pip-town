import * as THREE from 'three';
import { PhysicsObject } from './PhysicsObject';
import { BufferGeometryUtils } from 'three/examples/jsm/Addons.js';
import { DISPLAYNAME_FROG_PIP, DISPLAYNAME_GRANDMA, DISPLAYNAME_GRANDPA, DISPLAYNAME_TOWN_GREETER } from '../consts';

//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\////\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//
//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\////\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//

export class NonPlayableCharacter extends PhysicsObject {
    constructor(world, player, {
        position = { x: 0, y: 0, z: 0 },
        rotation = { x: 0, y: 0, z: 0 },
        scale = { x: 1, y: 1, z: 1 },
        mesh = null,
        colliderDesc = null,
        colliderProps = { friction: 1, restitution: 0.2, density: 1 },
        interactionRadius = 3,
        displayName = null,
        imagePath = null,
        dialogueList = [],
        externalState = null,
        onTick = null
    }) {
        if (mesh === null)
            throw new Error("NonPlayableCharacter::constructor - mesh cannot be null");
        if (colliderDesc === null)
            throw new Error("NonPlayableCharacter::constructor - colliderDesc cannot be null");
        if (displayName === null)
            throw new Error("NonPlayableCharacter::constructor - displayName cannot be null");
        if (imagePath === null)
            throw new Error("NonPlayableCharacter::constructor - imagePath cannot be null");
        if (dialogueList.length <= 0)
            throw new Error("NonPlayableCharacter::constructor - dialogueList cannot be empty");

        super(world, {
            isStatic: false,
            position,
            rotation,
            scale,
            mesh,
            colliderDesc,
            colliderProps,
            onTick,
            isCameraCollidable: false,
        });

        this._position = new THREE.Vector3();
        this._spawnPosition = position;

        this._interactionDirection = new THREE.Vector2();
        this._interactionQuaternion = new THREE.Quaternion();
        this._interactionOffset = new THREE.Vector3(0, 1, 0);
        this._yAxis = new THREE.Vector3(0, 1, 0);

        this._outlineMesh = new THREE.Mesh(
            this.mesh.geometry.clone(),
            new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.BackSide })
        );
        this._outlineMesh.scale.multiplyScalar(1.03);
        this.mesh.add(this._outlineMesh);

        this._dialogueIdx = 0;

        this._player = player;
        this._interactionRadius = interactionRadius;
        this._displayName = displayName;
        this._imagePath = imagePath;
        this._dialogueList = dialogueList;
        this._externalState = externalState;
    }

    // FUTURE: quests
    // _createMarkerMesh() {
    //     const botGeom = new THREE.BoxGeometry(0.15, 0.15, 0.15);
    //     botGeom.rotateY(Math.PI/4);
        
    //     const topGeom = new THREE.BoxGeometry(0.15, 0.6, 0.15);
    //     topGeom.translate(0, 0.47, 0);
    //     topGeom.rotateY(Math.PI/4);

    //     return new THREE.Mesh(
    //         BufferGeometryUtils.mergeGeometries([botGeom, topGeom]),
    //         new THREE.MeshBasicMaterial({ color: 0xffd52b, transparent: true, opacity: 0.9 })
    //     );
    // }

    hasMoreDialogue() { return this._dialogueIdx <= this._dialogueList.length - 1; }

    interact() {
        this._player.keys.e = false;

        if (!this.hasMoreDialogue()) return;

        // Begin dialogue
        this.world.dialogue.begin(this._dialogueList[this._dialogueIdx], this._imagePath, this._displayName);
        this._dialogueIdx++;

        // Stand NPC upright facing camera, null any velocities
        this.rigidBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
        this.rigidBody.setAngvel({ x: 0, y: 0, z: 0 }, true);
        this.rigidBody.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true);

        // Face NPC towards player
        this._interactionDirection.x = this._player.position.x - this._position.x;
        this._interactionDirection.z = this._player.position.z - this._position.z;
        this._interactionDirection.normalize();

        const angle = Math.atan2(this._interactionDirection.x, this._interactionDirection.z);

        this._interactionQuaternion.setFromAxisAngle(this._yAxis, angle);
        this.rigidBody.setRotation({
            x: 0,
            y: this._interactionQuaternion.y,
            z: 0,
            w: this._interactionQuaternion.w
        }, true);

        // Focus camera onto NPC
        this._interactionOffset.applyQuaternion(this._interactionQuaternion);
        this.world.camera.position.set(
            this._player.position.x + this._interactionOffset.x,
            this._player.position.y + this._interactionOffset.y,
            this._player.position.z + this._interactionOffset.z
        );
        this.world.camera.lookAt(this._position);

        // Special dialogue events
        if ((this._displayName === DISPLAYNAME_TOWN_GREETER) && (this._dialogueIdx === 5)) {
            setTimeout(() => { this._townGreeterEvent(); }, 3000);
        } else if ((this._displayName === DISPLAYNAME_GRANDPA) && (this._dialogueIdx === 1)) {
            setTimeout(() => { this._externalState.on = true; }, 1000);
        } else if ((this._displayName === DISPLAYNAME_GRANDMA) && (this._dialogueIdx === 2)) {
            setTimeout(() => { this._grandmaEvent(); }, 1000);
        } else if ((this._displayName === DISPLAYNAME_FROG_PIP) && (this._dialogueIdx === 3)) {
            this._frogEvent();
        }
    }

    _townGreeterEvent() {
        this.rigidBody.setLinvel({ x: 1, y: 0, z: 0 }, true);
        this.rigidBody.setAngvel({ x: 2, y: 2, z: 0 }, true);
    }

    _grandmaEvent() {
        this.collider.setRestitution(1);
        this.collider.setFriction(0);
        this.collider.setRestitutionCombineRule(3);
        this.collider.setDensity(500);
        this.rigidBody.setLinvel({ x: -15, y: 5, z: 15 }, true);
        this.rigidBody.setAngvel({ x: 10, y: 10, z: 10 }, true);
    }

    _frogEvent(){
        this.collider.setRestitutionCombineRule(3);
        this.rigidBody.setLinvel({ x: 0, y: 5, z: 3 }, true);
    }

    update() {
        const p = this.rigidBody.translation();
        this._position.set(p.x, p.y, p.z);

        // Out-of-bounds check
        if (this._position.y < -50.0) {
            this.rigidBody.setTranslation(this._spawnPosition, true);
            this.rigidBody.setLinvel({x: 0, y: 0, z: 0 }, true);
            this.rigidBody.setAngvel({ x: 0, y: 0, z: 0 }, true);
            return;
        }

        // Check if player is within range of NPC
        const dx = this._position.x - this._player.position.x;
        const dy = this._position.y - this._player.position.y;
        const dz = this._position.z - this._player.position.z;
        const withinInteractionRange = (dx*dx + dy*dy + dz*dz) <= (this._interactionRadius*this._interactionRadius);

        this._outlineMesh.visible = (withinInteractionRange && !this.world.dialogue.isActive)

        // Interaction
        if (withinInteractionRange && this._player.keys.e) {
            this.interact();
        }

        // Parent class
        super.update();
    }
}

//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\////\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//
//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\////\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//
