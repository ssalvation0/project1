/**
 * Скрипт для покращення існуючих трансмогів:
 * - Покращує визначення класів
 * - Покращує завантаження іконок
 * - Оновлює дані без дублювання
 */

require('dotenv').config();
const { getItemSetDetails, getClassesByName } = require('../utils/blizzardAPI');
const fs = require('fs').promises;
const path = require('path');

const TRANSMOGS_DATA_FILE = path.join(__dirname, '../data/transmogs.json');

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
  'evoker': 'Evoker'
};

function normalizeClass(classSlug) {
  if (!classSlug) return 'All';
  const normalized = classSlug.toLowerCase().replace(/\s+/g, '');
  return CLASS_MAP[normalized] || classSlug.charAt(0).toUpperCase() + classSlug.slice(1);
}

async function loadTransmogs() {
  try {
    const data = await fs.readFile(TRANSMOGS_DATA_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function saveTransmogs(transmogs) {
  await fs.writeFile(TRANSMOGS_DATA_FILE, JSON.stringify(transmogs, null, 2), 'utf-8');
  console.log(`✓ Збережено ${transmogs.length} трансмогів`);
}

async function improveTransmogs() {
  console.log('🔧 Покращення трансмогів...\n');

  const transmogs = await loadTransmogs();
  console.log(`📊 Завантажено ${transmogs.length} трансмогів\n`);

  // Фільтруємо ті, які потребують покращення
  const needsImprovement = transmogs.filter(t => 
    t.class === 'All' || 
    !t.iconUrl || 
    t.iconUrl.includes('questionmark') ||
    t.expansion === 'Unknown'
  );

  console.log(`🔍 Знайдено ${needsImprovement.length} трансмогів для покращення\n`);

  let improved = 0;
  let errors = 0;

  for (let i = 0; i < needsImprovement.length; i++) {
    const transmog = needsImprovement[i];
    const progress = `[${i + 1}/${needsImprovement.length}]`;

    try {
      console.log(`${progress} Покращення "${transmog.name}" (ID: ${transmog.setId})...`);
      
      let details = null;
      try {
        details = await getItemSetDetails(transmog.setId);
      } catch (error) {
        // Якщо API не працює, все одно спробуємо визначити клас по назві
        console.log(`  ⚠️ API недоступний, використовуємо визначення по назві`);
      }

      // Оновлюємо клас якщо був "All" (навіть якщо API не працює)
      if (transmog.class === 'All') {
        let updated = false;
        
        // Спробуємо отримати клас з API
        if (details && details.classes && details.classes.length > 0) {
          transmog.class = normalizeClass(details.classes[0]);
          console.log(`  ✓ Клас оновлено (з API): ${transmog.class}`);
          updated = true;
        } else {
          // Якщо API не повернув клас або не працює, використовуємо визначення по назві
          const nameClasses = getClassesByName(transmog.name);
          if (nameClasses.length > 0) {
            transmog.class = normalizeClass(nameClasses[0]); // Беремо перший знайдений клас
            console.log(`  ✓ Клас оновлено (з назви): ${transmog.class}`);
            updated = true;
          }
        }
        
        if (!updated) {
          console.log(`  ⚠️ Не вдалося визначити клас для "${transmog.name}"`);
        }
      }

      if (details) {

        // Оновлюємо іконку та зображення якщо були placeholder
        if ((!transmog.iconUrl || transmog.iconUrl.includes('questionmark')) && details.imageUrl) {
          transmog.imageUrl = details.imageUrl;
          transmog.iconUrl = details.iconUrl || details.imageUrl;
          console.log(`  ✓ Зображення оновлено`);
        }

        // Оновлюємо опис
        if (details.description && details.description !== 'Epic transmog set from World of Warcraft') {
          transmog.description = details.description;
        }

        improved++;
      }

      // Затримка
      await new Promise(resolve => setTimeout(resolve, 100));

      // Автозбереження кожні 20
      if ((i + 1) % 20 === 0) {
        await saveTransmogs(transmogs);
      }

    } catch (error) {
      errors++;
      console.error(`  ❌ Помилка: ${error.message}\n`);
    }
  }

  // Фінальне збереження
  await saveTransmogs(transmogs);

  console.log('\n✅ Завершено!');
  console.log(`✓ Покращено: ${improved}`);
  console.log(`⚠️ Помилок: ${errors}`);
}

improveTransmogs().catch(console.error);

