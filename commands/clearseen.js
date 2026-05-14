const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createClient } = require('redis');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clearseen')
    .setDescription('ล้างประวัติ ให้บอทแจ้งข่าวทั้งหมดใหม่อีกครั้ง (Admin เท่านั้น)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction) {
    // เชื่อมต่อ Redis เฉพาะกิจ
    const redisClient = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
    
    try {
      await redisClient.connect();
      
      // ล้างข้อมูลทั้งหมดใน Database
      await redisClient.flushDb();
      
      await redisClient.disconnect();
      await interaction.reply({
        content: '✅ ล้างประวัติใน Redis สำเร็จ! ลอง /checknow ได้เลยครับ',
        ephemeral: true
      });
    } catch (e) {
      if (redisClient.isOpen) await redisClient.disconnect();
      await interaction.reply({
        content: `❌ เกิดข้อผิดพลาดกับ Redis: ${e.message}`,
        ephemeral: true
      });
    }
  }
};
