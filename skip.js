const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('skip').setDescription('Skip current track'),
  async execute({ interaction, queues }) {
    await interaction.deferReply({ ephemeral: true });
    const q = queues.get(interaction.guildId);
    if (!q || q.tracks.length === 0) return interaction.editReply('Nothing to skip.');
    try {
      q.audioPlayer.stop(true);
      await interaction.editReply('Skipped current track.');
    } catch (err) {
      console.error('Skip error:', err);
      await interaction.editReply('Unable to skip right now.');
    }
  }
};
