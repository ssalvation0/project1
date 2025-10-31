const fs = require('fs').promises;
const path = require('path');

const TRANSMOGS_DATA_FILE = path.join(__dirname, '../data/transmogs.json');

async function removeShareIcons() {
  try {
    console.log('📖 Завантажуємо дані...');
    const data = await fs.readFile(TRANSMOGS_DATA_FILE, 'utf-8');
    const transmogs = JSON.parse(data);

    let removed = 0;
    
    transmogs.forEach((t, i) => {
      if (t.imageUrl && t.imageUrl.includes('share-icon')) {
        console.log(`[${i+1}/${transmogs.length}] Removing share-icon from '${t.name}'`);
        t.imageUrl = null;
        t.iconUrl = null;
        removed++;
      }
    });
    
    console.log(`\n💾 Зберігаємо оновлені дані...`);
    await fs.writeFile(TRANSMOGS_DATA_FILE, JSON.stringify(transmogs, null, 2));
    console.log(`\n✅ Готово! Видалено ${removed} share-icon зображень`);
    
    // Тепер запускаємо update-images
    console.log('\n🖼️  Запускаємо оновлення зображень...\n');
    const { updateWowheadImages } = require('./updateWowheadImages');
    await updateWowheadImages();
    
  } catch (error) {
    console.error('❌ Помилка:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  removeShareIcons();
}

module.exports = { removeShareIcons };

