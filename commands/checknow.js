// commands/checknow.js — สั่งให้บอทเช็คอัปเดตทันที (Admin only)
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { scrapeLatestUpdates } = require('../scraper');
const fs = require('fs');

function loadSeen() {
  try { return JSON.parse(fs.readFileSync('./seen.json', 'utf8')); }
  catch { return {}; }
}
function saveSeen(data) {
  fs.writeFileSync('./seen.json', JSON.stringify(data, null, 2));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('checknow')
    .setDescription('เช็คอัปเดตมังงะทันทีโดยไม่ต้องรอ (Admin เท่านั้น)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction) {
    const { MessageFlags } = require('discord.js');

    // ตอบ interaction ก่อนทันที (ต้องทำภายใน 3 วิ ไม่งั้น timeout)
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    // หา channel ที่จะส่งข่าว
    let newsChannel;
    try {
      newsChannel = await interaction.client.channels.fetch(process.env.NEWS_CHANNEL_ID);
    } catch (e) {
      return interaction.editReply(`❌ หา Channel ไม่เจอ: ${e.message}\nเช็ค NEWS_CHANNEL_ID ใน Railway ด้วยครับ`);
    }

    const updates = await scrapeLatestUpdates();
    if (!updates.length) {
      return interaction.editReply('❌ ดึงข้อมูลไม่ได้ ลองใหม่อีกครั้ง');
    }

    const seen   = loadSeen();
    let newCount = 0;

    for (const manga of updates) {
      const key = `${manga.slug}::${manga.latestChapter}`;
      if (seen[key]) continue;

      seen[key] = Date.now();
      newCount++;

      const embed = new EmbedBuilder()
        .setColor('#ff6d38')
        .setAuthor({
          name: '📚 อัปเดตใหม่จาก Up-Manga',
          iconURL: 'https://www.up-manga.com/wp-content/uploads/2023/09/v3.png',
          url: 'https://www.up-manga.com'
        })
        .setTitle(manga.title)
        .setURL(manga.url)
        .setDescription(`**ตอนที่ ${manga.latestChapter}** พร้อมให้อ่านแล้ว! 🔥`)
        .setThumbnail(manga.coverImage)
        .addFields(
          { name: '📖 ตอนล่าสุด', value: `ตอนที่ ${manga.latestChapter}`, inline: true },
          { name: '🏷️ ประเภท',   value: manga.type || 'Manhwa',           inline: true }
        )
        .setFooter({ text: 'Up-Manga อัพมังงะ • อ่านฟรีออนไลน์' })
        .setTimestamp();

      // ส่งเข้า NEWS channel โดยตรง ไม่ใช้ interaction.channel
      await newsChannel.send({ 
        content: process.env.USER_ID ? `<@${process.env.USER_ID}>` : null,
        embeds: [embed] 
      });
      await new Promise(r => setTimeout(r, 1500));
    }

    saveSeen(seen);
    await interaction.editReply(
      newCount > 0
        ? `✅ พบ **${newCount}** เรื่องใหม่ ส่งเข้า <#${process.env.NEWS_CHANNEL_ID}> แล้ว!`
        : '📭 ไม่มีอัปเดตใหม่ตั้งแต่ครั้งที่แล้ว'
    );
  }
};
