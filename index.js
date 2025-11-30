import dotenv from 'dotenv';
import client from './src/bot.js';

dotenv.config();

const DISCORD_TOKEN = process.env.DISCORD_TOKEN || process.env.DISCORDTOKEN;

if (!DISCORD_TOKEN) {
  console.error('Error: DISCORD_TOKEN or DISCORDTOKEN environment variable is not set!');
  console.error('Please create a .env file with DISCORD_TOKEN=your_token_here');
  process.exit(1);
}

client.login(DISCORD_TOKEN);

