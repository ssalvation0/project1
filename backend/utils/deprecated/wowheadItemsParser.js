const axios = require('axios');
const cheerio = require('cheerio');

// Кеш для зменшення запитань
const itemCache = new Map();

// Маппінг слотів Wowhead -> наша система
const SLOT_MAPPING = {
  'Head': 'Head',
  'Neck': 'Neck',
  'Shoulder': 'Shoulders',
  'Shoulders': 'Shoulders',
  'Back': 'Back',
  'Chest': 'Chest',
  'Wrist': 'Wrist',
  'Hands': 'Hands',
  'Waist': 'Waist',
  'Legs': 'Legs',
  'Feet': 'Feet',
  'Finger': 'Finger',
  'Trinket': 'Trinket',
  'Main Hand': 'Main Hand',
  'Off Hand': 'Off Hand',
  'Two-Hand': 'Two-Hand',
  'One-Hand': 'One-Hand',
  'Shield': 'Shield'
};

// Інвентарні слоти для розпізнавання
const INVENTORY_SLOTS = {
  1: 'Head',
  2: 'Neck',
  3: 'Shoulders',
  5: 'Chest',
  6: 'Waist',
  7: 'Legs',
  8: 'Feet',
  9: 'Wrist',
  10: 'Hands',
  11: 'Finger',
  12: 'Trinket',
  13: 'One-Hand',
  14: 'Off Hand',
  15: 'Ranged',
  16: 'Back',
  17: 'Two-Hand',
  21: 'Main Hand',
  22: 'Off Hand',
  23: 'Off Hand'
};

/**
 * Парсить Wowhead сторінку сету та повертає список предметів
 * @param {number} setId - ID сету на Wowhead
 * @returns {Promise<Array>} Масив предметів сету
 */
async function parseWowheadSetItems(setId) {
  // Перевіряємо кеш
  if (itemCache.has(setId)) {
    return itemCache.get(setId);
  }

  try {
    const url = `https://www.wowhead.com/item-set=${setId}`;
    console.log(`🔍 Парсимо предмети Wowhead для сету ${setId}...`);

    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);
    const items = [];

    // Шукаємо всі елементи сету
    // Wowhead зберігає дані в window.wowheadData.itemSets
    const scriptContent = $('script').toArray()
      .map(script => $(script).html())
      .join('\n');

    // Шукаємо JSON дані
    const itemSetMatch = scriptContent.match(/new Listview\(\{template: "item", id: "items"[^}]+\}\);?\s*}([^]+?)\);?/);
    
    if (itemSetMatch) {
      // Спробуємо витягнути дані з Listview
      const listviewData = itemSetMatch[1];
      
      // Шукаємо масив items в Listview
      const itemsMatch = listviewData.match(/items:\s*(\[[^\]]+\])/);
      
      if (itemsMatch) {
        try {
          const itemsJson = JSON.parse(itemsMatch[1]);
          for (const item of itemsJson) {
            if (item && item.id) {
              items.push({
                id: item.id,
                name: item.name || 'Unknown Item',
                slot: item.slot || 'Unknown',
                iconUrl: item.icon ? `https://wow.zamimg.com/images/wow/icons/large/${item.icon.toLowerCase()}.jpg` : null,
                itemLevel: item.ilevel || 0,
                rarity: item.quality || 'Epic'
              });
            }
          }
        } catch (jsonError) {
          console.log(`  ⚠️ Не вдалося розпарсити JSON items для сету ${setId}`);
        }
      }
    }

    // Альтернативний метод: парсимо HTML таблицю предметів
    if (items.length === 0) {
      // Шукаємо таблицю предметів - вона у нас в ref-76nw0jdzvp4 з гляду на snapshot
      $('table').each((_, table) => {
        const $table = $(table);
        // Перевіряємо чи є в таблиці посилання на предмети
        if ($table.find('a[href*="/item="]').length === 0) return;
        
        $table.find('tr').each((_, row) => {
          const $row = $(row);
          
          // Пропускаємо заголовок
          if ($row.find('th').length > 0) return;

          const link = $row.find('a[href*="/item="]').first();
          if (link.length === 0) return;

          const href = link.attr('href');
          const itemIdMatch = href.match(/item=(\d+)/);
          if (!itemIdMatch) return;

          const itemId = parseInt(itemIdMatch[1]);
          const itemName = link.text().trim();
          
          // Шукаємо слот через href чи інші методи
          // Wowhead часто використовує data-slot або інші атрибути
          let slot = 'Unknown';
          
          // Спробуємо знайти через посилання на wowhead item
          const itemDataMatch = href.match(/item=(\d+).*?slot=(\w+)/);
          if (itemDataMatch && itemDataMatch[2]) {
            slot = SLOT_MAPPING[itemDataMatch[2]] || itemDataMatch[2];
          }
          
          // Спробуємо через Іконку - часто в ім'я файлу входить інформація
          const iconDiv = $row.find('th div, td div').first();
          const iconLink = iconDiv.find('a').first();
          if (iconLink.length > 0) {
            const iconHref = iconLink.attr('href') || '';
            const iconIdMatch = iconHref.match(/item=(\d+)/);
            if (iconIdMatch) {
              // Wowhead uses icon name pattern
              const iconImg = iconDiv.find('img, .icon-wrapper img').first();
              if (iconImg.length > 0) {
                const iconAlt = iconImg.attr('alt') || '';
                // Try to extract slot from alt text
                const slotMatch = iconAlt.match(/(Head|Shoulders|Chest|Hands|Legs|Feet|Wrist|Waist)/i);
                if (slotMatch) {
                  slot = slotMatch[1].charAt(0) + slotMatch[1].slice(1).toLowerCase();
                  slot = SLOT_MAPPING[slot] || slot;
                }
              }
            }
          }

          // Шукаємо іконку
          const iconImg = $row.find('img').first();
          let iconUrl = null;
          if (iconImg.length > 0) {
            const iconSrc = iconImg.attr('src') || iconImg.attr('data-src');
            if (iconSrc && !iconSrc.includes('pixel.gif') && !iconSrc.includes('blank.gif')) {
              iconUrl = iconSrc.startsWith('http') ? iconSrc : `https://wow.zamimg.com${iconSrc}`;
              // Convert to large icon
              iconUrl = iconUrl.replace(/\/small\//, '/large/');
            }
          }

          // Якщо не знайшли іконку, генеруємо URL
          if (!iconUrl && itemId) {
            // Wowhead часто зберігає іконку в змінних JS
            iconUrl = `https://wow.zamimg.com/images/wow/icons/large/inv_misc_questionmark.jpg`;
          }

          // Шукаємо item level
          let itemLevel = 0;
          const ilvlCell = $row.find('td').filter((_, cell) => {
            const text = $(cell).text().trim();
            return /^\d+$/.test(text) && parseInt(text) > 100;
          }).first();
          if (ilvlCell.length > 0) {
            itemLevel = parseInt(ilvlCell.text().trim());
          }

          items.push({
            id: itemId,
            name: itemName || 'Unknown Item',
            slot: slot,
            iconUrl: iconUrl,
            itemLevel: itemLevel || 0,
            rarity: 'Epic'
          });
        });
      });
    }

    // Якщо все ще немає предметів, спробуємо знайти через <script> з JSON данними
    if (items.length === 0) {
      const scripts = $('script');
      scripts.each((_, script) => {
        const content = $(script).html();
        
        // Шукаємо var g_items = ...
        const varMatch = content.match(/var g_items\s*=\s*(\[[^\]]+\])/);
        if (varMatch) {
          try {
            const gItems = JSON.parse(varMatch[1]);
            for (const item of gItems) {
              items.push({
                id: item.id,
                name: item.name,
                slot: INVENTORY_SLOTS[item.invType] || 'Unknown',
                iconUrl: item.icon ? `https://wow.zamimg.com/images/wow/icons/large/${item.icon.toLowerCase()}.jpg` : null,
                itemLevel: 0,
                rarity: 'Epic'
              });
            }
          } catch (err) {
            // Ігноруємо помилки
          }
        }
      });
    }

    // Кешуємо результат
    if (items.length > 0) {
      itemCache.set(setId, items);
      console.log(`  ✅ Знайдено ${items.length} предметів для сету ${setId}`);
    } else {
      console.log(`  ❌ Предметів не знайдено для сету ${setId}`);
    }

    return items;

  } catch (error) {
    console.error(`  ❌ Помилка парсингу Wowhead для сету ${setId}:`, error.message);
    return [];
  }
}

module.exports = { parseWowheadSetItems };

