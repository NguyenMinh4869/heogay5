# Albion Online Hellgate Watcher

A Discord bot that monitors and reports recent 2v2 and 5v5 Hellgate battles from Albion Online servers.

## Features

- **Automatic Battle Reporting:** Periodically checks for new Hellgate battles on the specified Albion Online servers (Europe, Americas, and Asia).
- **Image Generation:** Generates images of battle reports, showing the teams, their gear, and the outcome.
- **Server and Mode specific:** Allows setting up different channels for different servers and Hellgate modes (2v2 or 5v5).
- **Configurable:** Most settings, such as the battle check interval and image generation settings, can be configured.

## Commands

The bot uses a slash command to set the channel for battle reports:

- `/setchannel <server> <mode> <channel>`: Sets the channel for Hellgate battle reports.
  - **server:** The Albion Online server to get reports from (`Europe`, `Americas`, or `Asia`).
  - **mode:** The Hellgate mode (`2v2` or `5v5`).
  - **channel:** The Discord channel where the reports will be sent.

This command requires administrator permissions.

## Setup and Installation

### Prerequisites

- Node.js 18.0 or higher.
- npm or yarn package manager.

**For Windows users:** The `canvas` package requires native compilation. You need to install build tools:

### 1. Clone the repository

```bash
git clone https://github.com/your-username/hellgate-watcher.git
cd hellgate-watcher
```

### 2. Install dependencies

```bash
npm install
```


**If canvas installation fails on Windows:**
- Make sure you've installed the build tools (see above)
- Try installing canvas separately:
  ```bash
  npm install canvas --build-from-source
  ```
- Or use the pre-built binaries (if available for your Node.js version):
  ```bash
  npm install canvas --canvas_binary_host_mirror=https://github.com/Automattic/node-canvas/releases/download/
  ```

### 3. Configure the bot

Create a `.env` file in the root directory and add your Discord bot token:

```
DISCORDTOKEN=your_discord_bot_token
```

### 4. Run the bot

```bash
npm start
```

For development with auto-reload:

```bash
npm run dev
```

## Configuration

The bot can be configured by editing the `config.js` file. Here are some of the most important settings:

- `BATTLE_CHECK_INTERVAL_MINUTES`: The interval in minutes at which the bot checks for new battles.
- `BATTLES_MAX_AGE_MINUTES`: The maximum age of battles to report.
- `VERBOSE_LOGGING`: Set to `true` for more detailed logging.

The image generation settings can also be tweaked in the `config.js` file.

## Project Structure

```
.
├── .gitignore
├── config.js             # Bot and image generation settings
├── index.js              # Main entry point of the bot
├── package.json          # Project metadata and dependencies
├── README.md             # This file
├── data/
│   ├── channels.json     # Stores the channel mappings
│   └── reported_battles.json # Stores the IDs of reported battles
├── images/               # Folder for generated images
└── src/
    ├── albion_objects.js # Albion Online data objects
    ├── bot.js            # Discord bot logic and commands
    ├── hellgate_watcher.js # Fetches and processes battle reports
    └── utils.js          # Utility functions
```

## Dependencies

- **discord.js**: Discord bot framework
- **canvas**: Image generation and manipulation
- **sharp**: Image processing
- **axios**: HTTP client for API requests
- **dotenv**: Environment variable management

## Notes

- The bot requires system fonts for text rendering (Arial). On Linux, you may need to install fonts:
  ```bash
  sudo apt-get install fonts-liberation fonts-dejavu-core
  ```
- On some systems, you may need to install canvas dependencies separately. See [node-canvas installation guide](https://github.com/Automattic/node-canvas#compiling) for platform-specific instructions.
