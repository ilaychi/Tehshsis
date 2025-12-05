Replit Play-DL YouTube Music Bot
================================

Features:
- YouTube-only playback using play-dl + YouTube Data API key
- Command queue per-guild
- Slash commands: /play, /skip, /stop, /queue
- Designed for Replit (auto npm install + start)

Setup:
1. Rename .env.example -> .env and fill DISCORD_TOKEN, CLIENT_ID and YT_API_KEY.
2. Import project into Replit or upload files.
3. Replit will run `npm install && npm start` automatically (see .replit).
4. Invite bot to your server and use /play to start playing.

Notes:
- Use Node 18+ (Replit's default is fine).
- The first time the bot registers slash commands; give it a minute to propagate if global.
