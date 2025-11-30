import {
  BASE_IP,
  LETHAL_2V2_IP_CAP,
  LETHAL_2V2_SOFTCAP_PERCENT,
  LETHAL_5V5_IP_CAP,
  LETHAL_5V5_SOFTCAP_PERCENT,
  HEALING_WEAPONS,
  VERBOSE_LOGGING,
} from '../config.js';
import { getCurrentTimeFormatted } from './utils.js';

export const Slot = {
  MainHand: "MainHand",
  OffHand: "OffHand",
  Armor: "Armor",
  Head: "Head",
  Shoes: "Shoes",
  Cape: "Cape",
  Bag: "Bag",
  Potion: "Potion",
  Food: "Food",
};

export class Item {
  constructor(itemDict) {
    this.type = "";
    this.tier = 0;
    this.enchantment = 0;
    this.quality = itemDict.Quality;
    const itemType = itemDict.Type;
    this._parseItemType(itemType);
  }

  _parseItemType(itemType) {
    let parsedType = itemType;
    
    if (parsedType[0].toUpperCase() === "T") {
      this.tier = parseInt(parsedType[1]);
      parsedType = parsedType.substring(3);
    } else {
      this.tier = 0;
    }

    if (parsedType.length >= 2 && parsedType[parsedType.length - 2] === "@") {
      this.enchantment = parseInt(parsedType[parsedType.length - 1]);
      parsedType = parsedType.substring(0, parsedType.length - 2);
    }

    this.type = parsedType;
  }

  toString() {
    return `${this.type.padEnd(25)} \tTier: ${this.tier} \tEnchantment:${this.enchantment} \tQuality: ${this.quality}`;
  }

  _getQualityIP() {
    const qualityIPMap = {
      0: 0, // No Quality Data
      1: 0, // Normal
      2: 20, // Good
      3: 40, // Outstanding
      4: 60, // Excellent
      5: 100, // Masterpiece
    };
    return qualityIPMap[this.quality] || 0;
  }

  static applyIPCap(ip, ipCap, softCapPercent) {
    if (ip <= ipCap) {
      return ip;
    }
    return ipCap + (ip - ipCap) * (softCapPercent / 100);
  }

  getMaxItemPower(ipCap, ipSoftcapPercent) {
    let itemPower = BASE_IP;
    itemPower += this.tier * 100;
    itemPower += this.enchantment * 100;
    itemPower += this._getQualityIP();
    itemPower = Item.applyIPCap(itemPower, ipCap, ipSoftcapPercent);
    return itemPower;
  }
}

export class ArmorPiece extends Item {
  constructor(itemDict) {
    super(itemDict);
  }

  getMaxItemPower(ipCap, ipSoftcapPercent) {
    let itemPower = super.getMaxItemPower(ipCap, ipSoftcapPercent);

    const MASTERY_BONUS_PERCENT = (this.tier - 4) * 5;
    const MAX_ITEM_LEVEL = 120;
    const IP_PER_LEVEL = 2;
    const NB_NON_ARTEFACT_ITEMS = 3;
    const IP_PER_LEVEL_NON_ARTEFACT_ITEM = 0.2;
    const NB_ARTEFACT_ITEMS = 4;
    const IP_PER_LEVEL_ARTEFACT_BRANCH_ITEM = 0.1;
    const OVERCHARGE_BONUS = 100;

    itemPower += OVERCHARGE_BONUS;
    itemPower += MAX_ITEM_LEVEL * IP_PER_LEVEL;
    itemPower += NB_NON_ARTEFACT_ITEMS * IP_PER_LEVEL_NON_ARTEFACT_ITEM * MAX_ITEM_LEVEL;
    itemPower += NB_ARTEFACT_ITEMS * IP_PER_LEVEL_ARTEFACT_BRANCH_ITEM * MAX_ITEM_LEVEL;
    itemPower += itemPower * MASTERY_BONUS_PERCENT / 100;
    itemPower = Item.applyIPCap(itemPower, ipCap, ipSoftcapPercent);

    return itemPower;
  }

  get isPlate() {
    return this.type.toLowerCase().includes("plate");
  }

  get isLeather() {
    return this.type.toLowerCase().includes("leather");
  }

  get isCloth() {
    return this.type.toLowerCase().includes("cloth");
  }
}

export class WeaponOrOffhand extends Item {
  constructor(itemDict) {
    super(itemDict);
  }

  getMaxItemPower(ipCap, ipSoftcapPercent) {
    let itemPower = super.getMaxItemPower(ipCap, ipSoftcapPercent);

    const MASTERY_BONUS_PERCENT = (this.tier - 4) * 5;
    const MAX_ITEM_LEVEL = 120;
    const IP_PER_LEVEL = 2;
    const NB_NON_ARTEFACT_ITEMS = 3;
    const IP_PER_LEVEL_NON_ARTEFACT_ITEM = 0.2;
    const NB_ARTEFACT_ITEMS = 4;
    const IP_PER_LEVEL_ARTEFACT_BRANCH_ITEM = 0.1;
    const NB_CRYSTAL_ITEMS = 5;
    const IP_PER_LEVEL_CRYSTAL_ITEM = 0.025;
    const OVERCHARGE_BONUS = 100;

    itemPower += OVERCHARGE_BONUS;
    itemPower += MAX_ITEM_LEVEL * IP_PER_LEVEL;
    itemPower += NB_NON_ARTEFACT_ITEMS * IP_PER_LEVEL_NON_ARTEFACT_ITEM * MAX_ITEM_LEVEL;
    itemPower += NB_ARTEFACT_ITEMS * IP_PER_LEVEL_ARTEFACT_BRANCH_ITEM * MAX_ITEM_LEVEL;
    itemPower += NB_CRYSTAL_ITEMS * IP_PER_LEVEL_CRYSTAL_ITEM * MAX_ITEM_LEVEL;
    itemPower += itemPower * MASTERY_BONUS_PERCENT / 100;
    itemPower = Item.applyIPCap(itemPower, ipCap, ipSoftcapPercent);

    return itemPower;
  }
}

export class ItemWithoutIPScaling extends Item {
  constructor(itemDict) {
    super(itemDict);
  }

  getMaxItemPower(ipCap, ipSoftcapPercent) {
    return super.getMaxItemPower(ipCap, ipSoftcapPercent);
  }
}

export class MainHand extends WeaponOrOffhand {
  constructor(itemDict) {
    super(itemDict);
  }

  get isHealingWeapon() {
    return HEALING_WEAPONS.includes(this.type);
  }
}

export class OffHand extends WeaponOrOffhand {
  constructor(itemDict) {
    super(itemDict);
  }
}

export class Armor extends ArmorPiece {
  constructor(itemDict) {
    super(itemDict);
  }
}

export class Head extends ArmorPiece {
  constructor(itemDict) {
    super(itemDict);
  }
}

export class Shoes extends ArmorPiece {
  constructor(itemDict) {
    super(itemDict);
  }
}

export class Cape extends ItemWithoutIPScaling {
  constructor(itemDict) {
    super(itemDict);
  }
}

export class Bag extends ItemWithoutIPScaling {
  constructor(itemDict) {
    super(itemDict);
  }
}

export class Potion extends ItemWithoutIPScaling {
  constructor(itemDict) {
    super(itemDict);
  }
}

export class Food extends ItemWithoutIPScaling {
  constructor(itemDict) {
    super(itemDict);
  }
}

export class Equipment {
  static _itemClassMap = {
    [Slot.MainHand]: MainHand,
    [Slot.OffHand]: OffHand,
    [Slot.Armor]: Armor,
    [Slot.Head]: Head,
    [Slot.Shoes]: Shoes,
    [Slot.Cape]: Cape,
    [Slot.Bag]: Bag,
    [Slot.Potion]: Potion,
    [Slot.Food]: Food,
  };

  constructor(equipmentDict) {
    this.mainhand = null;
    this.offhand = null;
    this.armor = null;
    this.head = null;
    this.shoes = null;
    this.cape = null;
    this.bag = null;
    this.potion = null;
    this.food = null;

    if (!equipmentDict) return;

    for (const [slotValue, itemClass] of Object.entries(Equipment._itemClassMap)) {
      if (equipmentDict[slotValue]) {
        const slotName = this._getSlotName(slotValue);
        this[slotName] = new itemClass(equipmentDict[slotValue]);
      }
    }
  }

  _getSlotName(slotValue) {
    const slotMap = {
      [Slot.MainHand]: 'mainhand',
      [Slot.OffHand]: 'offhand',
      [Slot.Armor]: 'armor',
      [Slot.Head]: 'head',
      [Slot.Shoes]: 'shoes',
      [Slot.Cape]: 'cape',
      [Slot.Bag]: 'bag',
      [Slot.Potion]: 'potion',
      [Slot.Food]: 'food',
    };
    return slotMap[slotValue] || slotValue.toLowerCase();
  }

  get items() {
    return Object.values(this).filter(item => item instanceof Item);
  }

  toString() {
    let equipment = "";
    for (const item of this.items) {
      if (item !== null && item !== undefined) {
        const slotName = item.constructor.name;
        equipment += `\t${slotName.padEnd(10)}: \t${item.toString()}\n`;
      }
    }
    return equipment;
  }

  maxAverageItemPower(ipCap, ipSoftcapPercent) {
    let totalIP = 0;

    const ipContributingItems = [
      this.head,
      this.armor,
      this.shoes,
      this.mainhand,
      this.offhand,
      this.cape,
    ];

    for (const item of ipContributingItems) {
      if (item) {
        totalIP += item.getMaxItemPower(ipCap, ipSoftcapPercent);
      }
    }

    if (this.offhand === null && this.mainhand !== null) {
      // 2-handed weapon, counts for two slots
      totalIP += this.mainhand.getMaxItemPower(ipCap, ipSoftcapPercent);
    }

    return Math.floor(totalIP / 6);
  }

  update(sourceEquipment) {
    for (const [slotValue, itemClass] of Object.entries(Equipment._itemClassMap)) {
      const slotName = this._getSlotName(slotValue);
      const currentItem = this[slotName];
      const sourceItem = sourceEquipment[slotName];

      if (currentItem === null && sourceItem !== null) {
        this[slotName] = sourceItem;
      }
    }
  }
}

export class Player {
  constructor(playerDict) {
    this.id = playerDict.Id;
    this.name = playerDict.Name;
    this.guild = playerDict.GuildName;
    this.alliance = playerDict.AllianceName;
    this.equipment = new Equipment(playerDict.Equipment);
    this.averageItemPower = playerDict.AverageItemPower;
  }

  toString() {
    let player = `Player: ${this.name}\n`;
    player += `Guild: ${this.guild}\n`;
    player += `Alliance: ${this.alliance}\n`;
    player += `Equipment:\n${this.equipment.toString()}`;
    return player;
  }

  maxAverageItemPower(ipCap, ipSoftcapPercent) {
    return this.equipment.maxAverageItemPower(ipCap, ipSoftcapPercent);
  }

  update(otherPlayer) {
    if (otherPlayer.id === this.id) {
      this.equipment.update(otherPlayer.equipment);
      if (this.averageItemPower === 0 && otherPlayer.averageItemPower > 0) {
        this.averageItemPower = otherPlayer.averageItemPower;
      }
    }
  }
}

export class Event {
  constructor(eventDict) {
    this.id = eventDict.EventId;
    this.killer = new Player(eventDict.Killer);
    this.victim = new Player(eventDict.Victim);
    this.killFame = eventDict.TotalVictimKillFame;
    this.participants = eventDict.Participants.map(p => new Player(p));
    this.groupMembers = eventDict.GroupMembers.map(p => new Player(p));
  }

  toString() {
    let event = `Event: ${this.id} \tKiller: ${this.killer.name} \tVictim: ${this.victim.name}\n`;
    event += `\tParticipants: [${this.participants.map(p => p.name).join(", ")}]\n`;
    event += `\tGroup Members: [${this.groupMembers.map(p => p.name).join(", ")}]\n`;
    return event;
  }
}

export class Battle {
  constructor(battleDict, battleEvents) {
    if (!battleDict) {
      throw new Error("battleDict cannot be null");
    }
    if (!battleEvents) {
      throw new Error(`battle_events cannot be null ${battleDict.id}`);
    }

    this.id = battleDict.id;
    this.startTime = battleDict.startTime;
    this.endTime = battleDict.endTime;
    this.events = battleEvents.map(eventDict => new Event(eventDict));
    this.victimIds = this.events.map(event => event.victim.id);

    this.players = [];
    this._findAndUpdatePlayers();

    this.teamAIds = [];
    this.teamBIds = [];

    this._splitIdsByTeam();
    this._sortTeamsByClass();
  }

  toString() {
    let battle = `Battle: ${this.id} \tStart Time: ${this.startTime} \tEnd Time: ${this.endTime}\n`;
    battle += `\tPlayers: [${this.players.map(p => p.name).join(", ")}]\n`;
    battle += `\tVictims: [${this.victimIds.map(id => this.getPlayer(id)?.name).filter(Boolean).join(", ")}]\n`;
    battle += `\tTeam A:  [${this.teamAIds.map(id => this.getPlayer(id)?.name).filter(Boolean).join(", ")}]\n`;
    battle += `\tTeam B:  [${this.teamBIds.map(id => this.getPlayer(id)?.name).filter(Boolean).join(", ")}]\n`;
    return battle;
  }

  get isHellgate5v5() {
    const tenPlayerBattle = this.players.length === 10;
    if (!tenPlayerBattle) {
      return false;
    }

    const fiveVsFive = this._isXvsXBattle(5);
    if (!fiveVsFive) {
      return false;
    }

    if (VERBOSE_LOGGING) {
      console.log(`[${getCurrentTimeFormatted()}]${this.id} is 5v5`);
    }

    const ipCapped = this._isIPCapped(
      LETHAL_5V5_IP_CAP,
      LETHAL_5V5_SOFTCAP_PERCENT
    );
    if (!ipCapped) {
      return false;
    }

    if (VERBOSE_LOGGING) {
      console.log(`[${getCurrentTimeFormatted()}]${this.id} is IP capped`);
    }

    return true;
  }

  get isHellgate2v2() {
    const fourPlayerBattle = this.players.length === 4;
    if (!fourPlayerBattle) {
      return false;
    }

    if (VERBOSE_LOGGING) {
      console.log(`${this.id} is a 4 man battle`);
    }

    const twoVsTwo = this._isXvsXBattle(2);
    if (!twoVsTwo) {
      return false;
    }

    if (VERBOSE_LOGGING) {
      console.log(`${this.id} is 2v2`);
    }

    const ipCapped = this._isIPCapped(
      LETHAL_2V2_IP_CAP,
      LETHAL_2V2_SOFTCAP_PERCENT
    );
    if (!ipCapped) {
      return false;
    }

    if (VERBOSE_LOGGING) {
      console.log(`${this.id} is IP capped`);
    }

    const isDepths = this.isDepths();
    if (isDepths) {
      return false;
    }

    if (VERBOSE_LOGGING) {
      console.log(`${this.id} is not in depths`);
    }

    return true;
  }

  _isXvsXBattle(x) {
    let hasTeamOfSizeX = false;
    for (const event of this.events) {
      const groupMemberCount = event.groupMembers.length;
      const teamOfSizeGreaterThanX = groupMemberCount > x;

      if (teamOfSizeGreaterThanX) {
        return false;
      }
      if (groupMemberCount === x) {
        hasTeamOfSizeX = true;
      }
    }

    return hasTeamOfSizeX;
  }

  _isIPCapped(ipCap, ipSoftcapPercent) {
    for (const player of this.players) {
      const ACCOUNT_FOR_ARTIFACT_IP = 100;
      if (
        player.averageItemPower >
        player.maxAverageItemPower(ipCap, ipSoftcapPercent) +
        ACCOUNT_FOR_ARTIFACT_IP
      ) {
        if (VERBOSE_LOGGING) {
          console.log(
            `[${getCurrentTimeFormatted()}]\tBattle: ${this.id} \tPlayer ${player.name} has an average item power of ${player.averageItemPower} and max average item power of ${player.maxAverageItemPower(ipCap, ipSoftcapPercent) + ACCOUNT_FOR_ARTIFACT_IP}`
          );
        }
        return false;
      }
    }
    return true;
  }

  isDepths() {
    for (const event of this.events) {
      if (event.killFame === 0) {
        return true;
      }
    }
    return false;
  }

  _splitIdsByTeam() {
    const teamAIds = new Set();
    const teamBIds = new Set();

    const allPlayerIds = new Set(this.players.map(p => p.id));

    if (VERBOSE_LOGGING) {
      console.log(`[${getCurrentTimeFormatted()}]\tSplitting ${this.players.length} players into teams for battle ${this.id}`);
    }

    if (this.events.length > 0) {
      const firstKillerId = this.events[0].killer.id;
      teamAIds.add(firstKillerId);
      if (VERBOSE_LOGGING) {
        console.log(`[${getCurrentTimeFormatted()}]\tFirst killer (Team A): ${this.getPlayer(firstKillerId)?.name || firstKillerId}`);
      }
    }

    for (let i = 0; i <= allPlayerIds.size; i++) {
      for (const event of this.events) {
        const killerId = event.killer.id;
        const victimId = event.victim.id;

        const groupMemberIds = new Set(event.groupMembers.map(p => p.id));

        if (teamAIds.has(killerId)) {
          groupMemberIds.forEach(id => teamAIds.add(id));
          if (!teamAIds.has(victimId)) {
            teamBIds.add(victimId);
          }
        } else if (teamBIds.has(killerId)) {
          groupMemberIds.forEach(id => teamBIds.add(id));
          if (!teamBIds.has(victimId)) {
            teamAIds.add(victimId);
          }
        }

        if (teamAIds.has(victimId)) {
          if (!teamAIds.has(killerId)) {
            teamBIds.add(killerId);
            groupMemberIds.forEach(id => teamBIds.add(id));
          }
        } else if (teamBIds.has(victimId)) {
          if (!teamBIds.has(killerId)) {
            teamAIds.add(killerId);
            groupMemberIds.forEach(id => teamAIds.add(id));
          }
        }
      }
    }

    // Ensure all players are assigned to a team
    // If one team has >= half the players, assign the rest to the other team
    if (teamAIds.size >= this.players.length / 2) {
      // Team A has enough players, assign remaining to Team B
      this.teamAIds = Array.from(teamAIds);
      this.teamBIds = Array.from([...allPlayerIds].filter(x => !teamAIds.has(x)));
    } else if (teamBIds.size >= this.players.length / 2) {
      // Team B has enough players, assign remaining to Team A
      this.teamBIds = Array.from(teamBIds);
      this.teamAIds = Array.from([...allPlayerIds].filter(x => !teamBIds.has(x)));
    } else {
      // Neither team has enough players, assign remaining players to balance teams
      const remainingIds = [...allPlayerIds].filter(x => !teamAIds.has(x) && !teamBIds.has(x));
      
      // Distribute remaining players to balance teams
      for (let i = 0; i < remainingIds.length; i++) {
        if (teamAIds.size < teamBIds.size) {
          teamAIds.add(remainingIds[i]);
        } else {
          teamBIds.add(remainingIds[i]);
        }
      }
      
      this.teamAIds = Array.from(teamAIds);
      this.teamBIds = Array.from(teamBIds);
    }
    
    // Final check: ensure all players are in a team
    const allAssignedIds = new Set([...this.teamAIds, ...this.teamBIds]);
    const missingIds = [...allPlayerIds].filter(x => !allAssignedIds.has(x));
    if (missingIds.length > 0) {
      if (VERBOSE_LOGGING) {
        console.log(`[${getCurrentTimeFormatted()}]\t⚠️  Found ${missingIds.length} unassigned players: ${missingIds.map(id => this.getPlayer(id)?.name || id).join(', ')}`);
      }
      // Assign missing players to the smaller team
      if (this.teamAIds.length <= this.teamBIds.length) {
        this.teamAIds.push(...missingIds);
      } else {
        this.teamBIds.push(...missingIds);
      }
    }
    
    if (VERBOSE_LOGGING) {
      console.log(`[${getCurrentTimeFormatted()}]\tTeam A (${this.teamAIds.length} players): ${this.teamAIds.map(id => this.getPlayer(id)?.name || id).join(', ')}`);
      console.log(`[${getCurrentTimeFormatted()}]\tTeam B (${this.teamBIds.length} players): ${this.teamBIds.map(id => this.getPlayer(id)?.name || id).join(', ')}`);
    }
  }

  getPlayer(id) {
    return this.players.find(p => p.id === id) || null;
  }

  _sortTeamsByClass() {
    this.teamAIds = this._sortTeam(this.teamAIds);
    this.teamBIds = this._sortTeam(this.teamBIds);
  }

  _sortTeam(team) {
    const healers = [];
    const melees = [];
    const tanks = [];
    const leathers = [];
    const cloth = [];
    const unknown = [];

    for (const playerId of team) {
      const player = this.getPlayer(playerId);
      if (!player) continue;

      if (
        player.equipment.mainhand !== null &&
        player.equipment.mainhand.isHealingWeapon
      ) {
        healers.push(playerId);
        continue;
      }

      if (player.equipment.armor !== null) {
        if (player.equipment.armor.isPlate) {
          if (
            player.equipment.armor.type.includes("ROYAL") ||
            player.equipment.armor.type.includes("SET1")
          ) {
            melees.push(playerId);
            continue;
          }

          tanks.push(playerId);
          continue;
        }

        if (player.equipment.armor.isLeather) {
          leathers.push(playerId);
          continue;
        }

        if (player.equipment.armor.isCloth) {
          cloth.push(playerId);
          continue;
        }
      } else {
        unknown.push(playerId);
        continue;
      }
    }

    const key = (playerId) => {
      const player = this.getPlayer(playerId);
      if (!player || !player.equipment.mainhand) {
        return "Z";
      }
      return player.equipment.mainhand.type;
    };

    cloth.sort((a, b) => key(a).localeCompare(key(b)));
    unknown.sort((a, b) => key(a).localeCompare(key(b)));
    tanks.sort((a, b) => key(a).localeCompare(key(b)));
    melees.sort((a, b) => key(a).localeCompare(key(b)));
    leathers.sort((a, b) => key(a).localeCompare(key(b)));
    healers.sort((a, b) => key(a).localeCompare(key(b)));

    return [...unknown, ...tanks, ...melees, ...leathers, ...cloth, ...healers];
  }

  _findAndUpdatePlayers() {
    for (const event of this.events) {
      const allPlayers = [
        ...event.participants,
        ...event.groupMembers,
        event.killer,
        event.victim,
      ];
      for (const player of allPlayers) {
        const existingPlayer = this.getPlayer(player.id);
        if (existingPlayer === null) {
          this.players.push(player);
        } else {
          existingPlayer.update(player);
        }
      }
    }
  }
}

