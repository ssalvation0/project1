/**
 * Скрипт для оновлення зображень сетів з Wowhead
 * Виконує: node scripts/updateWowheadImages.js
 */

const fs = require('fs').promises;
const path = require('path');
const { getWowheadSetImage } = require('../utils/wowheadParser');

const TRANSMOGS_DATA_FILE = path.join(__dirname, '../data/transmogs.json');

async function updateWowheadImages() {
  try {
    console.log('📖 Завантажуємо дані з transmogs.json...');
    const data = await fs.readFile(TRANSMOGS_DATA_FILE, 'utf-8');
    const transmogs = JSON.parse(data);

    console.log(`📋 Знайдено ${transmogs.length} сетів`);
    console.log('🖼️  Починаємо оновлення зображень з Wowhead...\n');

    let updated = 0;
    let failed = 0;

    for (let i = 0; i < transmogs.length; i++) {
      const transmog = transmogs[i];
      
      // Пропускаємо якщо вже є нормальне зображення (не placeholder)
      if (transmog.imageUrl && 
          !transmog.imageUrl.includes('questionmark') && 
          !transmog.imageUrl.includes('classicon_')) {
        console.log(`⏭️  [${i + 1}/${transmogs.length}] Сет "${transmog.name}" вже має зображення, пропускаємо`);
        continue;
      }

      if (!transmog.setId) {
        console.log(`⚠️  [${i + 1}/${transmogs.length}] Сет "${transmog.name}" не має setId, пропускаємо`);
        continue;
      }

      console.log(`🔍 [${i + 1}/${transmogs.length}] Шукаємо зображення для "${transmog.name}" (setId: ${transmog.setId})...`);
      
      try {
        const wowheadImage = await getWowheadSetImage(transmog.setId);
        
        if (wowheadImage) {
          // Оновлюємо imageUrl та iconUrl якщо вони були placeholder
          if (!transmog.imageUrl || transmog.imageUrl.includes('questionmark')) {
            transmog.imageUrl = wowheadImage;
          }
          if (!transmog.iconUrl || transmog.iconUrl.includes('questionmark')) {
            transmog.iconUrl = wowheadImage;
          }
          
          console.log(`✅ Оновлено: ${wowheadImage}`);
          updated++;
        } else {
          console.log(`❌ Зображення не знайдено`);
          failed++;
        }
        
        // Затримка між запитами щоб не перевантажити сервер
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`❌ Помилка для сету ${transmog.setId}:`, error.message);
        failed++;
      }
    }

    // Зберігаємо оновлені дані
    console.log('\n💾 Зберігаємо оновлені дані...');
    await fs.writeFile(
      TRANSMOGS_DATA_FILE,
      JSON.stringify(transmogs, null, 2),
      'utf-8'
    );

    console.log('\n✨ Готово!');
    console.log(`✅ Оновлено: ${updated} сетів`);
    console.log(`❌ Помилок: ${failed} сетів`);
    console.log(`📊 Всього: ${transmogs.length} сетів`);
  } catch (error) {
    console.error('❌ Критична помилка:', error);
    process.exit(1);
  }
}

// Запускаємо скрипт
if (require.main === module) {
  updateWowheadImages();
}

module.exports = { updateWowheadImages };

