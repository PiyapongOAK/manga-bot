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

// ── ระบบจดจำที่อ่านแล้ว (เก็บในไฟล์ seen.json) ───────────
function loadSeen() {
  try {
    return JSON.parse(fs.readFileSync('./seen.json', 'utf8'));
  } catch {
    return {};
  }
}
function saveSeen(data) {
  fs.writeFileSync('./seen.json', JSON.stringify(data, null, 2));
}

// ── ฟังก์ชันส่งแจ้งเตือนเข้า Discord ────────────────────
async function checkAndNotify() {
  const channel = client.channels.cache.get(process.env.NEWS_CHANNEL_ID);
  if (!channel) return;

  const updates = await scrapeLatestUpdates();
  if (!updates.length) return;

  const seen = loadSeen();
  let hasNew = false;

  for (const manga of updates) {
    // key = ชื่อเรื่อง + ตอน เพื่อตรวจสอบว่าเคยแจ้งแล้วหรือยัง
    const key = `${manga.slug}::${manga.latestChapter}`;
    if (seen[key]) continue;

    seen[key] = Date.now();
    hasNew = true;

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

    await channel.send({ embeds: [embed] });

    // หน่วง 1.5 วิ ระหว่างแต่ละเรื่อง ไม่ให้ส่งติดกันเร็วเกินไป
    await new Promise(r => setTimeout(r, 1500));
  }

  if (hasNew) saveSeen(seen);
}

// ── เมื่อบอทออนไลน์ ──────────────────────────────────────
client.once('ready', () => {
  console.log(`✅ บอทพร้อมแล้ว! เข้าสู่ระบบในชื่อ: ${client.user.tag}`);

  // เช็คทุก 15 นาที (ปรับได้ตามต้องการ)
  // รูปแบบ: '*/15 * * * *' = ทุก 15 นาที
  //         '0 * * * *'   = ทุก 1 ชั่วโมง
  cron.schedule('*/1 * * * *', async () => {
    console.log('🔍 กำลังเช็คอัปเดตใหม่...');
    await checkAndNotify();
  });

  // เช็คครั้งแรกทันทีที่บอทเปิด
  checkAndNotify();
});

// ── เปิดบอท ───────────────────────────────────────────────
client.login(process.env.DISCORD_TOKEN);
