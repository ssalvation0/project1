/**
 * Парсер для отримання зображень сетів з Wowhead
 * 
 * Wowhead використовує model viewer для 3D preview сетів.
 * Можна отримати:
 * 1. Screenshot з model viewer (через puppeteer)
 * 2. Прямі посилання на зображення якщо доступні
 * 3. Модельні дані для рендерингу
 */

const axios = require('axios');
const cheerio = require('cheerio');
const NodeCache = require('node-cache');

// Кеш для зображень Wowhead (1 година)
const imageCache = new NodeCache({ stdTTL: 3600 });

/**
 * Отримує URL сторінки сету на Wowhead
 */
function getWowheadSetUrl(setId) {
  return `https://www.wowhead.com/item-set=${setId}`;
}

/**
 * Парсить HTML Wowhead для отримання даних про сет
 */
async function parseWowheadSetPage(setId) {
  try {
    const url = getWowheadSetUrl(setId);
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);
    const result = {
      setId: setId,
      screenshotUrl: null,
      modelViewerUrl: null,
      dressImageUrl: null,
      previewImages: []
    };

    // Спробуємо знайти model viewer iframe або container
    const modelViewer = $('[data-modelviewer]').first();
    if (modelViewer.length > 0) {
      const modelData = modelViewer.attr('data-modelviewer') || modelViewer.attr('data-model');
      if (modelData) {
        try {
          const parsed = typeof modelData === 'string' ? JSON.parse(modelData) : modelData;
          result.modelViewerUrl = parsed.modelUrl || parsed.url;
        } catch (e) {
          // Ігноруємо помилки парсингу
        }
      }
    }

    // Шукаємо зображення dress/screenshot
    // Wowhead може мати зображення за URL патерном
    const dressUrl = `https://wow.zamimg.com/images/wow/dress/${setId}.jpg`;
    const dressUrlPng = `https://wow.zamimg.com/images/wow/dress/${setId}.png`;
    
    // Перевіряємо чи існують ці URL
    try {
      const checkResponse = await axios.head(dressUrl, { timeout: 3000 });
      if (checkResponse.status === 200) {
        result.dressImageUrl = dressUrl;
      }
    } catch (e) {
      // Спробуємо PNG
      try {
        const checkResponse = await axios.head(dressUrlPng, { timeout: 3000 });
        if (checkResponse.status === 200) {
          result.dressImageUrl = dressUrlPng;
        }
      } catch (e2) {
        // Немає готового зображення
      }
    }

    // Шукаємо meta теги з OpenGraph images
    const ogImage = $('meta[property="og:image"]').attr('content');
    if (ogImage && !ogImage.includes('share-icon') && !ogImage.includes('logo')) {
      result.previewImages.push(ogImage);
    }

    // Шукаємо всі зображення пов'язані з сетом
    $('img').each((i, elem) => {
      const src = $(elem).attr('src') || $(elem).attr('data-src');
      if (src && 
          (src.includes('dress') || src.includes('modelviewer') || src.includes('set') || src.includes('screenshots')) &&
          !src.includes('share-icon') && 
          !src.includes('logo') &&
          !src.endsWith('.png') && // Пропускаємо PNG (вони часто бувають логотипами)
          src.endsWith('.jpg')) {  // Тільки JPG скріншоти
        const fullUrl = src.startsWith('http') ? src : `https://www.wowhead.com${src}`;
        if (!result.previewImages.includes(fullUrl)) {
          result.previewImages.push(fullUrl);
        }
      }
    });

    return result;
  } catch (error) {
    console.error(`Error parsing Wowhead page for set ${setId}:`, error.message);
    return null;
  }
}

/**
 * Отримує screenshot з model viewer через Puppeteer
 */
async function getWowheadScreenshot(setId) {
  try {
    // Перевіряємо чи встановлений puppeteer
    let puppeteer;
    try {
      puppeteer = require('puppeteer');
    } catch (e) {
      console.log('Puppeteer не встановлений, пропускаємо скріншот');
      return null;
    }

    const modelViewerUrl = `https://www.wowhead.com/modelviewer/item-set=${setId}`;
    
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 800, height: 600 });
    await page.goto(modelViewerUrl, { waitUntil: 'networkidle2', timeout: 15000 });
    
    // Чекаємо поки модель завантажиться
    await page.waitForTimeout(3000);
    
    // Робимо скріншот
    const screenshot = await page.screenshot({
      type: 'png',
      fullPage: false
    });
    
    await browser.close();
    
    // Зберігаємо скріншот (або повертаємо base64, або зберігаємо на сервері)
    // Для початку повертаємо base64, потім можна зберегти в файл або завантажити на CDN
    return `data:image/png;base64,${screenshot.toString('base64')}`;
  } catch (error) {
    console.error(`Error taking screenshot for set ${setId}:`, error.message);
    return null;
  }
}

/**
 * Головна функція для отримання зображення сету з Wowhead
 * @param {number} setId - ID сету
 * @param {boolean} useScreenshot - чи використовувати скріншот (повільно, але надійно)
 */
async function getWowheadSetImage(setId, useScreenshot = false) {
  try {
    // Перевіряємо кеш
    const cacheKey = `wowhead_image_${setId}`;
    const cached = imageCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Метод 1: Перевіряємо чи є готове dress image на zamimg
    const dressUrls = [
      `https://wow.zamimg.com/images/wow/dress/${setId}.jpg`,
      `https://wow.zamimg.com/images/wow/dress/${setId}.png`,
      `https://wow.zamimg.com/modelviewer/live.html?modelurl=https://wow.zamimg.com/modelviewer/${setId}`
    ];

    for (const dressUrl of dressUrls.slice(0, 2)) { // Перевіряємо тільки jpg/png
      try {
        const checkResponse = await axios.head(dressUrl, { 
          timeout: 3000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          },
          validateStatus: (status) => status < 500 // Приймаємо будь-який статус менше 500
        });
        if (checkResponse.status === 200) {
          imageCache.set(cacheKey, dressUrl);
          return dressUrl;
        }
      } catch (e) {
        // Продовжуємо перевірку інших URL
      }
    }

    // Метод 2: Парсимо HTML сторінку Wowhead
    const parsed = await parseWowheadSetPage(setId);
    if (parsed && parsed.dressImageUrl) {
      imageCache.set(cacheKey, parsed.dressImageUrl);
      return parsed.dressImageUrl;
    }
    if (parsed && parsed.previewImages.length > 0) {
      const imageUrl = parsed.previewImages[0];
      imageCache.set(cacheKey, imageUrl);
      return imageUrl;
    }

    // Метод 3: Якщо використовувати скріншот (опційно, повільно)
    if (useScreenshot) {
      const screenshot = await getWowheadScreenshot(setId);
      if (screenshot) {
        // TODO: Зберегти скріншот на сервер/CDN та повернути URL
        // Зараз повертаємо base64 (не оптимально для продакшену)
        return screenshot;
      }
    }

    return null; // Повертаємо null якщо не знайдено
  } catch (error) {
    console.error(`Error getting Wowhead image for set ${setId}:`, error.message);
    return null;
  }
}

module.exports = {
  getWowheadSetUrl,
  parseWowheadSetPage,
  getWowheadSetImage,
  getWowheadScreenshot
};

