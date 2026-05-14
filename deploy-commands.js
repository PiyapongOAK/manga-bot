// deploy-commands.js — รันครั้งเดียวเพื่อลงทะเบียน Slash Commands
// วิธีใช้: node deploy-commands.js
require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');

const commands = [];
const commandFiles = fs.readdirSync('./commands').filter(f => f.endsWith('.js'));
for (const file of commandFiles) {
  const cmd = require(`./commands/${file}`);
  commands.push(cmd.data.toJSON());
}

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log('⏳ กำลังลงทะเบียน Slash Commands...');
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );
    console.log('✅ ลงทะเบียนสำเร็จ! คำสั่งพร้อมใช้งานแล้ว');
  } catch (err) {
    console.error(err);
  }
})();
