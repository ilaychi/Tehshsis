require('dotenv').config();
const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const playdl = require('play-dl');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, NoSubscriberBehavior } = require('@discordjs/voice');

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID; // optional for dev
const ytApiKey = process.env.YT_API_KEY;

if (!token) {
  console.error('DISCORD_TOKEN not set in .env');
  process.exit(1);
}

if (ytApiKey) {
  try { playdl.setToken({ youtube: ytApiKey }); console.log('YouTube API key set for play-dl'); }
  catch(e){ console.warn('Could not set YT API key for play-dl:', e?.message || e); }
}

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates] });
client.commands = new Collection();
const commands = [];
const commandFiles = fs.readdirSync(path.join(__dirname, 'commands')).filter(f => f.endsWith('.js'));
for (const file of commandFiles) {
  const cmd = require(path.join(__dirname, 'commands', file));
  client.commands.set(cmd.data.name, cmd);
  commands.push(cmd.data.toJSON());
}

// Register commands (guild-scoped if GUILD_ID provided)
(async () => {
  if (!clientId) {
    console.warn('CLIENT_ID not provided; skipping automatic command registration.');
    return;
  }
  const rest = new REST({ version: '10' }).setToken(token);
  try {
    if (guildId) {
      console.log('Registering guild commands...');
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
      console.log('Registered guild commands.');
    } else {
      console.log('Registering global commands (may take up to 1 hour)...');
      await rest.put(Routes.applicationCommands(clientId), { body: commands });
      console.log('Registered global commands.');
    }
  } catch (err) {
    console.error('Failed to register commands:', err);
  }
})();

// Per-guild queues
const queues = new Map(); // guildId -> { voiceConnection, audioPlayer, tracks: [] }

function createQueue(guildId) {
  const audioPlayer = createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Play } });
  const q = { voiceConnection: null, audioPlayer, tracks: [] };
  queues.set(guildId, q);

  audioPlayer.on('stateChange', (oldState, newState) => {
    if (newState.status === AudioPlayerStatus.Idle) {
      // play next if exists
      setTimeout(() => playNext(guildId), 200);
    }
  });
  audioPlayer.on('error', e => console.error('Audio player error:', e));
  return q;
}

async function playNext(guildId) {
  const q = queues.get(guildId);
  if (!q) return;
  const next = q.tracks.shift();
  if (!next) {
    // disconnect after 5 minutes idle
    if (q.voiceConnection) {
      setTimeout(() => {
        try { q.voiceConnection.destroy(); } catch(e) {}
        queues.delete(guildId);
      }, 5*60*1000);
    }
    return;
  }
  try {
    const source = await playdl.stream(next.url, { discordPlayerCompatibility: true });
    const resource = createAudioResource(source.stream, { inputType: source.type });
    q.audioPlayer.play(resource);
    console.log('Now playing:', next.title);
  } catch (err) {
    console.error('Failed to play track:', err);
    setTimeout(() => playNext(guildId), 1000);
  }
}

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const command = client.commands.get(interaction.commandName);
  if (!command) return;
  try {
    await command.execute({ interaction, queues, createQueue, joinVoiceChannel, playNext, playdl });
  } catch (err) {
    console.error('Command error:', err);
    if (interaction.replied || interaction.deferred) await interaction.followUp({ content: 'Command failed.', ephemeral: true });
    else await interaction.reply({ content: 'Command failed.', ephemeral: true });
  }
});

client.once('ready', () => console.log('Logged in as', client.user.tag));
client.login(token);
