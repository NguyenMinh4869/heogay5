import {
  Client,
  GatewayIntentBits,
  Collection,
  Events,
  SlashCommandBuilder,
  PermissionFlagsBits,
} from 'discord.js';
import {
  BattleReportImageGenerator,
  HellgateWatcher,
  clearBattleReportsImages,
  clearEquipmentsImages,
  clearReportedBattles,
} from './hellgate_watcher.js';
import fs from 'fs';
import fsSync from 'fs';
import path from 'path';
import {
  CHANNELS_JSON_PATH,
  BATTLE_CHECK_INTERVAL_MINUTES,
  VERBOSE_LOGGING,
} from '../config.js';
import { getCurrentTimeFormatted } from './utils.js';

function loadChannels() {
  try {
    const data = fsSync.readFileSync(CHANNELS_JSON_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return {};
    }
    return {};
  }
}

function saveChannels(channelMap) {
  const directory = path.dirname(CHANNELS_JSON_PATH);
  if (!fsSync.existsSync(directory)) {
    fsSync.mkdirSync(directory, { recursive: true });
  }
  fsSync.writeFileSync(CHANNELS_JSON_PATH, JSON.stringify(channelMap, null, 2));
}

// DISCORD BOT
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    // MessageContent not needed - bot only uses slash commands
  ],
});

// Build the slash command
const setChannelCommand = new SlashCommandBuilder()
  .setName('setchannel')
  .setDescription('Sets the channel for hellgate battle reports.')
  .addStringOption((option) =>
    option
      .setName('server')
      .setDescription('The server to get reports from.')
      .setRequired(true)
      .addChoices(
        { name: 'Europe', value: 'europe' },
        { name: 'Americas', value: 'americas' },
        { name: 'Asia', value: 'asia' }
      )
  )
  .addStringOption((option) =>
    option
      .setName('mode')
      .setDescription('The hellgate mode (2v2 or 5v5).')
      .setRequired(true)
      .addChoices(
        { name: '5v5', value: '5v5' },
        { name: '2v2', value: '2v2' }
      )
  )
  .addChannelOption((option) =>
    option
      .setName('channel')
      .setDescription('The channel where reports will be sent.')
      .setRequired(true)
  );

// Function to register commands for a guild
async function registerCommandsForGuild(guild) {
  try {
    await guild.commands.create(setChannelCommand);
    console.log(`[${getCurrentTimeFormatted()}]\t✅ Slash command 'setchannel' registered for guild: ${guild.name} (${guild.id})`);
  } catch (error) {
    if (error.code === 50001) {
      console.log(`[${getCurrentTimeFormatted()}]\t⚠️  Missing permissions to register commands in guild: ${guild.name} (${guild.id})`);
    } else if (error.code === 50035) {
      console.log(`[${getCurrentTimeFormatted()}]\t⚠️  Invalid command format for guild: ${guild.name} (${guild.id})`);
    } else {
      console.error(`[${getCurrentTimeFormatted()}]\t❌ Error registering commands for guild ${guild.name} (${guild.id}):`, error.message);
    }
  }
}

// Function to register commands globally (slower, but works for all guilds)
async function registerCommandsGlobally() {
  try {
    await client.application.commands.create(setChannelCommand);
    console.log(`[${getCurrentTimeFormatted()}]\t✅ Slash command 'setchannel' registered globally (may take up to 1 hour to sync)`);
  } catch (error) {
    if (error.code === 50001) {
      console.log(`[${getCurrentTimeFormatted()}]\t⚠️  Missing permissions to register global commands. Trying guild-specific registration...`);
      // Fallback to guild-specific registration
      return false;
    } else {
      console.error(`[${getCurrentTimeFormatted()}]\t❌ Error registering global commands:`, error.message);
      return false;
    }
  }
  return true;
}

client.once(Events.ClientReady, async (readyClient) => {
  console.log(
    `[${getCurrentTimeFormatted()}]\tLogged in as ${readyClient.user.tag} (ID: ${readyClient.user.id})`
  );

  // Try to register commands globally first
  const globalSuccess = await registerCommandsGlobally();
  
  // If global registration failed or we want faster sync, register for each guild
  if (!globalSuccess || readyClient.guilds.cache.size <= 5) {
    console.log(`[${getCurrentTimeFormatted()}]\tRegistering commands for ${readyClient.guilds.cache.size} guild(s)...`);
    for (const guild of readyClient.guilds.cache.values()) {
      await registerCommandsForGuild(guild);
    }
  }

  // Start battle checking loop
  checkForNewBattles();
  setInterval(checkForNewBattles, BATTLE_CHECK_INTERVAL_MINUTES * 60 * 1000);

  // Start storage clearing loop (24 hours)
  setInterval(async () => {
    console.log(`[${getCurrentTimeFormatted()}]\tClearing storage...`);
    await clearBattleReportsImages();
    await clearEquipmentsImages();
    clearReportedBattles();
  }, 24 * 60 * 60 * 1000);

  console.log(`[${getCurrentTimeFormatted()}]\tBattle report watcher started.`);
});

// Register commands when bot joins a new guild
client.on(Events.GuildCreate, async (guild) => {
  console.log(`[${getCurrentTimeFormatted()}]\tBot joined new guild: ${guild.name} (${guild.id})`);
  await registerCommandsForGuild(guild);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'setchannel') {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      await interaction.reply({
        content: 'This command requires administrator permissions.',
        ephemeral: true,
      });
      return;
    }

    if (!interaction.guild) {
      await interaction.reply({
        content: 'This command can only be used in a server.',
        ephemeral: true,
      });
      return;
    }

    const server = interaction.options.getString('server');
    const mode = interaction.options.getString('mode');
    const channel = interaction.options.getChannel('channel');

    if (!channel) {
      await interaction.reply({
        content: 'Please provide a valid channel.',
        ephemeral: true,
      });
      return;
    }

    const me = interaction.guild.members.me;
    if (!channel.permissionsFor(me).has(PermissionFlagsBits.SendMessages)) {
      await interaction.reply({
        content: "I don't have permissions to send messages in that channel.",
        ephemeral: true,
      });
      return;
    }

    const channelsMap = loadChannels();
    if (!channelsMap[server]) {
      channelsMap[server] = {};
    }
    if (!channelsMap[server][mode]) {
      channelsMap[server][mode] = {};
    }
    channelsMap[server][mode][interaction.guild.id] = channel.id;
    saveChannels(channelsMap);

    await interaction.reply(
      `Hellgate ${mode} reports for **${server.charAt(0).toUpperCase() + server.slice(1)}** will now be sent to ${channel}.`
    );
  }
});

async function checkForNewBattles() {
  console.log(`[${getCurrentTimeFormatted()}]\tChecking for new battle reports...`);
  const recentHellgates = await HellgateWatcher.getRecentBattles();

  const channelsPerServer = loadChannels();

  for (const server of ['europe', 'americas', 'asia']) {
    if (!channelsPerServer[server]) {
      continue;
    }
    const serverChannels = channelsPerServer[server];
    for (const mode of ['5v5', '2v2']) {
      if (!serverChannels[mode]) {
        continue;
      }
      const channelsMap = serverChannels[mode];
      if (!recentHellgates[server][mode] || recentHellgates[server][mode].length === 0) {
        continue;
      }

      for (const [guildId, channelId] of Object.entries(channelsMap)) {
        try {
          const channel = await client.channels.fetch(channelId);
          if (VERBOSE_LOGGING) {
            console.log(
              `[${getCurrentTimeFormatted()}]\tFound channel '${channel.name}' (${channelId})`
            );
          }

          if (!channel.permissionsFor(channel.guild.members.me).has(PermissionFlagsBits.SendMessages)) {
            console.log(
              `[${getCurrentTimeFormatted()}]\tNo permission to send messages in channel ${channel.name} (${channelId}). Skipping.`
            );
            continue;
          }

          let battleReports = [];

          if (mode === '5v5') {
            battleReports = await BattleReportImageGenerator.generateBattleReports5v5(
              recentHellgates[server][mode]
            );
          } else if (mode === '2v2') {
            battleReports = await BattleReportImageGenerator.generateBattleReports2v2(
              recentHellgates[server][mode]
            );
          }

          for (const battleReportPath of battleReports) {
            try {
              const file = {
                attachment: battleReportPath,
                name: path.basename(battleReportPath),
              };
              await channel.send({ files: [file] });
              console.log(
                `[${getCurrentTimeFormatted()}]\tSent battle report (${path.basename(battleReportPath)}) to channel ${channel.name} (${channelId})`
              );
            } catch (error) {
              if (error.code === 'ENOENT') {
                console.log(
                  `[${getCurrentTimeFormatted()}]\tError: Battle report file not found at ${battleReportPath}`
                );
              } else {
                console.log(
                  `[${getCurrentTimeFormatted()}]\tError sending message to channel ${channel.name} (${channelId}): ${error.message}`
                );
              }
            }
          }
        } catch (error) {
          if (error.code === 10003) {
            // Channel not found
            if (VERBOSE_LOGGING) {
              console.log(
                `[${getCurrentTimeFormatted()}]\tChannel ${channelId} not found. Skipping.`
              );
            }
            continue;
          } else if (error.code === 50001) {
            // Missing access
            if (VERBOSE_LOGGING) {
              console.log(
                `[${getCurrentTimeFormatted()}]\tNo permission to fetch channel ${channelId}. Skipping.`
              );
            }
            continue;
          } else {
            console.error(`Error fetching channel ${channelId}:`, error);
          }
        }
      }
    }
  }
  console.log(
    `[${getCurrentTimeFormatted()}]\tFinished checking for new battle reports.`
  );
}

export default client;

