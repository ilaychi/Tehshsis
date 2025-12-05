const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Play a YouTube track (search or URL)')
    .addStringOption(opt => opt.setName('query').setDescription('Search text or YouTube URL').setRequired(true)),
  async execute({ interaction, queues, createQueue, joinVoiceChannel, playNext, playdl }) {
    await interaction.deferReply();
    const query = interaction.options.getString('query', true);
    const member = interaction.member;
    const voiceChannel = member.voice.channel;
    if (!voiceChannel) return interaction.editReply('You must be in a voice channel.');

    // permissions
    const perms = voiceChannel.permissionsFor(interaction.client.user);
    if (!perms || !perms.has(PermissionsBitField.Flags.Connect) || !perms.has(PermissionsBitField.Flags.Speak)) {
      return interaction.editReply('I need permission to join and speak in your voice channel.');
    }

    let q = queues.get(interaction.guildId);
    if (!q) q = createQueue(interaction.guildId);

    try {
      let url;
      if (playdl.yt_validate(query) === 'video') url = query;
      else {
        const results = await playdl.search(query, { limit: 1 });
        if (!results || results.length === 0) return interaction.editReply('No results found.');
        url = results[0].url;
      }

      // get title (safe)
      const info = await playdl.video_info(url);
      const title = info.video_details.title || url;

      q.tracks.push({ title, url, requestedBy: interaction.user.tag });

      // join if not connected
      if (!q.voiceConnection) {
        q.voiceConnection = joinVoiceChannel({
          channelId: voiceChannel.id,
          guildId: interaction.guildId,
          adapterCreator: interaction.guild.voiceAdapterCreator
        });
        q.voiceConnection.subscribe(q.audioPlayer);
      }

      await interaction.editReply(`Queued **${title}** — position ${q.tracks.length}`);

      // if player idle, start playNext
      if (q.audioPlayer.state.status === 'idle') setTimeout(() => playNext(interaction.guildId), 300);

    } catch (err) {
      console.error('Play command error:', err);
      return interaction.editReply('Error searching/playing that track.');
    }
  }
};
