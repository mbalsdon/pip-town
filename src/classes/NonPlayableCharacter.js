import * as THREE from 'three';
import { PhysicsObject } from './PhysicsObject';
import { DISPLAYNAME_ASTRO_PIP, DISPLAYNAME_FARMHAND_PIP_2, DISPLAYNAME_FLOWER_PIP, DISPLAYNAME_FRISBEE, DISPLAYNAME_FROG_PIP, DISPLAYNAME_GRANDMA, DISPLAYNAME_GRANDPA, DISPLAYNAME_KURT_1, DISPLAYNAME_KURT_2, DISPLAYNAME_KURT_3, DISPLAYNAME_KURT_4, DISPLAYNAME_KURT_5, DISPLAYNAME_KURT_6, DISPLAYNAME_MR_NOODLE, DISPLAYNAME_RATHEW, DISPLAYNAME_SEALIAM, DISPLAYNAME_SLEEPY_PIP, DISPLAYNAME_SUBARU, DISPLAYNAME_TOWN_GREETER } from '../consts';
import RAPIER from '@dimforge/rapier3d-compat';

//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//
//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//

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

        this._player._prevCamPos.copy(this.world.camera.position);
        this._player._prevCamTarget.copy(this.world.controls.target);

        // Special dialogue event preambles
        if ((this._displayName === DISPLAYNAME_MR_NOODLE) && (this._dialogueIdx !== 0)) {
            this._mrNoodleEvent2();
        }

        // Begin dialogue
        this.world.dialogue.begin(this._dialogueList[this._dialogueIdx], this._imagePath, this._displayName);
        this._dialogueIdx++;

        const maintainPos = (
            this._displayName === DISPLAYNAME_SLEEPY_PIP ||
            this._displayName === DISPLAYNAME_MR_NOODLE ||
            this._displayName === DISPLAYNAME_SEALIAM
        );

        if (!maintainPos) {
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
        }

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
            this._townGreeterEvent();
        } else if ((this._displayName === DISPLAYNAME_GRANDPA) && (this._dialogueIdx === 1)) {
            this._grandpaEvent();
        } else if ((this._displayName === DISPLAYNAME_GRANDMA) && (this._dialogueIdx === 2)) {
            this._grandmaEvent();
        } else if ((this._displayName === DISPLAYNAME_FROG_PIP) && (this._dialogueIdx === 3)) {
            this._frogEvent();
        } else if ((this._displayName === DISPLAYNAME_FLOWER_PIP) && (this._dialogueIdx === 3)) {
            this._flowerEvent();
        } else if ((this._displayName === DISPLAYNAME_SLEEPY_PIP) && (this._dialogueIdx === 3)) {
            this._sleepyEvent();
        } else if ((this._displayName === DISPLAYNAME_FARMHAND_PIP_2) && ( this._dialogueIdx === 9)) {
            this._farmhand2Event();
        } else if ((this._displayName === DISPLAYNAME_KURT_1) && (this._dialogueIdx === 2)) {
            this._kurt1Event();
        } else if ((this._displayName === DISPLAYNAME_KURT_2) && (this._dialogueIdx === 12)) {
            this._kurt2Event();
        } else if ((this._displayName === DISPLAYNAME_KURT_3) && (this._dialogueIdx === 2)) {
            this._kurt3Event();
        } else if ((this._displayName === DISPLAYNAME_KURT_4) && (this._dialogueIdx === 3)) {
            this._kurt4Event();
        } else if ((this._displayName === DISPLAYNAME_KURT_5) && (this._dialogueIdx === 1)) {
            this._kurt5Event();
        } else if ((this._displayName === DISPLAYNAME_KURT_6) && (this._dialogueIdx === 3)) {
            this._kurt6Event();
        } else if ((this._displayName === DISPLAYNAME_FRISBEE) && (this._dialogueIdx === 1)) {
            this._frisbeeEvent();
        } else if ((this._displayName === DISPLAYNAME_SUBARU) && (this._dialogueIdx === 2)) {
            this._subaruEvent();
        } else if ((this._displayName === DISPLAYNAME_MR_NOODLE) && (this._dialogueIdx === 1)) {
            this._mrNoodleEvent1();
        } else if ((this._displayName === DISPLAYNAME_RATHEW) && (this._dialogueIdx === 6)) {
            this._rathewEvent();
        } else if ((this._displayName === DISPLAYNAME_SEALIAM) && (this._dialogueIdx === 1)) {
            this._sealiamEvent();
        } else if ((this._displayName === DISPLAYNAME_ASTRO_PIP) && (this._dialogueIdx === 5)) {
            this._astroEvent();
        }
    }

    _townGreeterEvent() {
        setTimeout(() => {
            this.rigidBody.setLinvel({ x: 1, y: 0, z: 0 }, true);
            this.rigidBody.setAngvel({ x: 2, y: 2, z: 0 }, true);
        }, 2500);
    }

    _grandpaEvent() {
        setTimeout(() => {
            this._externalState.on = true;
        }, 1000);
    }

    _grandmaEvent() {
        setTimeout(() => {
            this.rigidBody.setGravityScale(0.0);
            this.collider.setRestitution(1);
            this.collider.setFriction(0);
            this.collider.setRestitutionCombineRule(3);
            this.collider.setDensity(500);
            this.rigidBody.setLinvel({ x: -15, y: 5, z: 15 }, true);
            this.rigidBody.setAngvel({ x: 10, y: 10, z: 10 }, true);
        }, 1500);
    }

    _frogEvent() {
        this.collider.setRestitutionCombineRule(3);
        this.rigidBody.setLinvel({ x: 0, y: 5, z: 3 }, true);
    }

    _flowerEvent() {
        this._dialogueIdx -= 1;

        const idx = Math.floor(Math.random() * 3);
        this.world.objects.add(new PhysicsObject(this.world, {
            isStatic: false,
            position: { x: this._player.position.x, y: this._player.position.y + 2.5, z: this._player.position.z },
            rotation: { x: Math.PI * Math.random(), y: Math.PI * Math.random(), z: Math.PI * Math.random() },
            scale: { x: 0.03, y: 0.03, z: 0.03 },
            mesh: new THREE.Mesh(this._externalState[idx].geometry.clone(), this._externalState[idx].material.clone()),
            colliderDesc: RAPIER.ColliderDesc.capsule(0.004, 0.003),
            colliderProps: { friction: 0.5, restitution: 0.1, density: 0.1 }
        }));
    }

    _sleepyEvent() {
        for (let i = 0; i < 50; ++i) {
            setTimeout(() => {
                this.rigidBody.setLinvel({
                    x: (Math.random() * 20) - 10,
                    y: (Math.random() * 2),
                    z: (Math.random() * 20) - 10
                }, true);
                this.rigidBody.setAngvel({
                    x: Math.PI * Math.random(),
                    y: Math.PI * Math.random(),
                    z: Math.PI * Math.random(),
                }, true);
            }, i * 100);
        }
    }

    _farmhand2Event() {
        setTimeout(() => {
            if (this.world.dialogue.isActive) this.world.dialogue.continue();
            this._player.collider.setDensity(10000);
            this._player.rigidBody.applyImpulse({ x: -500, y: 250, z: 500 }, true);
            setTimeout(() => { this._player.collider.setDensity(1); }, 150);
        }, 1500);
    }

    _kurt1Event() {
        setTimeout(() => {
            this.rigidBody.setGravityScale(0.0);
            this.rigidBody.setLinvel({ x: -20, y: 20, z: -25 }, true);
        }, 500);
    }

    _kurt2Event() {
        setTimeout(() => {
            this.rigidBody.setGravityScale(0.0);
            this.rigidBody.setLinvel({ x: -35, y: 35, z: -35 }, true);
        }, 500);
    }

    _kurt3Event() {
        setTimeout(() => {
            this.rigidBody.setGravityScale(0.0);
            this.rigidBody.setLinvel({ x: 10, y: 5, z: 15 }, true);
        }, 500);
    }

    _kurt4Event() {
        setTimeout(() => {
            this.rigidBody.setGravityScale(0.0);
            this.rigidBody.setLinvel({ x: -10, y: 3, z: 0 }, true);
        }, 500);
    }

    _kurt5Event() {
        setTimeout(() => {
            this.rigidBody.setGravityScale(0.0);
            this.rigidBody.setLinvel({ x: -5, y: 3, z: -3 }, true);
        }, 500);
    }

    _kurt6Event() {
        setTimeout(() => {
            this.rigidBody.setGravityScale(0.0);
            this.rigidBody.setLinvel({ x: -10, y: 7, z: 10 }, true);
        }, 500);
    }

    _frisbeeEvent() {
        this._interactionRadius = 0;
    }

    _subaruEvent() {
        this._player._onTick = function() {
            const color = [0x4ea13b, 0x92eb7a, 0x335c28, 0x6b7d24, 0x99a811][Math.floor(Math.random() * 5)];
            const stinkMesh = new THREE.Mesh(
                new THREE.BoxGeometry(
                    0.5 + Math.random(),
                    0.5 + Math.random(),
                    0.5 + Math.random()
                ),
                new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.1 + Math.random() * 0.2 })
            );
            stinkMesh.position.set(
                this.position.x - 0.25 + Math.random() * 0.5,
                this.position.y - 0.25 + Math.random() * 0.5,
                this.position.z - 0.25 + Math.random() * 0.5
            );
            stinkMesh.rotation.set(
                Math.PI * Math.random(),
                Math.PI * Math.random(),
                Math.PI * Math.random()
            );
            this.world.scene.add(stinkMesh);
            setTimeout(() => {
                stinkMesh.geometry.dispose();
                stinkMesh.material.dispose();
                this.world.scene.remove(stinkMesh);
            }, 600 + Math.random() * 200);
        }
    }

    _mrNoodleEvent1() {
        this.collider.setDensity(5);
    }

    _mrNoodleEvent2() {
        this._dialogueIdx = (this._sufficientlyMoved ? 2 : 1);
    }

    _rathewEvent() {
        this.rigidBody.setLinvel({ x: -3, y: 2, z: 2 }, true);
        this.rigidBody.setAngvel({ x: -13, y: 12, z: 0 }, true);
    }

    _sealiamEvent() {
        this._dialogueIdx -= 1;
        if (this._onTick === null) {
            this._onTick = function() {
                if (Math.random() <= 0.02) {
                    this.rigidBody.setLinvel({
                        x: (8 * Math.random()) - 6,
                        y: 0,
                        z: (8 * Math.random()) - 6
                    }, true);
                }
            }
        }
    }

    _astroEvent() {
        this.rigidBody.setGravityScale(0);
        this.rigidBody.setAngvel({ x: 0, y: 20, z: 0 }, true);

        setTimeout(() => {
            this.rigidBody.setLinvel({ x: -1, y: 4, z: -1 }, true);
            this._onTick = function() {
                const color = [0xffcc00, 0xff9742, 0xff5842, 0xa38f84][Math.floor(Math.random() * 4)];
                const rocketTrailMesh = new THREE.Mesh(
                    new THREE.SphereGeometry(0.25 + Math.random() * 0.5),
                    new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.25 + Math.random() * 0.25})
                );
                rocketTrailMesh.position.set(
                    this._position.x - 0.25 + Math.random() * 0.5,
                    this._position.y - 0.75,
                    this._position.z - 0.25 + Math.random() * 0.5
                );
                this.world.scene.add(rocketTrailMesh);
                setTimeout(() => {
                    rocketTrailMesh.geometry.dispose();
                    rocketTrailMesh.material.dispose();
                    this.world.scene.remove(rocketTrailMesh);
                }, 1200 + Math.random() * 200);
            }
        }, 1500);
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

        this._outlineMesh.visible = (withinInteractionRange && !this.world.dialogue.isActive);

        // Interaction
        if (withinInteractionRange && this._player.keys.e) {
            this.interact();
        }

        // Return camera to pre-interaction position if needed
        if (this._fixCamera && !this.world.dialogue.isActive) {
            this.world.camera.position.copy(this._player._prevCamPos);
            this.world.controls.target.copy(this._player._prevCamTarget);
            this.world.controls.update();
        }
        this._fixCamera = this.world.dialogue.isActive;

        // Parent class
        super.update();
    }
}

//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//
//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//
