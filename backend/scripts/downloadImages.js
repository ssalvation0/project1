const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const { createWriteStream } = require('fs');

/**
 * Масове завантаження іконок предметів з Wowhead
 * 
 * Використовує:
 * - Wowhead search API для пошуку Item ID по назві
 * - Wowhead замimg CDN для високоякісних іконок
 * 
 * Запуск: node scripts/downloadImages.js
 */

const WOWHEAD_ICON_BASE = 'https://wow.zamimg.com/images/wow/icons/large';
const IMAGE_DIR = path.join(__dirname, '../public/images/items');
const DELAY_MS = 200; // Затримка між запитами
const BATCH_SIZE = 20; // Менші батчі для стабільності
const CACHE_FILE = path.join(__dirname, '../data/item_cache.json'); // Кеш ID->іконка

async function downloadItemImages() {
  console.log('🖼️  Початок завантаження зображень...\n');

  // Завантажуємо дані про сети
  const setsPath = path.join(__dirname, '../data/transmog_sets.json');
  let sets;
  
  try {
    const data = await fs.readFile(setsPath, 'utf-8');
    sets = JSON.parse(data);
  } catch (error) {
    console.error('❌ Не вдалося завантажити transmog_sets.json');
    console.error('💡 Спочатку запусти: node scripts/processKaggleData.js');
    process.exit(1);
  }

  // Завантажуємо кеш (якщо є)
  let cache = {};
  try {
    const cacheData = await fs.readFile(CACHE_FILE, 'utf-8');
    cache = JSON.parse(cacheData);
    console.log(`📦 Завантажено кеш: ${Object.keys(cache).length} предметів\n`);
  } catch {
    console.log('📦 Кеш не знайдено, створюю новий...\n');
  }

  // Створюємо директорію якщо не існує
  try {
    await fs.mkdir(IMAGE_DIR, { recursive: true });
  } catch (error) {
    // Ігноруємо якщо вже існує
  }

  // Збираємо всі унікальні предмети
  const uniqueItems = new Map();
  sets.forEach(set => {
    set.items.forEach(item => {
      const key = `${item.name}_${item.slot}`;
      if (!uniqueItems.has(key)) {
        uniqueItems.set(key, item);
      }
    });
  });

  console.log(`📊 Всього унікальних предметів: ${uniqueItems.size}`);
  console.log(`📁 Зберігатиму у: ${IMAGE_DIR}\n`);

  const items = Array.from(uniqueItems.values());
  let downloaded = 0;
  let skipped = 0;
  let failed = 0;

  // Обробляємо батчами
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    
    for (const item of batch) {
      const result = await downloadItemIcon(item, cache);
      if (result === 'downloaded') downloaded++;
      else if (result === 'skipped') skipped++;
      else if (result === 'failed') failed++;
      
      // Затримка між кожним предметом
      await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    }

    const progress = Math.round(((i + batch.length) / items.length) * 100);
    console.log(`⏳ Прогрес: ${progress}% | ✅ ${downloaded} | ⏭️  ${skipped} | ❌ ${failed}`);
    
    // Зберігаємо кеш після кожного батчу
    await fs.writeFile(CACHE_FILE, JSON.stringify(cache, null, 2));
  }

  console.log('\n✨ Завершено!');
  console.log(`✅ Завантажено: ${downloaded}`);
  console.log(`⏭️  Пропущено (вже є): ${skipped}`);
  console.log(`❌ Помилок: ${failed}`);
  console.log(`\n💾 Кеш збережено у: ${CACHE_FILE}`);
}

async function downloadItemIcon(item, cache) {
  // Використовуємо безпечну назву для файлу
  const safeName = item.name.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
  const imagePath = path.join(IMAGE_DIR, `${item.id}_${safeName}.jpg`);

  // Перевіряємо чи файл вже існує
  try {
    await fs.access(imagePath);
    return 'skipped';
  } catch {
    // Файл не існує, продовжуємо
  }

  try {
    // Перевіряємо кеш
    const cacheKey = `${item.name.toLowerCase()}_${item.slot}`;
    let iconName = cache[cacheKey];

    if (!iconName) {
      // Шукаємо предмет на Wowhead по назві
      const searchUrl = `https://www.wowhead.com/search?q=${encodeURIComponent(item.name)}`;
      
      try {
        const response = await axios.get(searchUrl, {
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml'
          }
        });

        // Шукаємо посилання на іконку в HTML
        const iconMatch = response.data.match(/iconmedium\.jpg/);
        const nameMatch = response.data.match(/\/images\/wow\/icons\/[^\/]+\/([^\.]+)\.jpg/);
        
        if (nameMatch && nameMatch[1]) {
          iconName = nameMatch[1];
          cache[cacheKey] = iconName;
        }
      } catch (searchError) {
        // Пропускаємо помилки пошуку
      }
    }

    if (iconName) {
      // Завантажуємо іконку
      const iconUrl = `${WOWHEAD_ICON_BASE}/${iconName}.jpg`;
      
      const imageResponse = await axios.get(iconUrl, {
        responseType: 'stream',
        timeout: 10000
      });

      const writer = createWriteStream(imagePath);
      imageResponse.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });

      return 'downloaded';
    } else {
      // Створюємо placeholder
      await createPlaceholder(imagePath, item.name, item.quality);
      return 'downloaded';
    }

  } catch (error) {
    // Якщо все не вдалося - створюємо placeholder
    try {
      await createPlaceholder(imagePath, item.name, item.quality);
      return 'downloaded';
    } catch {
      return 'failed';
    }
  }
}

// Створення простого SVG placeholder з кольорами по якості
async function createPlaceholder(imagePath, itemName, quality = 'Common') {
  const qualityColors = {
    'Poor': '#9d9d9d',
    'Common': '#ffffff',
    'Uncommon': '#1eff00',
    'Rare': '#0070dd',
    'Epic': '#a335ee',
    'Legendary': '#ff8000',
    'Artifact': '#e6cc80',
    'Heirloom': '#00ccff'
  };

  const color = qualityColors[quality] || qualityColors['Common'];
  const initials = itemName
    .split(' ')
    .slice(0, 2)
    .map(word => word[0])
    .join('')
    .toUpperCase();

  // Створюємо SVG замість JPG для placeholder
  const svgPath = imagePath.replace('.jpg', '.svg');
  const svg = `
<svg width="56" height="56" xmlns="http://www.w3.org/2000/svg">
  <rect width="56" height="56" fill="${color}" opacity="0.3"/>
  <rect width="56" height="56" fill="none" stroke="${color}" stroke-width="2"/>
  <text x="28" y="35" font-family="Arial, sans-serif" font-size="18" font-weight="bold" 
        fill="${color}" text-anchor="middle">${initials}</text>
</svg>`.trim();

  await fs.writeFile(svgPath, svg, 'utf-8');
  
  // Також створюємо JSON з метаданими
  const jsonPath = imagePath.replace('.jpg', '.json');
  await fs.writeFile(jsonPath, JSON.stringify({
    name: itemName,
    quality: quality,
    type: 'placeholder',
    color: color
  }, null, 2));
}

// Запуск
if (require.main === module) {
  downloadItemImages()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ Критична помилка:', error);
      process.exit(1);
    });
}

module.exports = { downloadItemImages };
