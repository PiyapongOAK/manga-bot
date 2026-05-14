// commands/ping.js — ทดสอบว่าบอทยังทำงานอยู่ไหม
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('เช็คว่าบอทยังออนไลน์อยู่ไหม'),

  async execute(interaction) {
    const ping = interaction.client.ws.ping;
    await interaction.reply({
      content: `🏓 บอทยังอยู่นะ! Ping: **${ping}ms**`,
      ephemeral: true
    });
  }
};
