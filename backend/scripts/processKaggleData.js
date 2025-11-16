const fs = require('fs').promises;
const path = require('path');
const csv = require('csv-parser');
const { createReadStream } = require('fs');

/**
 * Обробка Kaggle датасету WoW предметів (розділені по слотах)
 * 
 * Датасет: https://www.kaggle.com/datasets/trolukovich/world-of-warcraft-items-dataset/
 * Структура: окремі CSV файли для кожного слоту (head.csv, chest.csv, тощо)
 */

const KAGGLE_DIR = path.join(__dirname, '../data/kaggle');
const OUTPUT_FILE = path.join(__dirname, '../data/transmog_sets.json');

// Мапінг класів WoW (з CSV колонки AllowableClass)
const CLASS_NAMES = {
  1: 'Warrior',
  2: 'Paladin',
  3: 'Hunter',
  4: 'Rogue',
  5: 'Priest',
  6: 'Death Knight',
  7: 'Shaman',
  8: 'Mage',
  9: 'Warlock',
  10: 'Monk',
  11: 'Druid',
  12: 'Demon Hunter',
  13: 'Evoker'
};

// Мапінг назв слотів
const SLOT_NAMES = {
  'back': 'Back',
  'chest': 'Chest',
  'feet': 'Feet',
  'finger': 'Finger',
  'hands': 'Hands',
  'head': 'Head',
  'Held In Off-hand': 'Held In Off-hand',
  'legs': 'Legs',
  'Main Hand': 'Main Hand',
  'neck': 'Neck',
  'Off Hand': 'Off Hand',
  'One-Hand': 'One-Hand',
  'ranged': 'Ranged',
  'shield': 'Shield',
  'shirt': 'Shirt',
  'shoulder': 'Shoulder',
  'tabard': 'Tabard',
  'thrown': 'Thrown',
  'trinket': 'Trinket',
  'two hand': 'Two-Hand',
  'waist': 'Waist',
  'wrist': 'Wrist'
};

async function processKaggleDataset() {
  console.log('🚀 Початок обробки Kaggle датасету (слоти)...\n');

  // Отримуємо список всіх CSV файлів
  let csvFiles;
  try {
    const files = await fs.readdir(KAGGLE_DIR);
    csvFiles = files.filter(f => f.endsWith('.csv'));
    console.log(`📂 Знайдено ${csvFiles.length} CSV файлів:\n   ${csvFiles.join('\n   ')}\n`);
  } catch (error) {
    console.error('❌ Помилка читання директорії kaggle/', error.message);
    process.exit(1);
  }

  const allItems = [];
  const sets = new Map();

  // Обробляємо кожен CSV файл
  for (const csvFile of csvFiles) {
    const slotName = csvFile.replace('.csv', '');
    const csvPath = path.join(KAGGLE_DIR, csvFile);
    
    console.log(`📦 Обробка ${csvFile}...`);
    
    const items = await processSlotFile(csvPath, slotName);
    allItems.push(...items);
    
    // Групуємо по сетах
    items.forEach(item => {
      if (item.itemSet) {
        if (!sets.has(item.itemSet)) {
          sets.set(item.itemSet, {
            id: `set-${sets.size + 1}`,
            name: item.itemSet,
            items: [],
            classes: new Set(),
            minLevel: 999,
            maxLevel: 0,
            quality: null,
            expansion: null,
          });
        }
        
        const set = sets.get(item.itemSet);
        set.items.push(item);
        
        // Додаємо класи
        item.classes.forEach(cls => set.classes.add(cls));
        
        // Оновлюємо рівні
        set.minLevel = Math.min(set.minLevel, item.requiredLevel);
        set.maxLevel = Math.max(set.maxLevel, item.requiredLevel);
        
        // Оновлюємо якість (беремо найвищу)
        if (!set.quality || getQualityPriority(item.quality) > getQualityPriority(set.quality)) {
          set.quality = item.quality;
        }
      }
    });
  }

  console.log(`\n✅ Всього оброблено ${allItems.length} предметів`);
  console.log(`📊 Знайдено ${sets.size} унікальних сетів\n`);

  // Конвертуємо у фінальний формат
  const setsArray = Array.from(sets.values())
    .map(set => {
      // Визначаємо назву сету зі спільної частини назв предметів
      const setName = inferSetName(set.items);
      
      return {
        ...set,
        name: setName || `Set ${set.id}`, // Використовуємо виведену назву
        classes: Array.from(set.classes).sort(),
        itemCount: set.items.length,
        items: set.items.sort((a, b) => getSlotOrder(a.slot) - getSlotOrder(b.slot)),
      };
    })
    .filter(set => set.items.length >= 2) // Мінімум 2 предмети
    .sort((a, b) => a.name.localeCompare(b.name));

  // Статистика
  console.log('📈 Статистика сетів:');
  console.log(`   Всього сетів: ${setsArray.length}`);
  console.log(`   Epic сетів: ${setsArray.filter(s => s.quality === 'Epic').length}`);
  console.log(`   Legendary сетів: ${setsArray.filter(s => s.quality === 'Legendary').length}`);
  
  Object.keys(CLASS_NAMES).forEach(classId => {
    const className = CLASS_NAMES[classId];
    const count = setsArray.filter(s => s.classes.includes(className)).length;
    if (count > 0) {
      console.log(`   ${className}: ${count} сетів`);
    }
  });

  // Зберігаємо
  await fs.writeFile(OUTPUT_FILE, JSON.stringify(setsArray, null, 2), 'utf-8');
  
  console.log(`\n💾 Дані збережено у: ${OUTPUT_FILE}`);
  console.log('✨ Готово! Тепер можна запустити downloadImages.js\n');

  return setsArray;
}

// Функція для визначення назви сету зі спільної частини назв предметів
function inferSetName(items) {
  if (items.length === 0) return null;
  if (items.length === 1) return items[0].name;

  // Видаляємо слоти з назв (Helmet, Chestpiece, Gloves, тощо)
  const slotWords = ['Helmet', 'Helm', 'Hat', 'Cap', 'Crown', 'Cowl', 'Hood',
    'Chestpiece', 'Chest', 'Robe', 'Tunic', 'Vest', 'Hauberk', 'Breastplate',
    'Gloves', 'Gauntlets', 'Handguards', 'Grips', 'Mitts',
    'Pants', 'Leggings', 'Legguards', 'Legs', 'Breeches', 'Trousers',
    'Boots', 'Sabatons', 'Treads', 'Slippers', 'Shoes',
    'Shoulders', 'Shoulderpads', 'Spaulders', 'Mantle', 'Pauldrons',
    'Belt', 'Waist', 'Girdle', 'Cord', 'Cinch',
    'Bracers', 'Wristguards', 'Bindings', 'Cuffs', 'Armguards'];

  const cleanNames = items.map(item => {
    let name = item.name;
    // Видаляємо слоти
    slotWords.forEach(slot => {
      name = name.replace(new RegExp(`\\b${slot}\\b`, 'gi'), '').trim();
    });
    return name;
  });

  // Знаходимо спільні слова
  const words = cleanNames.map(name => name.split(/\s+/));
  const commonWords = words[0].filter(word => 
    words.every(nameWords => nameWords.some(w => 
      w.toLowerCase() === word.toLowerCase()
    ))
  );

  if (commonWords.length > 0) {
    return commonWords.join(' ').trim();
  }

  // Якщо немає спільних слів, беремо перше слово з першої назви
  const firstWords = items.map(item => item.name.split(/\s+/)[0]);
  const mostCommon = firstWords.reduce((acc, word) => {
    acc[word] = (acc[word] || 0) + 1;
    return acc;
  }, {});
  
  const commonFirst = Object.entries(mostCommon).sort((a, b) => b[1] - a[1])[0];
  return commonFirst ? commonFirst[0] : items[0].name.split(/\s+/).slice(0, 2).join(' ');
}

async function processSlotFile(csvPath, slotName) {
  return new Promise((resolve, reject) => {
    const items = [];
    let rowCount = 0;

    createReadStream(csvPath)
      .pipe(csv())
      .on('data', (row) => {
        rowCount++;
        
        // CSV структура: name_enus, itemset, reqlevel, quality, classes, armor
        const itemSetName = row.itemset?.trim();
        
        // Тільки предмети які є частиною сету
        if (itemSetName && itemSetName.length > 0) {
          // Парсимо класи (колонка classes містить числа класів через кому або порожньо для всіх)
          const classes = [];
          const classesStr = row.classes?.trim() || '';
          
          if (!classesStr || classesStr === '') {
            classes.push('All');
          } else {
            classesStr.split(',').forEach(classId => {
              const id = parseInt(classId.trim());
              const className = CLASS_NAMES[id];
              if (className) {
                classes.push(className);
              }
            });
            
            // Якщо не розпарсилось - додаємо All
            if (classes.length === 0) {
              classes.push('All');
            }
          }

          items.push({
            id: rowCount, // Використовуємо номер рядка як ID
            name: row.name_enus || 'Unknown Item',
            slot: SLOT_NAMES[slotName] || slotName,
            quality: row.quality || 'Common',
            itemLevel: parseInt(row.armor) || 0, // armor як приблизний ilvl
            requiredLevel: parseInt(row.reqlevel) || 0,
            itemSet: itemSetName,
            classes: classes,
          });
        }
      })
      .on('end', () => {
        console.log(`   ✅ ${slotName}: ${items.length} предметів з ${rowCount} рядків`);
        resolve(items);
      })
      .on('error', (error) => {
        console.error(`   ❌ Помилка у ${slotName}:`, error.message);
        reject(error);
      });
  });
}

function getQualityPriority(quality) {
  const priorities = {
    'Poor': 0,
    'Common': 1,
    'Uncommon': 2,
    'Rare': 3,
    'Epic': 4,
    'Legendary': 5,
    'Artifact': 6,
    'Heirloom': 7
  };
  return priorities[quality] || 0;
}

function getSlotOrder(slot) {
  const order = {
    'Head': 1,
    'Neck': 2,
    'Shoulder': 3,
    'Back': 4,
    'Chest': 5,
    'Shirt': 6,
    'Tabard': 7,
    'Wrist': 8,
    'Hands': 9,
    'Waist': 10,
    'Legs': 11,
    'Feet': 12,
    'Finger': 13,
    'Trinket': 14,
    'Main Hand': 15,
    'Off Hand': 16,
    'One-Hand': 17,
    'Two-Hand': 18,
  };
  return order[slot] || 99;
}

// Запуск
if (require.main === module) {
  processKaggleDataset()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ Критична помилка:', error);
      process.exit(1);
    });
}

// Export the main function; also provide a backwards-compatible alias `processKaggleData`
module.exports = {
  processKaggleDataset,
  processKaggleData: processKaggleDataset
};
