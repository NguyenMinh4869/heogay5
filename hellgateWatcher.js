/**
 * hellgate_watcher.js
 * Chuyển từ hellgate_watcher.py sang Node.js (CommonJS).
 *
 * Giả định:
 * - Bạn có module `src/albion_objects` cung cấp class Battle, Item, Equipment (ở Node: import tương ứng)
 * - Bạn có file config.js (hoặc folder config) export các hằng số tương ứng.
 *
 * Cài đặt: npm i axios canvas jimp date-fns
 */

const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { createCanvas, loadImage } = require("@napi-rs/canvas");
const Jimp = require("jimp");
const { parseISO, format, differenceInSeconds } = require("date-fns");

// IMPORT TỪ PROJECT CỦA BẠN
const { Battle } = require("./albionObj");

// IMPORT CONFIG (bạn tạo file config.js xuất các hằng số)
const config = require("./config");

// Ví dụ config export:
// module.exports = {
//   BATTLES_LIMIT: 50,
//   BATTLES_MAX_AGE_MINUTES: 120,
//   CANVAS_WIDTH_2V2: 1400,
//   CANVAS_WIDTH_5V5: 2800,
//   RENDER_API_URL: "https://render.albiononline.com/",
//   EQUIPMENT_IMAGE_FOLDER: "./tmp/equipment_images",
//   ITEM_IMAGE_FOLDER: "./tmp/item_images",
//   BATTLE_REPORT_IMAGE_FOLDER: "./tmp/battle_reports",
//   REPORTED_BATTLES_JSON_PATH: "./reported_battles.json",
//   SERVER_URLS: { europe: "...", americas: "...", asia: "..." },
//   TIMEOUT: 15000,
//   PLAYER_NAME_FONT_PATH: "./fonts/SomeFont.ttf",
//   TIMESTAMP_FONT_PATH: "./fonts/SomeFont.ttf",
//   PLAYER_NAME_FONT_SIZE: 28,
//   TIMESTAMP_FONT_SIZE: 24,
//   FONT_COLOR: "white",
//   TOP_BOTTOM_PADDING: 20,
//   PLAYER_NAME_AREA_HEIGHT: 40,
//   EQUIPMENT_IMAGE_SIZE: 256,
//   MIDDLE_GAP: 30,
//   IP_AREA_HEIGHT: 40,
//   LINE_SPACING: 8,
//   SPACING: 10,
//   BATTLE_REPORT_CANVAS_SIZE_2V2: [1400, 600],
//   BATTLE_REPORT_CANVAS_SIZE_5V5: [2800, 1200],
//   IMAGE_SIZE: 128,
//   EQUIPMENT_CANVAS_SIZE: [512, 512],
//   LAYOUT: { helmet: [0,0], weapon: [1,0], ... },
//   BACKGROUND_COLOR: "#0a0a0a",
//   DEAD_PLAYER_GRAYSCALE_ENHANCEMENT: 0.0,
//   SIDE_PADDING: 20
// };

const {
  BATTLES_LIMIT,
  BATTLES_MAX_AGE_MINUTES,
  CANVAS_WIDTH_2V2,
  CANVAS_WIDTH_5V5,
  RENDER_API_URL,
  EQUIPMENT_IMAGE_FOLDER,
  ITEM_IMAGE_FOLDER,
  BATTLE_REPORT_IMAGE_FOLDER,
  REPORTED_BATTLES_JSON_PATH,
  SERVER_URLS,
  TIMEOUT,
  PLAYER_NAME_FONT_PATH,
  TIMESTAMP_FONT_PATH,
  PLAYER_NAME_FONT_SIZE,
  TIMESTAMP_FONT_SIZE,
  FONT_COLOR,
  TOP_BOTTOM_PADDING,
  PLAYER_NAME_AREA_HEIGHT,
  EQUIPMENT_IMAGE_SIZE,
  MIDDLE_GAP,
  IP_AREA_HEIGHT,
  LINE_SPACING,
  SPACING,
  BATTLE_REPORT_CANVAS_SIZE_2V2,
  BATTLE_REPORT_CANVAS_SIZE_5V5,
  IMAGE_SIZE,
  EQUIPMENT_CANVAS_SIZE,
  LAYOUT,
  BACKGROUND_COLOR,
  DEAD_PLAYER_GRAYSCALE_ENHANCEMENT,
  SIDE_PADDING,
} = config;

// Note: @napi-rs/canvas doesn't support registerFont, will use system fonts
// Font paths in config are kept for compatibility but won't be used

// Helpers
function getCurrentTimeFormatted() {
  return format(new Date(), "yyyy-MM-dd HH:mm:ss");
}

async function ensureFolder(folder) {
  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder, { recursive: true });
  }
}

async function fileExists(p) {
  try {
    await fs.promises.access(p);
    return true;
  } catch {
    return false;
  }
}

// IMAGE & HTTP UTIL
async function fetchImageBuffer(url) {
  try {
    const resp = await axios.get(url, { responseType: "arraybuffer", timeout: TIMEOUT });
    return Buffer.from(resp.data);
  } catch (e) {
    console.error(`[${getCurrentTimeFormatted()}]\tAn error occurred while fetching ${url}: ${e.message}`);
    return null;
  }
}

async function fetchJson(url) {
  try {
    const resp = await axios.get(url, { timeout: TIMEOUT });
    return resp.data;
  } catch (e) {
    console.error(`[${getCurrentTimeFormatted()}]\tAn error occurred while fetching ${url}: ${e.message}`);
    return null;
  }
}

/**
 * BattleReportImageGenerator
 * - generate_equipment_image(equipment) -> path
 * - generate_battle_report_2v2 / 5v5
 */
class BattleReportImageGenerator {
  static async generateBattleReports5v5(battles) {
    return Promise.all(battles.map((b) => BattleReportImageGenerator.generate_battle_report_5v5(b)));
  }

  static async generateBattleReports2v2(battles) {
    return Promise.all(battles.map((b) => BattleReportImageGenerator.generate_battle_report_2v2(b)));
  }

  static async generate_equipment_image(equipment) {
    // equipment.items expected array of Item-like objects with .tier .type .enchantment .quality
    await ensureFolder(EQUIPMENT_IMAGE_FOLDER);
    await ensureFolder(ITEM_IMAGE_FOLDER);

    const itemImages = {};

    for (const item of equipment.items) {
      const imgPath = await BattleReportImageGenerator.get_item_image(item);
      itemImages[item.constructor.name.toLowerCase()] = imgPath;
    }

    // create canvas
    const [w, h] = EQUIPMENT_CANVAS_SIZE;
    const canvas = createCanvas(w, h);
    const ctx = canvas.getContext("2d");

    // background
    ctx.fillStyle = BACKGROUND_COLOR || "#000";
    ctx.fillRect(0, 0, w, h);

    // paste item images based on LAYOUT mapping
    for (const [slot, coords] of Object.entries(LAYOUT)) {
      const imgPath = itemImages[slot];
      if (!imgPath) continue;
      try {
        const img = await loadImage(imgPath);
        const x = Math.floor(coords[0] * IMAGE_SIZE);
        const y = Math.floor(coords[1] * IMAGE_SIZE);
        ctx.drawImage(img, x, y, IMAGE_SIZE, IMAGE_SIZE);
      } catch (e) {
        console.warn("Error drawing item image", e.message);
      }
    }

    // image name creation similar to python
    let imageName = "equipment_";
    for (const item of equipment.items) {
      imageName += `T${item.tier}_${item.type}@${item.enchantment}&${item.quality}`;
    }
    const outPath = path.join(EQUIPMENT_IMAGE_FOLDER, `${imageName}.png`);

    const buffer = canvas.toBuffer("image/png");
    await fs.promises.writeFile(outPath, buffer);

    return outPath;
  }

  static async get_item_image(item) {
    if (!item) return null;

    const itemImagePath = path.join(ITEM_IMAGE_FOLDER, `T${item.tier}_${item.type}@${item.enchantment}&${item.quality}.png`);
    if (await fileExists(itemImagePath)) return itemImagePath;

    // remote render API
    const url = `${RENDER_API_URL}T${item.tier}_${item.type}@${item.enchantment}.png?count=1&quality=${item.enchantment}`;

    const imageBuf = await fetchImageBuffer(url);
    if (!imageBuf) return null;

    await fs.promises.writeFile(itemImagePath, imageBuf);
    return itemImagePath;
  }

  static async generate_battle_report_2v2(battle) {
    return BattleReportImageGenerator._generate_battle_report(battle, CANVAS_WIDTH_2V2, BATTLE_REPORT_CANVAS_SIZE_2V2);
  }

  static async generate_battle_report_5v5(battle) {
    return BattleReportImageGenerator._generate_battle_report(battle, CANVAS_WIDTH_5V5, BATTLE_REPORT_CANVAS_SIZE_5V5);
  }

  static async _generate_battle_report(battle, canvasWidth, battleReportCanvasSize) {
    // battleReportCanvasSize: [width, height]
    const [width, height] = Array.isArray(battleReportCanvasSize) ? battleReportCanvasSize : [canvasWidth, 600];
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    // background
    ctx.fillStyle = BACKGROUND_COLOR || "#000";
    ctx.fillRect(0, 0, width, height);

    // fonts - @napi-rs/canvas uses system fonts
    const playerNameFont = `${PLAYER_NAME_FONT_SIZE || 28}px sans-serif`;
    const timestampFont = `${TIMESTAMP_FONT_SIZE || 20}px sans-serif`;
    const ipFontSize = 35;
    const ipFont = `${ipFontSize}px sans-serif`;

    // utility to draw team
    async function draw_team(yPos, teamIds) {
      for (let i = 0; i < teamIds.length; i++) {
        const playerId = teamIds[i];
        const xPos = SIDE_PADDING + i * (EQUIPMENT_IMAGE_SIZE + SPACING);
        const player = battle.getPlayer(playerId); // Battle.getPlayer returns object with .name, .equipment, .averageItemPower

        // Draw player name (centered above equipment)
        ctx.font = playerNameFont;
        ctx.fillStyle = FONT_COLOR || "white";
        const textMetrics = ctx.measureText(player.name);
        const textWidth = textMetrics.width;
        const nameX = xPos + (EQUIPMENT_IMAGE_SIZE - textWidth) / 2;
        ctx.fillText(player.name, nameX, yPos + PLAYER_NAME_FONT_SIZE);

        // Generate equipment image (path)
        const equipmentImagePath = await BattleReportImageGenerator.generate_equipment_image(player.equipment);
        let equipmentImage = null;
        try {
          equipmentImage = await Jimp.read(equipmentImagePath);
          // If dead, desaturate / grayscale or reduce color
          if (battle.victimIds && battle.victimIds.includes(playerId)) {
            equipmentImage = equipmentImage.grayscale().color([{ apply: 'mix', params: ['#000000', Math.round((1- DEAD_PLAYER_GRAYSCALE_ENHANCEMENT)*100)] }]);
          }
          // Save to temp buffer then load into canvas
          const tmpBuf = await equipmentImage.getBufferAsync(Jimp.MIME_PNG);
          const img = await loadImage(tmpBuf);
          ctx.drawImage(img, xPos, yPos + PLAYER_NAME_AREA_HEIGHT, EQUIPMENT_IMAGE_SIZE, EQUIPMENT_IMAGE_SIZE);
        } catch (e) {
          console.warn("Error loading equipment image", e.message);
        }

        // Draw Average Item Power (IP)
        ctx.font = ipFont;
        const ipText = String(Math.round(player.averageItemPower || 0));
        const ipMetrics = ctx.measureText(ipText);
        const ipTextWidth = ipMetrics.width;
        const ipX = xPos + (EQUIPMENT_IMAGE_SIZE - ipTextWidth) / 2;
        const ipY = yPos + PLAYER_NAME_AREA_HEIGHT + EQUIPMENT_IMAGE_SIZE + (IP_AREA_HEIGHT / 2) + (ipFontSize/2);
        ctx.fillText(ipText, ipX, ipY);
      }
    }

    // --- Draw Team A ---
    let yPos = TOP_BOTTOM_PADDING;
    await draw_team(yPos, battle.teamAIds);

    // --- Draw Team B ---
    yPos = TOP_BOTTOM_PADDING + PLAYER_NAME_AREA_HEIGHT + EQUIPMENT_IMAGE_SIZE + IP_AREA_HEIGHT + MIDDLE_GAP;
    await draw_team(yPos, battle.teamBIds);

    // --- Draw Timestamp & Duration ---
    const start = parseISO(battle.startTime.replace("Z", "+00:00"));
    const end = parseISO(battle.endTime.replace("Z", "+00:00"));
    const durationSec = differenceInSeconds(end, start);
    const minutes = Math.floor(durationSec / 60);
    const seconds = durationSec % 60;
    const startTimeText = `Start Time: ${format(start, "HH:mm:ss")} UTC`;
    const durationText = `Duration: ${String(minutes).padStart(2,'0')}m ${String(seconds).padStart(2,'0')}s`;

    ctx.font = timestampFont;
    ctx.fillStyle = FONT_COLOR || "white";

    const startMetrics = ctx.measureText(startTimeText);
    const startTextWidth = startMetrics.width;

    const timestampY = TOP_BOTTOM_PADDING + PLAYER_NAME_AREA_HEIGHT + EQUIPMENT_IMAGE_SIZE + IP_AREA_HEIGHT + (MIDDLE_GAP / 2);
    const textHeight = TIMESTAMP_FONT_SIZE || 20;
    const startTextY = timestampY - (textHeight + LINE_SPACING) / 2;
    const durationTextY = startTextY + textHeight + LINE_SPACING;

    ctx.fillText(startTimeText, (canvasWidth - startTextWidth) / 2, startTextY);
    const durationMetrics = ctx.measureText(durationText);
    ctx.fillText(durationText, (canvasWidth - durationMetrics.width) / 2, durationTextY);

    // Save to file
    await ensureFolder(BATTLE_REPORT_IMAGE_FOLDER);
    const outPath = path.join(BATTLE_REPORT_IMAGE_FOLDER, `battle_report_${battle.id}.png`);
    const outBuffer = canvas.toBuffer("image/png");
    await fs.promises.writeFile(outPath, outBuffer);

    // Note: Don't clear equipment images here as they might be reused
    // clear_equipments_images();

    console.log(`[${getCurrentTimeFormatted()}]\tgenerating ${outPath}`);

    return outPath;
  }
}

/**
 * HellgateWatcher
 * - get_json (http)
 * - _get_50_battles
 * - _contains_battles_out_of_range
 * - get_recent_battles
 * - get_battle_events
 * - get_battle_from_id
 * - load_json / save_json
 */
class HellgateWatcher {
  static async get_json(url) {
    return await fetchJson(url);
  }

  static async _get_50_battles(server_url, limit = BATTLES_LIMIT, page = 1) {
    const request = `${server_url}/battles?limit=${limit}&sort=recent&offset=${page * limit}`;
    const json = await HellgateWatcher.get_json(request);
    return json ? Array.from(json) : [];
  }

  static _contains_battles_out_of_range(battlesDicts) {
    if (!battlesDicts || battlesDicts.length === 0) return false;
    const times = battlesDicts.map((b) => parseISO(b.startTime.replace("Z", "+00:00")));
    const maxTime = new Date(Math.max(...times.map((d) => d.getTime())));
    const minTime = new Date(Math.min(...times.map((d) => d.getTime())));
    const diffMinutes = (maxTime - minTime) / (1000 * 60);
    return diffMinutes > BATTLES_MAX_AGE_MINUTES;
  }

  static async getRecentBattles() {
    // load reported battles
    let reported_battles_per_server = { europe: { "5v5": [], "2v2": [], total: 0 }, americas: { "5v5": [], "2v2": [], total: 0 }, asia: { "5v5": [], "2v2": [], total: 0 } };
    try {
      if (await fileExists(REPORTED_BATTLES_JSON_PATH)) {
        const raw = await fs.promises.readFile(REPORTED_BATTLES_JSON_PATH, "utf8");
        reported_battles_per_server = JSON.parse(raw);
      }
    } catch (e) {
      console.warn("Could not read reported battles JSON:", e.message);
    }

    const recent_battles = { europe: { "5v5": [], "2v2": [], total: 0 }, americas: { "5v5": [], "2v2": [], total: 0 }, asia: { "5v5": [], "2v2": [], total: 0 } };

    for (const server of ["europe", "americas", "asia"]) {
      let pageNumber = 0;
      let battlesDicts = [];
      const serverUrl = SERVER_URLS[server];
      const reportedBattles = [];

      // fetch pages until contains out of range
      while (!HellgateWatcher._contains_battles_out_of_range(battlesDicts)) {
        const more = await HellgateWatcher._get_50_battles(serverUrl, BATTLES_LIMIT, pageNumber);
        battlesDicts = battlesDicts.concat(more);
        pageNumber += 1;
      }

      for (const battleDict of battlesDicts) {
        // Check if battle already reported (check in both 5v5 and 2v2 arrays)
        const reported5v5 = reported_battles_per_server[server]?.["5v5"] || [];
        const reported2v2 = reported_battles_per_server[server]?.["2v2"] || [];
        if (reported5v5.includes(battleDict.id) || reported2v2.includes(battleDict.id)) {
          continue;
        }

        const playerCount = Object.keys(battleDict.players || {}).length;
        if (playerCount <= 10) {
          const battleEvents = await HellgateWatcher.get_battle_events(battleDict.id, serverUrl);
          // Construct Battle instance - constructor takes (battleDict, battleEvents)
          const battle = new Battle(battleDict, battleEvents);
          if (battle.isHellgate5v5) {
            recent_battles[server]["5v5"].push(battle);
            reportedBattles.push({ id: battleDict.id, mode: "5v5" });
          } else if (battle.isHellgate2v2) {
            recent_battles[server]["2v2"].push(battle);
            reportedBattles.push({ id: battleDict.id, mode: "2v2" });
          }
        }
      }

      // update reported list
      if (!reported_battles_per_server[server]) {
        reported_battles_per_server[server] = { "5v5": [], "2v2": [] };
      }
      for (const reported of reportedBattles) {
        if (!reported_battles_per_server[server][reported.mode].includes(reported.id)) {
          reported_battles_per_server[server][reported.mode].push(reported.id);
        }
      }

      console.log(`[${getCurrentTimeFormatted()}]\tSERVER: ${server} \tParsed ${battlesDicts.length} battles`);
      console.log(`[${getCurrentTimeFormatted()}]\tSERVER: ${server} \tFound ${recent_battles[server]["5v5"].length} 5v5 Hellgate Battles`);
      console.log(`[${getCurrentTimeFormatted()}]\tSERVER: ${server} \tFound ${recent_battles[server]["2v2"].length} 2v2 Hellgate Battles`);
    }

    // save reported battles
    try {
      await fs.promises.writeFile(REPORTED_BATTLES_JSON_PATH, JSON.stringify(reported_battles_per_server, null, 2), "utf8");
    } catch (e) {
      console.warn("Could not save reported battles JSON:", e.message);
    }

    return recent_battles;
  }

  static async get_battle_events(battle_id, server_url) {
    return HellgateWatcher.get_json(`${server_url}/events/battle/${battle_id}`);
  }

  static async get_battle_from_id(battle_id, server_url) {
    const battleDict = await HellgateWatcher.get_json(`${server_url}/battles/${battle_id}`);
    const battleEvents = await HellgateWatcher.get_battle_events(battle_id, server_url);
    // Instantiate Battle - constructor takes (battleDict, battleEvents)
    return new Battle(battleDict, battleEvents);
  }

  static load_json(json_path) {
    const raw = fs.readFileSync(json_path, "utf8");
    return JSON.parse(raw);
  }

  static save_json(json_path, data) {
    fs.writeFileSync(json_path, JSON.stringify(data, null, 2), "utf8");
  }
}

// Cleanup functions
function clear_battle_reports_images() {
  if (!fs.existsSync(BATTLE_REPORT_IMAGE_FOLDER)) return;
  for (const file of fs.readdirSync(BATTLE_REPORT_IMAGE_FOLDER)) {
    if (file.endsWith(".png")) fs.unlinkSync(path.join(BATTLE_REPORT_IMAGE_FOLDER, file));
  }
}

function clear_equipments_images() {
  if (!fs.existsSync(EQUIPMENT_IMAGE_FOLDER)) return;
  for (const file of fs.readdirSync(EQUIPMENT_IMAGE_FOLDER)) {
    if (file.endsWith(".png")) fs.unlinkSync(path.join(EQUIPMENT_IMAGE_FOLDER, file));
  }
}

function clear_reported_battles() {
  try {
    const reported = HellgateWatcher.load_json(REPORTED_BATTLES_JSON_PATH);
    for (const server of Object.keys(reported)) {
      if (typeof reported[server] === 'object' && !Array.isArray(reported[server])) {
        reported[server]["5v5"] = [];
        reported[server]["2v2"] = [];
      } else {
        reported[server] = { "5v5": [], "2v2": [] };
      }
    }
    HellgateWatcher.save_json(REPORTED_BATTLES_JSON_PATH, reported);
  } catch (e) {
    console.warn("Could not clear reported battles file:", e.message);
  }
}

// exports - using camelCase to match bot.js
module.exports = {
  BattleReportImageGenerator,
  HellgateWatcher,
  clearBattleReportsImages: clear_battle_reports_images,
  clearEquipmentsImages: clear_equipments_images,
  clearReportedBattles: clear_reported_battles,
};
