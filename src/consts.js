// FUTURE: params/settings class since we want to be able to dynamically change some of these

export const DEBUG = true;

export const FPS = 45; // TODO: 60
const speedScale = 60 / FPS;

export const SHADOW_QUALITY = 8192;

export const GRAVITY = { x: 0.0, y: -10.0, z: 0.0 };

export const JUMP_FORCE = 10; // TODO: 5;
export const MOVE_SPEED = 12; // TODO: 4;
export const ROTATION_SPEED = speedScale * 0.04;

export const CAMERA_FOV = 60;
export const CAMERA_MAX_DISTANCE = 1118; // TODO: 5;

export const JUMP_RAY_DISTANCE = 1.2;

export const SPAWN_POSITION = { x: -40, y: 2, z: -12 }; // TODO: { x: -46, y: 10, z: -36 };
export const INIT_CHARACTER_ROTATION = Math.PI/2;
export const INIT_CAMERA_POSITION = { x: -60, y: 8, z: -36 }; // TODO: { x: -60, y: 8, z: -36 };

export const CLOUDGEN_STRIDE = 40;
export const CLOUDGEN_RAD = 120;
export const CLOUDGEN_BASE_Y = 100;

export const SUN_INIT_POSITION = { x: 200, y: -300, z: -300 }; // TODO: { x: 200, y: 300, z: 300 };
export const SUN_TICK_ROTATION = 0.02; // TODO: 0.0002;
