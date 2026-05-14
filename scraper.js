// ============================================================
//  scraper.js  —  ดึงข้อมูลอัปเดตล่าสุดจาก up-manga.com
// ============================================================
const axios   = require('axios');
const cheerio = require('cheerio');

const BASE_URL    = 'https://www.up-manga.com';
const UPDATE_URL  = `${BASE_URL}/manga/?order=update`;

// Headers เลียนแบบ Browser ปกติ เพื่อไม่ให้โดนบล็อก
const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
    'AppleWebKit/537.36 (KHTML, like Gecko) ' +
    'Chrome/124.0.0.0 Safari/537.36',
  'Accept-Language': 'th-TH,th;q=0.9,en-US;q=0.8',
  'Accept': 'text/html,application/xhtml+xml',
};

/**
 * ดึงรายการมังงะที่อัปเดตล่าสุด (20 อันดับแรก)
 * @returns {Array} รายการมังงะพร้อมข้อมูลครบ
 */
async function scrapeLatestUpdates() {
  try {
    const { data } = await axios.get(UPDATE_URL, {
      headers: HEADERS,
      timeout: 15000,        // รอสูงสุด 15 วินาที
    });

    const $       = cheerio.load(data);
    const results = [];

    // วนลูปดึงข้อมูลจากการ์ดมังงะแต่ละใบ
    // up-manga.com ใช้ class .listupd > .utao > .uta สำหรับ grid
    $('.listupd .utao').each((i, el) => {
      if (i >= 20) return false; // เอาแค่ 20 เรื่องล่าสุด

      const $el = $(el);

      // ──────── ดึงข้อมูลแต่ละส่วน ────────
      const linkEl      = $el.find('a').first();
      const url         = linkEl.attr('href') || '';
      const title       = $el.find('.luf h4, .tt').first().text().trim();
      const coverImage  = $el.find('img').first().attr('src')
                          || $el.find('img').first().attr('data-src')
                          || '';

      // ประเภท (Manhwa / Manhua / Manga)
      const typeText    = $el.find('.type').first().text().trim();

      // ตอนล่าสุด — หา element ที่มีคำว่า "ตอนที่" หรือตัวเลขตอน
      let latestChapter = '';
      const chapterEl   = $el.find('.luf ul li a, .chap a').first();
      const chapterText = chapterEl.text().trim();

      // แยกเลขตอนออกมา เช่น "ตอนที่ 82" → "82"
      const match = chapterText.match(/ตอนที่\s*([\d.]+)|(\d[\d.]*)/);
      if (match) latestChapter = match[1] || match[2];

      // slug ใช้เป็น ID ไม่ซ้ำกัน
      const slug = url.replace(BASE_URL, '').replace(/\//g, '');

      // กรองออกถ้าข้อมูลไม่ครบ
      if (!title || !url || !latestChapter) return;

      results.push({
        title,
        url,
        slug,
        coverImage,
        latestChapter,
        type: typeText || 'Manhwa',
      });
    });

    console.log(`📋 พบมังงะอัปเดต ${results.length} เรื่อง`);
    return results;

  } catch (err) {
    console.error('❌ Scrape ล้มเหลว:', err.message);
    return [];
  }
}

module.exports = { scrapeLatestUpdates };
