// scraper.js — เวอร์ชันแก้ไขสำหรับเว็บที่มี Cloudflare
const axios   = require('axios');
const cheerio = require('cheerio');

const BASE_URL   = 'https://www.up-manga.com';
const UPDATE_URL = `${BASE_URL}/manga/?order=update`;

// Headers ละเอียดขึ้น เลียนแบบ Browser จริงๆ
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'th-TH,th;q=0.9,en-US;q=0.8,en;q=0.7',
  'Accept-Encoding': 'gzip, deflate, br',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Cache-Control': 'max-age=0',
};

async function scrapeLatestUpdates() {
  try {
    const { data } = await axios.get(UPDATE_URL, {
      headers: HEADERS,
      timeout: 20000,
    });

    const $       = cheerio.load(data);
    const results = [];

    // ลอง selector หลายแบบ เผื่อเว็บอัปเดต HTML structure
    const selectors = [
      '.listupd .utao',
      '.listupd .bsx',
      '.listupd .bs',
      '.mnglist .utao',
    ];

    let items = $();
    for (const sel of selectors) {
      items = $(sel);
      if (items.length > 0) break;
    }

    // ถ้ายังหาไม่เจอ ลองดึงแบบ generic
    if (items.length === 0) {
      console.log('⚠️ ไม่พบ selector ปกติ กำลังลองแบบ fallback...');
      // Log HTML ช่วง 500 ตัวแรก เพื่อ debug
      console.log('HTML sample:', data.substring(0, 500));
      return [];
    }

    items.each((i, el) => {
      if (i >= 20) return false;

      const $el        = $(el);
      const url        = $el.find('a').first().attr('href') || '';
      const title      = $el.find('h4, .tt, .luf h4').first().text().trim();
      const coverImage = $el.find('img').first().attr('src')
                      || $el.find('img').first().attr('data-src') || '';
      const typeText   = $el.find('.type').first().text().trim();

      // หาตอนล่าสุด
      let latestChapter = '';
      $el.find('a').each((_, a) => {
        const txt = $(a).text().trim();
        const m   = txt.match(/ตอนที่\s*([\d.]+)|Ch\.?\s*([\d.]+)|(\d[\d.]+)/);
        if (m && !latestChapter) {
          latestChapter = m[1] || m[2] || m[3];
        }
      });

      const slug = url.replace(BASE_URL, '').replace(/\//g, '-');
      if (!title || !url || !latestChapter) return;

      results.push({ title, url, slug, coverImage, latestChapter, type: typeText || 'Manhwa' });
    });

    console.log(`📋 พบมังงะอัปเดต ${results.length} เรื่อง`);
    return results;

  } catch (err) {
    console.error('❌ Scrape ล้มเหลว:', err.message);
    return [];
  }
}

module.exports = { scrapeLatestUpdates };
