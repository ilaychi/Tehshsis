const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('stop').setDescription('Stop playback and clear queue'),
  async execute({ interaction, queues }) {
    await interaction.deferReply({ ephemeral: true });
    const q = queues.get(interaction.guildId);
    if (!q) return interaction.editReply('Nothing to stop.');
    try {
      q.tracks = [];
      if (q.audioPlayer) q.audioPlayer.stop();
      if (q.voiceConnection) q.voiceConnection.destroy();
      queues.delete(interaction.guildId);
      await interaction.editReply('Stopped playback and cleared the queue.');
    } catch (err) {
      console.error('Stop error:', err);
      await interaction.editReply('Unable to stop right now.');
    }
  }
};
