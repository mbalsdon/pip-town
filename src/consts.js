// FUTURE: params/settings class since we want to be able to dynamically change some of these

export const DEBUG = true;
export const DEBUG_COLLIDERS = false;
export const DEBUG_PLAYER_MODEL = false;
export const CAMERA_COLLISION_ON = true;

export const MAX_FPS = 60;
export const MAX_TIMESTEP = 1/10;

export const DIRECTIONAL_LIGHT_SHADOW_QUALITY = 8192;

export const GRAVITY = { x: 0.0, y: -10.0, z: 0.0 };

export const JUMP_FORCE = 5;
export const MOVE_SPEED = 5;
export const ROTATION_SPEED = 2.4;

export const CAMERA_Y_OFFSET = 0.85;
export const CAMERA_FOV = 60
export const CAMERA_MIN_DISTANCE = 1;
export const CAMERA_MAX_DISTANCE = 5;
export const CAMERA_SMOOTHING_FACTOR = 0.25;
export const CAMERA_COLLISION_OFFSET = 0.5;
export const LAYER_CAMERA_COLLISION = 1;

export const JUMP_RAY_DISTANCE = 1.2;

export const SPAWN_POSITION = { x: -30, y: 2, z: 11 }; // TODO: { x: -46, y: 10, z: -36 };
export const INIT_CAMERA_POSITION = { x: -60, y: 8, z: -36 };
export const INIT_CHARACTER_ROTATION = Math.PI/2;

export const CLOUDGEN_STRIDE = 40;
export const CLOUDGEN_RAD = 120;
export const CLOUDGEN_BASE_Y = 100;

export const SUN_INIT_POSITION = { x: 200, y: 300, z: 300 };
export const SUN_TICK_ROTATION = 0.0002;

export const DIALOGUE_SPEED_NUM_CHARS = 2;

export const DISPLAYNAME_TOWN_GREETER = "Town Greeter Pip";
export const DISPLAYNAME_GRANDPA = "Grandpa Pip";
export const DISPLAYNAME_GRANDMA = "Grandma Pip";
export const DISPLAYNAME_LITTLE_PIP = "Little Pip";
export const DISPLAYNAME_FROG_PIP = "Frog Pip";
