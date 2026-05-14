// commands/clearseen.js — ล้างประวัติที่เคยแจ้งไปแล้ว
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clearseen')
    .setDescription('ล้างประวัติ ให้บอทแจ้งข่าวทั้งหมดใหม่อีกครั้ง (Admin เท่านั้น)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction) {
    try {
      fs.writeFileSync('./seen.json', '{}');
      await interaction.reply({
        content: '✅ ล้างประวัติสำเร็จ! ลอง /checknow ได้เลยครับ',
        ephemeral: true
      });
    } catch (e) {
      await interaction.reply({
        content: `❌ เกิดข้อผิดพลาด: ${e.message}`,
        ephemeral: true
      });
    }
  }
};
