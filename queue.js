const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder().setName('queue').setDescription('Show current queue'),
  async execute({ interaction, queues }) {
    await interaction.deferReply();
    const q = queues.get(interaction.guildId);
    if (!q || q.tracks.length === 0) return interaction.editReply('Queue is empty.');
    const embed = new EmbedBuilder()
      .setTitle('Queue')
      .setDescription(q.tracks.slice(0,10).map((t,i)=>`**${i+1}.** ${t.title}`).join('\n'))
      .setFooter({ text: `Total: ${q.tracks.length}` });
    await interaction.editReply({ embeds: [embed] });
  }
};
