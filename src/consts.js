// FUTURE: params/settings class since we want to be able to dynamically change some of these

export const DEBUG = true;
export const DEBUG_COLLIDERS = false;
export const DEBUG_PLAYER_MODEL = false;
export const CAMERA_COLLISION_ON = false;

export const MAX_FPS = 60;
export const MAX_TIMESTEP = 1/10;

export const DIRECTIONAL_LIGHT_SHADOW_QUALITY = 8192;

export const GRAVITY = { x: 0.0, y: -10.0, z: 0.0 };

export const JUMP_FORCE = 10; // TODO: 5
export const MOVE_SPEED = 10; // TODO: 5
export const ROTATION_SPEED = 2.4;

export const CAMERA_Y_OFFSET = 0.85;
export const CAMERA_FOV = 60
export const CAMERA_MIN_DISTANCE = 1;
export const CAMERA_MAX_DISTANCE = 5;
export const CAMERA_SMOOTHING_FACTOR = 0.25;
export const CAMERA_COLLISION_OFFSET = 0.25;
export const LAYER_CAMERA_COLLISION = 1;

export const JUMP_RAY_DISTANCE = 1.2;

export const SPAWN_POSITION = { x: 0, y: 2, z: 0 }; // TODO: { x: -46, y: 10, z: -36 };
export const INIT_CAMERA_POSITION = { x: -60, y: 8, z: -36 };
export const INIT_CHARACTER_ROTATION = Math.PI/2;

export const CLOUDGEN_STRIDE = 40;
export const CLOUDGEN_RAD = 120;
export const CLOUDGEN_BASE_Y = 100;

export const SUN_INIT_POSITION = { x: 200, y: 300, z: 300 };
export const SUN_TICK_ROTATION = 0.0002;

export const DIALOGUE_DEFAULT_NUM_CHARS = 2;
export const DIALOGUE_DEFAULT_CHAR_SPEED = 0;
export const DIALOGUE_DEFAULT_FONT_SIZE = "2.5vh";
export const DIALOGUE_DEFAULT_CHAR_TICK = true;

export const DISPLAYNAME_TOWN_GREETER = "Town Greeter Pip";
export const DISPLAYNAME_GRANDPA = "Grandpa Pip";
export const DISPLAYNAME_GRANDMA = "Grandma Pip";
export const DISPLAYNAME_LITTLE_PIP = "Little Pip";
export const DISPLAYNAME_FROG_PIP = "Frog Pip";
export const DISPLAYNAME_MATT_PIP = "Matt Pip";
export const DISPLAYNAME_VERONICA_PIP = "Veronica Pip";
export const DISPLAYNAME_FLOWER_PIP = "Flower Pip";
export const DISPLAYNAME_SLEEPY_PIP = "Sleepy Pip";
export const DISPLAYNAME_MAYOR_PIP = "Mayor Pip";
export const DISPLAYNAME_FARMHAND_PIP_1 = "Farmhand Pip 1";
export const DISPLAYNAME_FARMHAND_PIP_2 = "Farmhand Pip 2";
export const DISPLAYNAME_MERCHANT_PIP_1 = "Merchant Pip 1";
export const DISPLAYNAME_MERCHANT_PIP_2 = "Merchant Pip 2";
export const DISPLAYNAME_BOB = "Bob";
export const DISPLAYNAME_FRISBEE = "Frisbee";
export const DISPLAYNAME_SUBARU = "Subaru";
export const DISPLAYNAME_MR_NOODLE = "Mr. Noodle";
export const DISPLAYNAME_SEALIAM = "Sealiam";
export const DISPLAYNAME_RATHEW = "Rathew";
export const DISPLAYNAME_KURT_1 = "Kurt 1";
export const DISPLAYNAME_KURT_2 = "Kurt 2";
export const DISPLAYNAME_KURT_3 = "Kurt 3";
export const DISPLAYNAME_KURT_4 = "Kurt 4";
export const DISPLAYNAME_KURT_5 = "Kurt 5";
export const DISPLAYNAME_KURT_6 = "Kurt 6";
export const DISPLAYNAME_CHEESE_PIP = "Cheese Pip";
export const DISPLAYNAME_FOREST_PIP = "Forest Pip";
export const DISPLAYNAME_ASTRO_PIP = "Astro Pip";
export const DISPLAYNAME_GLASSES_PIP_1 = "Glasses Pip 1";
export const DISPLAYNAME_GLASSES_PIP_2 = "Glasses Pip 2";
export const DISPLAYNAME_LONG_HEAD_PIP = "Long-Head Pip";
