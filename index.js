// ============================================================
//  index.js  —  จุดเริ่มต้นของบอท + ระบบเช็คอัปเดตอัตโนมัติ
// ============================================================
require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs   = require('fs');
const cron = require('node-cron');
const { scrapeLatestUpdates } = require('./scraper');

// ── สร้าง Client ──────────────────────────────────────────
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands = new Collection();

// ── โหลด Commands อัตโนมัติ ──────────────────────────────
const commandFiles = fs.readdirSync('./commands').filter(f => f.endsWith('.js'));
for (const file of commandFiles) {
  const cmd = require(`./commands/${file}`);
  client.commands.set(cmd.data.name, cmd);
}

// ── โหลด Events อัตโนมัติ ────────────────────────────────
const eventFiles = fs.readdirSync('./events').filter(f => f.endsWith('.js'));
for (const file of eventFiles) {
  const event = require(`./events/${file}`);
  client.on(event.name, (...args) => event.execute(...args, client));
}

const { createClient } = require('redis');

// ── ตั้งค่า Redis ──────────────────────────────────────────
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', err => console.error('Redis Client Error', err));

(async () => {
  await redisClient.connect();
  console.log('✅ เชื่อมต่อ Redis สำเร็จ!');
})();

// ── ฟังก์ชันส่งแจ้งเตือนเข้า Discord ────────────────────
async function checkAndNotify() {
  let channel;
  try {
    channel = await client.channels.fetch(process.env.NEWS_CHANNEL_ID);
  } catch (e) {
    console.error('❌ หา Channel ไม่เจอ:', e.message, '| NEWS_CHANNEL_ID =', process.env.NEWS_CHANNEL_ID);
    return;
  }
  if (!channel) return;

  const updates = await scrapeLatestUpdates();
  if (!updates.length) return;

  for (const manga of updates) {
    // key = ชื่อเรื่อง + ตอน เพื่อตรวจสอบว่าเคยแจ้งแล้วหรือยัง
    const key = `seen:${manga.slug}:${manga.latestChapter}`;
    
    // ตรวจสอบใน Redis ว่าเคยส่งไปหรือยัง
    const alreadySeen = await redisClient.get(key);
    if (alreadySeen) continue;

    // บันทึกลง Redis (เก็บไว้ 7 วันเพื่อประหยัดพื้นที่ หรือไม่ใส่ก็ได้)
    await redisClient.set(key, Date.now().toString(), {
      EX: 60 * 60 * 24 * 7 // 7 days
    });

    // สร้าง Embed สวยงามพร้อมปกเรื่อง
    const { EmbedBuilder } = require('discord.js');
    const embed = new EmbedBuilder()
      .setColor('#ff6d38')                       // สีส้มตาม theme ของ up-manga
      .setAuthor({
        name: '📚 อัปเดตใหม่จาก Up-Manga',
        iconURL: 'https://www.up-manga.com/wp-content/uploads/2023/09/v3.png',
        url: 'https://www.up-manga.com'
      })
      .setTitle(manga.title)
      .setURL(manga.url)
      .setDescription(`**ตอนที่ ${manga.latestChapter}** พร้อมให้อ่านแล้ว! 🔥`)
      .setThumbnail(manga.coverImage)            // ภาพปกเรื่อง
      .addFields(
        { name: '📖 ตอนล่าสุด', value: `ตอนที่ ${manga.latestChapter}`, inline: true },
        { name: '🏷️ ประเภท',   value: manga.type || 'Manhwa',           inline: true }
      )
      .setFooter({ text: 'Up-Manga อัพมังงะ • อ่านฟรีออนไลน์' })
      .setTimestamp();

    await channel.send({ 
      content: process.env.USER_ID ? `<@${process.env.USER_ID}>` : null,
      embeds: [embed] 
    });

    // หน่วง 1.5 วิ ระหว่างแต่ละเรื่อง ไม่ให้ส่งติดกันเร็วเกินไป
    await new Promise(r => setTimeout(r, 1500));
  }
}

// ── เมื่อบอทออนไลน์ ──────────────────────────────────────
client.once('ready', () => {
  console.log(`✅ บอทพร้อมแล้ว! เข้าสู่ระบบในชื่อ: ${client.user.tag}`);

  // เช็คทุก 1 นาที เพื่อความรวดเร็ว (Real-time)
  cron.schedule('* * * * *', async () => {
    console.log('🔍 กำลังเช็คอัปเดตใหม่ (รอบ 1 นาที)...');
    await checkAndNotify();
  });

  // เช็คครั้งแรกทันทีที่บอทเปิด
  checkAndNotify();
});

// ── เปิดบอท ───────────────────────────────────────────────
client.login(process.env.DISCORD_TOKEN);
