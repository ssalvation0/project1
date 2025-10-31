/**
 * Скрипт для наповнення каталогу трансмогів з Blizzard API
 * 
 * Використання:
 * node scripts/populateTransmogs.js [limit]
 * 
 * limit - кількість сетів для завантаження (за замовчуванням 100)
 */

require('dotenv').config();
const { getAllItemSets, getItemSetDetails, getClassesByName } = require('../utils/blizzardAPI');
const fs = require('fs').promises;
const path = require('path');

const TRANSMOGS_DATA_FILE = path.join(__dirname, '../data/transmogs.json');
const LIMIT = process.argv[2] === 'all' ? Infinity : (parseInt(process.argv[2]) || 100);

// Маппінг класів для нормалізації (з lowercase на правильну назву)
const CLASS_MAP = {
  'warrior': 'Warrior',
  'paladin': 'Paladin',
  'hunter': 'Hunter',
  'rogue': 'Rogue',
  'priest': 'Priest',
  'deathknight': 'Death Knight',
  'shaman': 'Shaman',
  'mage': 'Mage',
  'warlock': 'Warlock',
  'monk': 'Monk',
  'druid': 'Druid',
  'demonhunter': 'Demon Hunter',
  'evoker': 'Evoker',
  'demon hunter': 'Demon Hunter',
  'death knight': 'Death Knight'
};

// Функція для нормалізації назви класу
function normalizeClass(classSlug) {
  if (!classSlug) return 'All';
  const normalized = classSlug.toLowerCase().replace(/\s+/g, '');
  return CLASS_MAP[normalized] || classSlug.charAt(0).toUpperCase() + classSlug.slice(1);
}

// Розширення для визначення
const EXPANSION_KEYWORDS = {
  'Classic': ['classic', 'vanilla', 'molten core', 'blackwing lair', 'naxxramas', 'tier 1', 'tier 2', 'tier 3'],
  'TBC': ['burning crusade', 'tbc', 'black temple', 'sunwell', 'tier 4', 'tier 5', 'tier 6'],
  'WotLK': ['wrath', 'wotlk', 'ulduar', 'icc', 'tier 7', 'tier 8', 'tier 9', 'tier 10'],
  'Cataclysm': ['cataclysm', 'firelands', 'dragon soul', 'tier 11', 'tier 12', 'tier 13'],
  'MoP': ['mists', 'pandaria', 'mop', 'tier 14', 'tier 15', 'tier 16'],
  'WoD': ['warlords', 'wod', 'draenor', 'tier 17', 'tier 18'],
  'Legion': ['legion', 'tier 19', 'tier 20', 'tier 21'],
  'BfA': ['battle for azeroth', 'bfa', 'tier 22', 'tier 23'],
  'Shadowlands': ['shadowlands', 'tier 24', 'tier 25'],
  'Dragonflight': ['dragonflight', 'df', 'tier 26', 'tier 27', 'tier 28', 'tier 29']
};

function detectExpansion(setName) {
  const nameLower = setName.toLowerCase();
  for (const [expansion, keywords] of Object.entries(EXPANSION_KEYWORDS)) {
    for (const keyword of keywords) {
      if (nameLower.includes(keyword)) {
        return expansion;
      }
    }
  }
  return 'Unknown';
}

async function ensureDataDirectory() {
  const dataDir = path.dirname(TRANSMOGS_DATA_FILE);
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }
}

async function loadExistingTransmogs() {
  try {
    const data = await fs.readFile(TRANSMOGS_DATA_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function saveTransmogs(transmogs) {
  await ensureDataDirectory();
  await fs.writeFile(TRANSMOGS_DATA_FILE, JSON.stringify(transmogs, null, 2), 'utf-8');
  console.log(`✓ Збережено ${transmogs.length} трансмогів у файл`);
}

async function populateTransmogs() {
  console.log('🚀 Початок завантаження трансмогів з Blizzard API...');
  console.log(`📊 Ліміт: ${LIMIT} сетів\n`);

  try {
    // Завантажуємо існуючі дані
    const existingTransmogs = await loadExistingTransmogs();
    const existingIds = new Set(existingTransmogs.map(t => t.setId));

    // Отримуємо список всіх сетів
    console.log('📥 Отримання списку сетів...');
    const allSets = await getAllItemSets();
    
    if (!allSets || allSets.length === 0) {
      console.error('❌ Не вдалося отримати список сетів');
      return;
    }

    console.log(`✓ Знайдено ${allSets.length} сетів\n`);

    // Фільтруємо тільки нові сети
    const filteredSets = allSets.filter(set => !existingIds.has(set.id));
    const newSets = LIMIT === Infinity ? filteredSets : filteredSets.slice(0, LIMIT);
    
    console.log(`📦 Завантаження ${newSets.length} нових сетів (всього доступно: ${allSets.length})...\n`);

    const transmogs = [...existingTransmogs];
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < newSets.length; i++) {
      const set = newSets[i];
      const progress = `[${i + 1}/${newSets.length}]`;

      try {
        console.log(`${progress} Завантаження сету ${set.id}...`);
        const details = await getItemSetDetails(set.id);

        if (details) {
          // Визначаємо клас: спочатку з API, якщо не працює - по назві
          let transmogClass = 'All';
          if (details.classes && details.classes.length > 0) {
            transmogClass = normalizeClass(details.classes[0]);
          } else {
            // Використовуємо визначення по назві якщо API не повернув клас
            const nameClasses = getClassesByName(details.name);
            if (nameClasses.length > 0) {
              transmogClass = normalizeClass(nameClasses[0]);
            }
          }
          
          const transmog = {
            id: transmogs.length + 1,
            setId: set.id,
            name: details.name,
            iconUrl: details.iconUrl || details.imageUrl, // Маленька іконка
            imageUrl: details.imageUrl, // Велике зображення для картки
            class: transmogClass,
            expansion: detectExpansion(details.name),
            description: details.description || `Epic transmog set from World of Warcraft`,
            items: [],
            createdAt: new Date().toISOString()
          };

          transmogs.push(transmog);
          successCount++;
          console.log(`  ✓ ${details.name} (${transmog.class})\n`);
        } else {
          errorCount++;
          console.log(`  ⚠️ Не вдалося завантажити деталі\n`);
        }

        // Затримка щоб не перевантажити API
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        errorCount++;
        console.error(`  ❌ Помилка: ${error.message}\n`);
      }

      // Автозбереження кожні 10 сетів
      if ((i + 1) % 10 === 0) {
        await saveTransmogs(transmogs);
      }
    }

    // Фінальне збереження
    await saveTransmogs(transmogs);

    console.log('\n✅ Завершено!');
    console.log(`✓ Успішно завантажено: ${successCount}`);
    console.log(`⚠️ Помилок: ${errorCount}`);
    console.log(`📊 Загалом трансмогів: ${transmogs.length}`);

  } catch (error) {
    console.error('❌ Критична помилка:', error.message);
    process.exit(1);
  }
}

// Запускаємо скрипт
populateTransmogs();

