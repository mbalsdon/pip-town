export const DEBUG = true;

export const FPS = 30;
const speedScale = 60 / FPS;

export const OBJ_PIP = {
    scaleFactor: 0.1,
    hitbox: {
        dim: { hy: 0.0, r: 0.8 },
        pos: { x: 0.0, y: -0.1, z: 0.0 }
    }
};

export const JUMP_FORCE = 10; // TODO: 5
export const MOVE_SPEED = 12; // TODO: 4
export const ROTATION_SPEED = speedScale * 0.08; // TODO: 0.04
export const JUMP_RAY_DISTANCE = 0.5;

export const SPAWN_POSITION = { x: 0, y: 10, z: 0 };
