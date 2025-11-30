// --------------------------------------------------------------------------------------------------
// API and URLs
// --------------------------------------------------------------------------------------------------
export const BASE_URL_EUROPE = "https://gameinfo-ams.albiononline.com/api/gameinfo";
export const BASE_URL_AMERICAS = "https://gameinfo.albiononline.com/api/gameinfo";
export const BASE_URL_ASIA = "https://gameinfo-sgp.albiononline.com/api/gameinfo";
export const RENDER_API_URL = "https://render.albiononline.com/v1/item/";
export const SERVER_URLS = {
  europe: BASE_URL_EUROPE,
  americas: BASE_URL_AMERICAS,
  asia: BASE_URL_ASIA,
};

// --------------------------------------------------------------------------------------------------
// TIMING AND RATE LIMITS
// --------------------------------------------------------------------------------------------------
export const RATE_LIMIT_DELAY_SECONDS = 0.5;
export const TIMEOUT = 30000; // milliseconds
export const BATTLE_CHECK_INTERVAL_MINUTES = 1;
export const BATTLES_MAX_AGE_MINUTES = 2;

// --------------------------------------------------------------------------------------------------
// FILE PATHS
// --------------------------------------------------------------------------------------------------
export const IMAGE_FOLDER = "./images";
export const ITEM_IMAGE_FOLDER = "./images/items";
export const EQUIPMENT_IMAGE_FOLDER = "./images/equipments";
export const BATTLE_REPORT_IMAGE_FOLDER = "./images/battle_reports";

export const REPORTED_BATTLES_JSON_PATH = "./data/reported_battles.json";
export const CHANNELS_JSON_PATH = "./data/channels.json";

export const PLAYER_NAME_FONT_PATH = "Arial Bold";
export const TIMESTAMP_FONT_PATH = "Arial";

// --------------------------------------------------------------------------------------------------
// BOT SETTINGS
// --------------------------------------------------------------------------------------------------
export const BOT_COMMAND_PREFIX = "!";
export const VERBOSE_LOGGING = false;

// --------------------------------------------------------------------------------------------------
// API REQUEST PARAMETERS
// --------------------------------------------------------------------------------------------------
export const BATTLES_LIMIT = 20;

// --------------------------------------------------------------------------------------------------
// IMAGE GENERATION SETTINGS
// --------------------------------------------------------------------------------------------------
export const EQUIPMENT_IMAGE_SIZE = 651;
export const SIDE_PADDING = 100;
export const TOP_BOTTOM_PADDING = 50;
export const SPACING = 30;
export const MIDDLE_GAP = 200;
export const PLAYER_NAME_AREA_HEIGHT = 60;
export const IP_AREA_HEIGHT = 50;
export const CANVAS_WIDTH_5V5 = (2 * SIDE_PADDING) + (5 * EQUIPMENT_IMAGE_SIZE) + ((5 - 1) * SPACING);
export const CANVAS_WIDTH_2V2 = (2 * SIDE_PADDING) + (2 * EQUIPMENT_IMAGE_SIZE) + ((2 - 1) * SPACING);
export const CANVAS_HEIGHT = (
  (2 * TOP_BOTTOM_PADDING)
  + (2 * (EQUIPMENT_IMAGE_SIZE + PLAYER_NAME_AREA_HEIGHT + IP_AREA_HEIGHT))
  + MIDDLE_GAP
);
export const BATTLE_REPORT_CANVAS_SIZE_5V5 = [CANVAS_WIDTH_5V5, CANVAS_HEIGHT];
export const BATTLE_REPORT_CANVAS_SIZE_2V2 = [CANVAS_WIDTH_2V2, CANVAS_HEIGHT];
export const BACKGROUND_COLOR = "#282828"; // RGB(40, 40, 40)
export const PLAYER_NAME_FONT_SIZE = 40;
export const TIMESTAMP_FONT_SIZE = 60;
export const FONT_COLOR = "#FFFFFF"; // RGB(255, 255, 255)
export const LINE_SPACING = 20;
export const DEAD_PLAYER_GRAYSCALE_ENHANCEMENT = 0.2;

// --------------------------------------------------------------------------------------------------
// EQUIPMENT AND LAYOUT
// --------------------------------------------------------------------------------------------------
export const LAYOUT = {
  bag: [0, 0],
  head: [1, 0],
  cape: [2, 0],
  mainhand: [0, 1],
  armor: [1, 1],
  offhand: [2, 1],
  potion: [0, 2],
  shoes: [1, 2],
  food: [2, 2],
};
export const IMAGE_SIZE = 217;
export const EQUIPMENT_CANVAS_SIZE = [3 * IMAGE_SIZE, 3 * IMAGE_SIZE];

// --------------------------------------------------------------------------------------------------
// WEAPON LISTS
// --------------------------------------------------------------------------------------------------
export const HEALING_WEAPONS = [
  "MAIN_HOLYSTAFF",
  "2H_HOLYSTAFF",
  "2H_DIVINESTAFF",
  "MAIN_HOLYSTAFF_MORGANA",
  "2H_HOLYSTAFF_HELL",
  "2H_HOLYSTAFF_UNDEAD",
  "MAIN_HOLYSTAFF_AVALON",
  "2H_HOLYSTAFF_CRYSTAL",
  "MAIN_NATURESTAFF",
  "2H_NATURESTAFF",
  "2H_WILDSTAFF",
  "MAIN_NATURESTAFF_KEEPER",
  "2H_NATURESTAFF_HELL",
  "2H_NATURESTAFF_KEEPER",
  "MAIN_NATURESTAFF_AVALON",
  "MAIN_NATURESTAFF_CRYSTAL",
];

// --------------------------------------------------------------------------------------------------
// ALBION STATS
// --------------------------------------------------------------------------------------------------
export const QUALITY_IP = {
  0: 0,
  1: 0,
  2: 20,
  3: 40,
  4: 60,
  5: 100,
};
export const LETHAL_5V5_SOFTCAP_PERCENT = 35;
export const LETHAL_5V5_IP_CAP = 1100;
export const LETHAL_2V2_SOFTCAP_PERCENT = 35;
export const LETHAL_2V2_IP_CAP = 1100;
export const OVERCHARGE_BONUS_IP = 100;
export const BASE_IP = 300;

