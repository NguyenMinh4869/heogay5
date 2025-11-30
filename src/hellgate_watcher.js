import { Battle } from './albion_objects.js';
import { getCurrentTimeFormatted } from './utils.js';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import axios from 'axios';
import {
  BATTLES_LIMIT,
  BATTLES_MAX_AGE_MINUTES,
  CANVAS_WIDTH_2V2,
  RENDER_API_URL,
  EQUIPMENT_IMAGE_FOLDER,
  ITEM_IMAGE_FOLDER,
  BATTLE_REPORT_IMAGE_FOLDER,
  REPORTED_BATTLES_JSON_PATH,
  SERVER_URLS,
  TIMEOUT,
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
  CANVAS_WIDTH_5V5,
  SIDE_PADDING,
  BACKGROUND_COLOR,
  DEAD_PLAYER_GRAYSCALE_ENHANCEMENT,
  LAYOUT,
  BATTLE_REPORT_CANVAS_SIZE_2V2,
  BATTLE_REPORT_CANVAS_SIZE_5V5,
  IMAGE_SIZE,
  EQUIPMENT_CANVAS_SIZE,
  VERBOSE_LOGGING,
} from '../config.js';

export class BattleReportImageGenerator {
  static async generateBattleReports5v5(battles) {
    // Remove duplicate battles by ID before generating
    const seenBattleIds = new Set();
    const uniqueBattles = battles.filter(battle => {
      if (seenBattleIds.has(battle.id)) {
        if (VERBOSE_LOGGING) {
          console.log(`[${getCurrentTimeFormatted()}]\t⚠️  Skipping duplicate battle in generateBattleReports5v5: ${battle.id}`);
        }
        return false;
      }
      seenBattleIds.add(battle.id);
      return true;
    });
    
    if (VERBOSE_LOGGING && uniqueBattles.length !== battles.length) {
      console.log(`[${getCurrentTimeFormatted()}]\tRemoved ${battles.length - uniqueBattles.length} duplicate battles from 5v5 array`);
    }
    
    const battleReports = await Promise.all(
      uniqueBattles.map(battle => BattleReportImageGenerator.generateBattleReport5v5(battle))
    );
    return battleReports;
  }

  static async generateBattleReports2v2(battles) {
    // Remove duplicate battles by ID before generating
    const seenBattleIds = new Set();
    const uniqueBattles = battles.filter(battle => {
      if (seenBattleIds.has(battle.id)) {
        if (VERBOSE_LOGGING) {
          console.log(`[${getCurrentTimeFormatted()}]\t⚠️  Skipping duplicate battle in generateBattleReports2v2: ${battle.id}`);
        }
        return false;
      }
      seenBattleIds.add(battle.id);
      return true;
    });
    
    if (VERBOSE_LOGGING && uniqueBattles.length !== battles.length) {
      console.log(`[${getCurrentTimeFormatted()}]\tRemoved ${battles.length - uniqueBattles.length} duplicate battles from 2v2 array`);
    }
    
    const battleReports = await Promise.all(
      uniqueBattles.map(battle => BattleReportImageGenerator.generateBattleReport2v2(battle))
    );
    return battleReports;
  }

  static async generateEquipmentImage(equipment, isVictim = false) {
    const itemImages = {};

    for (const item of equipment.items) {
      const imagePath = await BattleReportImageGenerator.getItemImage(item);
      if (imagePath) {
        const itemSlot = item.constructor.name.toLowerCase();
        itemImages[itemSlot] = imagePath;
      }
    }

    const canvas = createCanvas(EQUIPMENT_CANVAS_SIZE[0], EQUIPMENT_CANVAS_SIZE[1]);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = BACKGROUND_COLOR;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (const [itemSlot, imagePath] of Object.entries(itemImages)) {
      if (!imagePath || !LAYOUT[itemSlot]) continue;

      try {
        let itemImage = await loadImage(imagePath);
        const coords = [
          LAYOUT[itemSlot][0] * IMAGE_SIZE,
          LAYOUT[itemSlot][1] * IMAGE_SIZE,
        ];
        
        // If victim, apply grayscale only to the item icon (not the background/border)
        if (isVictim) {
          // Create a temporary canvas for the item image
          const itemCanvas = createCanvas(IMAGE_SIZE, IMAGE_SIZE);
          const itemCtx = itemCanvas.getContext('2d');
          
          // Draw the original item image
          itemCtx.drawImage(itemImage, 0, 0, IMAGE_SIZE, IMAGE_SIZE);
          
          // Get image data
          const imageData = itemCtx.getImageData(0, 0, IMAGE_SIZE, IMAGE_SIZE);
          const data = imageData.data;
          
          // Apply grayscale with better algorithm
          // Try to preserve border colors by detecting edges and saturated colors
          for (let i = 0; i < data.length; i += 4) {
            const alpha = data[i + 3];
            // Only apply grayscale to visible pixels
            if (alpha > 0) {
              const r = data[i];
              const g = data[i + 1];
              const b = data[i + 2];
              
              // Calculate saturation to detect borders (borders are usually highly saturated)
              const max = Math.max(r, g, b);
              const min = Math.min(r, g, b);
              const saturation = max === 0 ? 0 : (max - min) / max;
              
              // Calculate brightness
              const brightness = (r + g + b) / 3;
              
              // If pixel is highly saturated (likely a border) or very bright/dark (border edge),
              // reduce grayscale effect to preserve some color
              const isLikelyBorder = saturation > 0.5 || brightness < 30 || brightness > 220;
              
              if (isLikelyBorder) {
                // For borders, apply lighter grayscale (blend with original color)
                const gray = r * 0.299 + g * 0.587 + b * 0.114;
                const blendFactor = 0.6; // 60% grayscale, 40% original color
                data[i] = gray * DEAD_PLAYER_GRAYSCALE_ENHANCEMENT * blendFactor + r * (1 - blendFactor);
                data[i + 1] = gray * DEAD_PLAYER_GRAYSCALE_ENHANCEMENT * blendFactor + g * (1 - blendFactor);
                data[i + 2] = gray * DEAD_PLAYER_GRAYSCALE_ENHANCEMENT * blendFactor + b * (1 - blendFactor);
              } else {
                // For item icon (less saturated, middle brightness), apply full grayscale
                const gray = r * 0.299 + g * 0.587 + b * 0.114;
                data[i] = gray * DEAD_PLAYER_GRAYSCALE_ENHANCEMENT;
                data[i + 1] = gray * DEAD_PLAYER_GRAYSCALE_ENHANCEMENT;
                data[i + 2] = gray * DEAD_PLAYER_GRAYSCALE_ENHANCEMENT;
              }
              // Keep alpha channel unchanged
            }
          }
          
          itemCtx.putImageData(imageData, 0, 0);
          itemImage = itemCanvas;
        }
        
        // Ensure image is drawn with full color (not grayscale)
        ctx.globalCompositeOperation = 'source-over';
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(itemImage, coords[0], coords[1], IMAGE_SIZE, IMAGE_SIZE);
      } catch (error) {
        console.error(`Error loading image ${imagePath}:`, error);
      }
    }

    let imageName = "equipment_";
    for (const item of equipment.items) {
      imageName += `T${item.tier}_${item.type}@${item.enchantment}&${item.quality}`;
    }

    const equipmentImagePath = path.join(EQUIPMENT_IMAGE_FOLDER, `${imageName}.png`);
    await fs.mkdir(EQUIPMENT_IMAGE_FOLDER, { recursive: true });
    
    const buffer = canvas.toBuffer('image/png');
    await fs.writeFile(equipmentImagePath, buffer);

    return equipmentImagePath;
  }

  static async getItemImage(item) {
    if (!item) {
      return null;
    }

    const itemImagePath = path.join(
      ITEM_IMAGE_FOLDER,
      `T${item.tier}_${item.type}@${item.enchantment}&${item.quality}.png`
    );

    try {
      await fs.access(itemImagePath);
      return itemImagePath;
    } catch {
      // File doesn't exist, need to download
    }

    const url = `${RENDER_API_URL}T${item.tier}_${item.type}@${item.enchantment}.png?count=1&quality=${item.enchantment}`;

    if (VERBOSE_LOGGING) {
      console.log(`[${getCurrentTimeFormatted()}]\tFetching image: ${url}`);
    }

    const imageBuffer = await BattleReportImageGenerator.getImage(url);
    if (!imageBuffer) {
      if (VERBOSE_LOGGING) {
        console.log(`[${getCurrentTimeFormatted()}]\tFailed to fetch image for item: T${item.tier}_${item.type}@${item.enchantment} (quality: ${item.quality})`);
      }
      return null;
    }

    await fs.mkdir(ITEM_IMAGE_FOLDER, { recursive: true });
    await fs.writeFile(itemImagePath, imageBuffer);
    return itemImagePath;
  }

  static async getImage(url) {
    try {
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: TIMEOUT,
        validateStatus: (status) => status < 500, // Don't throw on 4xx errors
      });
      
      if (response.status !== 200) {
        if (VERBOSE_LOGGING) {
          console.error(`[${getCurrentTimeFormatted()}]\tFailed to fetch ${url}: HTTP ${response.status} ${response.statusText}`);
        }
        return null;
      }
      
      if (!response.data || response.data.length === 0) {
        if (VERBOSE_LOGGING) {
          console.error(`[${getCurrentTimeFormatted()}]\tEmpty response from ${url}`);
        }
        return null;
      }
      
      return Buffer.from(response.data);
    } catch (error) {
      // Log detailed error information
      if (error.response) {
        // Server responded with error status
        console.error(
          `[${getCurrentTimeFormatted()}]\tFailed to fetch ${url}: HTTP ${error.response.status} ${error.response.statusText}`
        );
      } else if (error.request) {
        // Request made but no response
        console.error(
          `[${getCurrentTimeFormatted()}]\tNo response from ${url}: ${error.message}`
        );
      } else {
        // Error setting up request
        console.error(
          `[${getCurrentTimeFormatted()}]\tError fetching ${url}: ${error.message}`
        );
      }
      return null;
    }
  }

  static async getJson(url) {
    try {
      const response = await axios.get(url, {
        timeout: TIMEOUT,
      });
      return response.data;
    } catch (error) {
      console.error(`[${getCurrentTimeFormatted()}]\tAn error occurred while fetching ${url}:`, error.message);
      return null;
    }
  }

  static async generateBattleReport2v2(battle) {
    return await BattleReportImageGenerator._generateBattleReport(
      battle,
      CANVAS_WIDTH_2V2,
      BATTLE_REPORT_CANVAS_SIZE_2V2
    );
  }

  static async generateBattleReport5v5(battle) {
    return await BattleReportImageGenerator._generateBattleReport(
      battle,
      CANVAS_WIDTH_5V5,
      BATTLE_REPORT_CANVAS_SIZE_5V5
    );
  }

  static async _generateBattleReport(battle, canvasWidth, battleReportCanvasSize) {
    if (VERBOSE_LOGGING) {
      console.log(`[${getCurrentTimeFormatted()}]\tGenerating battle report for battle ${battle.id}`);
      console.log(`[${getCurrentTimeFormatted()}]\tCanvas size: ${battleReportCanvasSize[0]}x${battleReportCanvasSize[1]}`);
      console.log(`[${getCurrentTimeFormatted()}]\tTeam A IDs: [${battle.teamAIds.join(', ')}]`);
      console.log(`[${getCurrentTimeFormatted()}]\tTeam B IDs: [${battle.teamBIds.join(', ')}]`);
    }
    
    const canvas = createCanvas(battleReportCanvasSize[0], battleReportCanvasSize[1]);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = BACKGROUND_COLOR;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const drawTeam = async (yPos, teamIds) => {
      for (let i = 0; i < teamIds.length; i++) {
        const playerId = teamIds[i];
        const xPos = SIDE_PADDING + i * (EQUIPMENT_IMAGE_SIZE + SPACING);
        const player = battle.getPlayer(playerId);

        // Draw player name
        ctx.fillStyle = FONT_COLOR;
        ctx.font = `bold ${PLAYER_NAME_FONT_SIZE}px Arial`;
        const textMetrics = ctx.measureText(player.name);
        const textWidth = textMetrics.width;
        ctx.fillText(
          player.name,
          xPos + (EQUIPMENT_IMAGE_SIZE - textWidth) / 2,
          yPos + PLAYER_NAME_FONT_SIZE
        );

        // Check if player is victim before generating equipment image
        const isVictim = battle.victimIds.includes(playerId);
        if (VERBOSE_LOGGING) {
          console.log(`[${getCurrentTimeFormatted()}]\tPlayer ${player.name} (${playerId}): isVictim=${isVictim}, victimIds=[${battle.victimIds.join(', ')}]`);
        }
        
        // Generate equipment image with grayscale items if victim
        // This way, only item icons are grayscale, background/borders stay colored
        const equipmentImagePath = await BattleReportImageGenerator.generateEquipmentImage(
          player.equipment,
          isVictim
        );
        const equipmentImage = await loadImage(equipmentImagePath);
        
        if (VERBOSE_LOGGING) {
          if (isVictim) {
            console.log(`[${getCurrentTimeFormatted()}]\tGenerated equipment image with grayscale items for victim: ${player.name}`);
          } else {
            console.log(`[${getCurrentTimeFormatted()}]\tGenerated equipment image with full color for alive player: ${player.name}`);
          }
        }

        ctx.drawImage(
          equipmentImage,
          xPos,
          yPos + PLAYER_NAME_AREA_HEIGHT,
          EQUIPMENT_IMAGE_SIZE,
          EQUIPMENT_IMAGE_SIZE
        );

        // Draw Average Item Power
        const ipText = String(Math.round(player.averageItemPower));
        ctx.font = `35px Arial`;
        const ipMetrics = ctx.measureText(ipText);
        const ipTextWidth = ipMetrics.width;
        const ipTextX = xPos + (EQUIPMENT_IMAGE_SIZE - ipTextWidth) / 2;
        const ipTextY =
          yPos +
          PLAYER_NAME_AREA_HEIGHT +
          EQUIPMENT_IMAGE_SIZE +
          IP_AREA_HEIGHT / 2 +
          10;
        ctx.fillText(ipText, ipTextX, ipTextY);
      }
    };

    // Draw Team A
    const yPosA = TOP_BOTTOM_PADDING;
    if (VERBOSE_LOGGING) {
      console.log(`[${getCurrentTimeFormatted()}]\tDrawing Team A at yPos=${yPosA} with ${battle.teamAIds.length} players`);
    }
    await drawTeam(yPosA, battle.teamAIds);

    // Draw Team B
    const yPosB =
      TOP_BOTTOM_PADDING +
      PLAYER_NAME_AREA_HEIGHT +
      EQUIPMENT_IMAGE_SIZE +
      IP_AREA_HEIGHT +
      MIDDLE_GAP;
    if (VERBOSE_LOGGING) {
      console.log(`[${getCurrentTimeFormatted()}]\tDrawing Team B at yPos=${yPosB} with ${battle.teamBIds.length} players`);
      console.log(`[${getCurrentTimeFormatted()}]\tCanvas height: ${canvas.height}, yPosB + content height: ${yPosB + PLAYER_NAME_AREA_HEIGHT + EQUIPMENT_IMAGE_SIZE + IP_AREA_HEIGHT}`);
    }
    await drawTeam(yPosB, battle.teamBIds);

    // Draw Timestamp
    const startTime = new Date(battle.startTime);
    const endTime = new Date(battle.endTime);
    const duration = (endTime - startTime) / 1000; // seconds
    const durationMinutes = Math.floor(duration / 60);
    const durationSeconds = Math.floor(duration % 60);

    const startTimeHours = String(startTime.getUTCHours()).padStart(2, '0');
    const startTimeMinutes = String(startTime.getUTCMinutes()).padStart(2, '0');
    const startTimeSeconds = String(startTime.getUTCSeconds()).padStart(2, '0');
    const startTimeText = `Start Time: ${startTimeHours}:${startTimeMinutes}:${startTimeSeconds} UTC`;
    const durationText = `Duration: ${String(durationMinutes).padStart(2, '0')}m ${String(durationSeconds).padStart(2, '0')}s`;

    const timestampY =
      TOP_BOTTOM_PADDING +
      PLAYER_NAME_AREA_HEIGHT +
      EQUIPMENT_IMAGE_SIZE +
      IP_AREA_HEIGHT +
      MIDDLE_GAP / 2;

    ctx.font = `${TIMESTAMP_FONT_SIZE}px Arial`;
    ctx.fillStyle = FONT_COLOR;

    const startMetrics = ctx.measureText(startTimeText);
    const startTextWidth = startMetrics.width;
    const startTextY = timestampY - LINE_SPACING / 2;

    ctx.fillText(
      startTimeText,
      (canvasWidth - startTextWidth) / 2,
      startTextY
    );

    const durationMetrics = ctx.measureText(durationText);
    const durationTextWidth = durationMetrics.width;
    const durationTextY = startTextY + TIMESTAMP_FONT_SIZE + LINE_SPACING;

    ctx.fillText(
      durationText,
      (canvasWidth - durationTextWidth) / 2,
      durationTextY
    );

    const battleReportImagePath = path.join(
      BATTLE_REPORT_IMAGE_FOLDER,
      `battle_report_${battle.id}.png`
    );

    console.log(
      `[${getCurrentTimeFormatted()}]\tgenerating ${battleReportImagePath}`
    );

    await fs.mkdir(BATTLE_REPORT_IMAGE_FOLDER, { recursive: true });
    const buffer = canvas.toBuffer('image/png');
    await fs.writeFile(battleReportImagePath, buffer);

    await clearEquipmentsImages();

    return battleReportImagePath;
  }
}

export class HellgateWatcher {
  static async getJson(url) {
    try {
      const response = await axios.get(url, {
        timeout: TIMEOUT,
      });
      return response.data;
    } catch (error) {
      console.error(
        `[${getCurrentTimeFormatted()}]An error occurred while fetching ${url}:`,
        error.message
      );
      return null;
    }
  }

  static async _get50Battles(serverUrl, limit = BATTLES_LIMIT, page = 1) {
    const battles = [];
    const request = `${serverUrl}/battles?limit=${limit}&sort=recent&offset=${page * limit}`;
    const responseJson = await HellgateWatcher.getJson(request);

    if (responseJson) {
      battles.push(...responseJson);
    }
    return battles;
  }

  static _containsBattlesOutOfRange(battlesDicts) {
    if (!battlesDicts || battlesDicts.length === 0) {
      return false;
    }

    const times = battlesDicts.map(battleDict => {
      const timeStr = battleDict.startTime.replace('Z', '+00:00');
      return new Date(timeStr);
    });
    
    const maxTime = new Date(Math.max(...times));
    const minTime = new Date(Math.min(...times));
    const diffMinutes = (maxTime - minTime) / (1000 * 60);
    
    return diffMinutes > BATTLES_MAX_AGE_MINUTES;
  }

  static async getRecentBattles() {
    const reportedBattlesPerServer = HellgateWatcher.loadJson(REPORTED_BATTLES_JSON_PATH);

    const recentBattles = {
      europe: { "5v5": [], "2v2": [], total: 0 },
      americas: { "5v5": [], "2v2": [], total: 0 },
      asia: { "5v5": [], "2v2": [], total: 0 },
    };

    for (const server of ["europe", "americas", "asia"]) {
      let pageNumber = 0;
      let battlesDicts = [];
      const serverUrl = SERVER_URLS[server];
      const reportedBattles = [];

      while (!HellgateWatcher._containsBattlesOutOfRange(battlesDicts)) {
        const newBattles = await HellgateWatcher._get50Battles(serverUrl, BATTLES_LIMIT, pageNumber);
        battlesDicts.push(...newBattles);
        pageNumber += 1;
      }

      // Remove duplicate battles by ID (in case pagination returns same battles)
      const seenBattleIds = new Set();
      battlesDicts = battlesDicts.filter(battleDict => {
        if (seenBattleIds.has(battleDict.id)) {
          if (VERBOSE_LOGGING) {
            console.log(`[${getCurrentTimeFormatted()}]\tRemoving duplicate battle: ${battleDict.id}`);
          }
          return false;
        }
        seenBattleIds.add(battleDict.id);
        return true;
      });

      let battlesChecked = 0;
      let battlesWithEvents = 0;
      let battlesPassedFilter = 0;

      for (const battleDict of battlesDicts) {
        if (reportedBattlesPerServer[server].includes(battleDict.id)) {
          continue;
        }

        // Count players - match Python logic: len(battle_dict["players"])
        // In Python, len() works for both list and dict (counts keys for dict)
        let playerCount = 0;
        if (battleDict.players) {
          if (Array.isArray(battleDict.players)) {
            playerCount = battleDict.players.length;
          } else if (typeof battleDict.players === 'object' && battleDict.players !== null) {
            // For objects/dicts, count keys (like Python len() on dict)
            playerCount = Object.keys(battleDict.players).length;
          }
        }
        
        if (VERBOSE_LOGGING && playerCount > 0 && playerCount <= 10) {
          console.log(`[${getCurrentTimeFormatted()}]\tBattle ${battleDict.id}: ${playerCount} players`);
        }

        if (playerCount <= 10) {
          battlesChecked++;
          try {
            const battleEvents = await HellgateWatcher.getBattleEvents(
              battleDict.id,
              serverUrl
            );
            
            if (!battleEvents || battleEvents.length === 0) {
              if (VERBOSE_LOGGING) {
                console.log(`[${getCurrentTimeFormatted()}]\tBattle ${battleDict.id} has no events`);
              }
              continue;
            }

            battlesWithEvents++;
            const battle = new Battle(battleDict, battleEvents);
            
            // Debug: log battle details if verbose
            if (VERBOSE_LOGGING) {
              console.log(`[${getCurrentTimeFormatted()}]\tBattle ${battleDict.id}: ${battle.players.length} players, is5v5=${battle.isHellgate5v5}, is2v2=${battle.isHellgate2v2}`);
            }
            
            if (battle.isHellgate5v5) {
              // Check if battle already in array (prevent duplicates)
              const alreadyAdded = recentBattles[server]["5v5"].some(b => b.id === battle.id);
              if (!alreadyAdded) {
                recentBattles[server]["5v5"].push(battle);
                reportedBattles.push(battleDict.id);
                battlesPassedFilter++;
                console.log(`[${getCurrentTimeFormatted()}]\t✅ Found 5v5 hellgate: ${battleDict.id} (${battle.players.length} players)`);
              } else {
                if (VERBOSE_LOGGING) {
                  console.log(`[${getCurrentTimeFormatted()}]\t⚠️  Duplicate 5v5 battle skipped: ${battleDict.id}`);
                }
              }
            } else if (battle.isHellgate2v2) {
              // Check if battle already in array (prevent duplicates)
              const alreadyAdded = recentBattles[server]["2v2"].some(b => b.id === battle.id);
              if (!alreadyAdded) {
                recentBattles[server]["2v2"].push(battle);
                reportedBattles.push(battleDict.id);
                battlesPassedFilter++;
                console.log(`[${getCurrentTimeFormatted()}]\t✅ Found 2v2 hellgate: ${battleDict.id} (${battle.players.length} players)`);
              } else {
                if (VERBOSE_LOGGING) {
                  console.log(`[${getCurrentTimeFormatted()}]\t⚠️  Duplicate 2v2 battle skipped: ${battleDict.id}`);
                }
              }
            } else if (VERBOSE_LOGGING) {
              // Log why battle didn't pass filter
              const reasons = [];
              if (battle.players.length !== 10 && battle.players.length !== 4) {
                reasons.push(`wrong player count (${battle.players.length})`);
              }
              if (battle.players.length === 10 && !battle.isHellgate5v5) {
                reasons.push('not 5v5 format or IP not capped');
              }
              if (battle.players.length === 4 && !battle.isHellgate2v2) {
                reasons.push('not 2v2 format, IP not capped, or is Depths');
              }
              console.log(`[${getCurrentTimeFormatted()}]\t❌ Battle ${battleDict.id} filtered out: ${reasons.join(', ')}`);
            }
          } catch (error) {
            if (VERBOSE_LOGGING) {
              console.error(`[${getCurrentTimeFormatted()}]\tError processing battle ${battleDict.id}:`, error.message);
            }
          }
        }
      }

      reportedBattlesPerServer[server].push(...reportedBattles);

      console.log(
        `[${getCurrentTimeFormatted()}]\tSERVER: ${server.padEnd(8)} \tParsed ${battlesDicts.length} battles`
      );
      console.log(
        `[${getCurrentTimeFormatted()}]\tSERVER: ${server.padEnd(8)} \tChecked ${battlesChecked} battles (<=10 players), ${battlesWithEvents} with events, ${battlesPassedFilter} passed filter`
      );
      console.log(
        `[${getCurrentTimeFormatted()}]\tSERVER: ${server.padEnd(8)} \tFound ${recentBattles[server]["5v5"].length} 5v5 Hellgate Battles`
      );
      console.log(
        `[${getCurrentTimeFormatted()}]\tSERVER: ${server.padEnd(8)} \tFound ${recentBattles[server]["2v2"].length} 2v2 Hellgate Battles`
      );
    }

    HellgateWatcher.saveJson(REPORTED_BATTLES_JSON_PATH, reportedBattlesPerServer);

    return recentBattles;
  }

  static async getBattleEvents(battleId, serverUrl) {
    return await HellgateWatcher.getJson(`${serverUrl}/events/battle/${battleId}`);
  }

  static async getBattleFromId(battleId, serverUrl) {
    const battleDict = await HellgateWatcher.getJson(
      `${serverUrl}/battles/${battleId}`
    );
    const battleEvents = await HellgateWatcher.getBattleEvents(battleId, serverUrl);
    return new Battle(battleDict, battleEvents);
  }

  static loadJson(jsonPath) {
    try {
      const data = fsSync.readFileSync(jsonPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return { europe: [], americas: [], asia: [] };
      }
      throw error;
    }
  }

  static saveJson(jsonPath, data) {
    const directory = path.dirname(jsonPath);
    if (!fsSync.existsSync(directory)) {
      fsSync.mkdirSync(directory, { recursive: true });
    }
    fsSync.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
  }
}

export async function clearBattleReportsImages() {
  try {
    const files = await fs.readdir(BATTLE_REPORT_IMAGE_FOLDER);
    for (const file of files) {
      if (file.endsWith('.png')) {
        await fs.unlink(path.join(BATTLE_REPORT_IMAGE_FOLDER, file)).catch(console.error);
      }
    }
  } catch (error) {
    // Directory might not exist, ignore
  }
}

export async function clearEquipmentsImages() {
  try {
    const files = await fs.readdir(EQUIPMENT_IMAGE_FOLDER);
    for (const file of files) {
      if (file.endsWith('.png')) {
        await fs.unlink(path.join(EQUIPMENT_IMAGE_FOLDER, file)).catch(console.error);
      }
    }
  } catch (error) {
    // Directory might not exist, ignore
  }
}

export function clearReportedBattles() {
  const reportedBattles = HellgateWatcher.loadJson(REPORTED_BATTLES_JSON_PATH);
  for (const server of Object.keys(reportedBattles)) {
    reportedBattles[server] = [];
  }
  HellgateWatcher.saveJson(REPORTED_BATTLES_JSON_PATH, reportedBattles);
}

