const express = require('express');
const router = express.Router();
const axios = require('axios');
const NodeCache = require('node-cache');
const fs = require('fs').promises;
const path = require('path');
const { getAllItemSets, getItemSetDetails } = require('../utils/blizzardAPI');
const { getWowheadSetImage } = require('../utils/wowheadParser');
const { parseWowheadSetItems } = require('../utils/wowheadItemsParser');

const cache = new NodeCache({ stdTTL: 3600 });

const CLIENT_ID = process.env.BLIZZARD_CLIENT_ID;
const CLIENT_SECRET = process.env.BLIZZARD_CLIENT_SECRET;
const REGION = process.env.BLIZZARD_REGION || 'us';

// Шлях до файлу з кешованими сетами
const TRANSMOGS_DATA_FILE = path.join(__dirname, '../data/transmogs.json');

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('❌ ERROR: BLIZZARD_CLIENT_ID or BLIZZARD_CLIENT_SECRET is missing in .env file!');
}

let accessToken = null;
let tokenExpiry = 0;

async function getAccessToken() {
  if (accessToken && Date.now() < tokenExpiry) {
    return accessToken;
  }

  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error('Blizzard API credentials not configured');
  }

  try {
    console.log('🔑 Requesting new access token...');
    const response = await axios.post(
      'https://oauth.battle.net/token',
      'grant_type=client_credentials',
      {
        auth: {
          username: CLIENT_ID,
          password: CLIENT_SECRET
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    accessToken = response.data.access_token;
    tokenExpiry = Date.now() + (response.data.expires_in * 1000) - 60000;
    console.log('✓ Access token obtained successfully');
    return accessToken;
  } catch (error) {
    console.error('❌ Failed to get access token:', error.response?.data || error.message);
    throw new Error('Failed to authenticate with Blizzard API');
  }
}

// Class icons/colors
// Використовуємо Wowhead для іконок класів (більш надійні, великі зображення)
const classIcons = {
  'Warrior': 'https://wow.zamimg.com/images/wow/icons/large/classicon_warrior.jpg',
  'Paladin': 'https://wow.zamimg.com/images/wow/icons/large/classicon_paladin.jpg',
  'Hunter': 'https://wow.zamimg.com/images/wow/icons/large/classicon_hunter.jpg',
  'Rogue': 'https://wow.zamimg.com/images/wow/icons/large/classicon_rogue.jpg',
  'Priest': 'https://wow.zamimg.com/images/wow/icons/large/classicon_priest.jpg',
  'Shaman': 'https://wow.zamimg.com/images/wow/icons/large/classicon_shaman.jpg',
  'Mage': 'https://wow.zamimg.com/images/wow/icons/large/classicon_mage.jpg',
  'Warlock': 'https://wow.zamimg.com/images/wow/icons/large/classicon_warlock.jpg',
  'Druid': 'https://wow.zamimg.com/images/wow/icons/large/classicon_druid.jpg',
  'Death Knight': 'https://wow.zamimg.com/images/wow/icons/large/classicon_deathknight.jpg',
  'Monk': 'https://wow.zamimg.com/images/wow/icons/large/classicon_monk.jpg',
  'Demon Hunter': 'https://wow.zamimg.com/images/wow/icons/large/classicon_demonhunter.jpg',
  'Evoker': 'https://wow.zamimg.com/images/wow/icons/large/classicon_evoker.jpg'
};

// Функція для завантаження трансмогів з файлу
async function loadTransmogsFromFile() {
  try {
    const data = await fs.readFile(TRANSMOGS_DATA_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.warn('⚠️ Файл з трансмогами не знайдено, використовуються mock дані');
    // Fallback до mock даних
    return [
      { id: 1, name: "Tier 1 - Might (Warrior)", class: "Warrior", expansion: "Classic", iconUrl: classIcons['Warrior'] },
      { id: 2, name: "Tier 1 - Wrath (Rogue)", class: "Rogue", expansion: "Classic", iconUrl: classIcons['Rogue'] },
      { id: 3, name: "Tier 1 - Vestments of Prophecy (Priest)", class: "Priest", expansion: "Classic", iconUrl: classIcons['Priest'] },
      { id: 4, name: "Tier 1 - Cenarion Raiment (Druid)", class: "Druid", expansion: "Classic", iconUrl: classIcons['Druid'] },
      { id: 5, name: "Tier 2 - Judgment (Paladin)", class: "Paladin", expansion: "Classic", iconUrl: classIcons['Paladin'] },
      { id: 6, name: "Tier 2 - Nemesis (Warlock)", class: "Warlock", expansion: "Classic", iconUrl: classIcons['Warlock'] },
      { id: 7, name: "Tier 2 - Netherwind (Mage)", class: "Mage", expansion: "Classic", iconUrl: classIcons['Mage'] },
      { id: 8, name: "Tier 2 - Dragonstalker (Hunter)", class: "Hunter", expansion: "Classic", iconUrl: classIcons['Hunter'] },
      { id: 9, name: "Tier 3 - Dreadnaught (Warrior)", class: "Warrior", expansion: "Classic", iconUrl: classIcons['Warrior'] },
      { id: 10, name: "Tier 3 - Bonescythe (Rogue)", class: "Rogue", expansion: "Classic", iconUrl: classIcons['Rogue'] }
    ];
  }
}


router.get('/', async (req, res) => {
  try {
    const { page = 0, limit = 20, class: classFilter } = req.query;
    const offset = parseInt(page) * parseInt(limit);

    // Завантажуємо трансмоги з файлу або fallback до mock
    let transmogsData = await loadTransmogsFromFile();

    // Фільтрація за класом якщо вказано
    if (classFilter && classFilter !== 'all') {
      transmogsData = transmogsData.filter(item => {
        const itemClass = (item.class || '').toLowerCase().replace(/\s+/g, '');
        const filterClass = classFilter.toLowerCase();
        return itemClass === filterClass || itemClass.includes(filterClass);
      });
    }

    // Пагінація
    const totalItems = transmogsData.length;
    const paginatedData = transmogsData.slice(offset, offset + parseInt(limit));
    
    const result = {
      transmogs: await Promise.all(paginatedData.map(async (item) => {
        // Пріоритет: imageUrl (велике зображення 512x512) -> iconUrl (56x56) -> іконка класу
        let imageUrl = item.imageUrl || item.iconUrl;
        
        // Якщо iconUrl це placeholder або не існує, але є setId - спробуємо отримати з API
        if ((!imageUrl || imageUrl.includes('questionmark')) && item.setId) {
          try {
            const { getItemSetDetails } = require('../utils/blizzardAPI');
            const details = await getItemSetDetails(item.setId);
            if (details && details.imageUrl && !details.imageUrl.includes('questionmark')) {
              imageUrl = details.imageUrl; // Це вже велике зображення (512x512)
            } else {
              // Якщо Blizzard API не має зображення, спробуємо Wowhead
              const wowheadImage = await getWowheadSetImage(item.setId);
              if (wowheadImage) {
                imageUrl = wowheadImage;
              }
            }
          } catch (error) {
            // Якщо Blizzard API не спрацював, спробуємо Wowhead
            if (item.setId) {
              try {
                const wowheadImage = await getWowheadSetImage(item.setId);
                if (wowheadImage) {
                  imageUrl = wowheadImage;
                }
              } catch (wowheadError) {
                // Ігноруємо помилку Wowhead
              }
            }
          }
        }
        
        // Якщо є iconUrl (не placeholder), конвертуємо в велике зображення
        if (imageUrl && !imageUrl.includes('questionmark') && imageUrl.includes('/icons/56/')) {
          // Конвертуємо з 56x56 на 512x512
          imageUrl = imageUrl.replace(/\/icons\/\d+\//, '/icons/512/');
        }
        
        // Якщо все ще немає зображення або це placeholder, використовуємо іконку класу
        if (!imageUrl || imageUrl.includes('questionmark')) {
          // Використовуємо іконку класу з Wowhead (вже велика)
          imageUrl = classIcons[item.class] || classIcons['Warrior'] || classIcons['Warrior'];
        }
        
        // Гарантуємо, що imageUrl завжди має значення
        if (!imageUrl) {
          imageUrl = classIcons['Warrior'];
        }
        
        return {
          id: item.id,
          name: item.name,
          iconUrl: imageUrl, // Для картки використовуємо зображення сету
          imageUrl: imageUrl, // Зберігаємо також як imageUrl
          items: item.items || [],
          class: item.class || 'All',
          expansion: item.expansion || 'Unknown',
          setId: item.setId // Зберігаємо setId для можливості створення Wowhead URL
        };
      })),
      pagination: {
        currentPage: parseInt(page),
        totalItems: totalItems,
        itemsPerPage: parseInt(limit),
        totalPages: Math.ceil(totalItems / parseInt(limit))
      }
    };

    res.json(result);

  } catch (error) {
    console.error('Error in /api/transmogs:', error.message);
    
    res.status(500).json({ 
      error: 'Failed to fetch transmogs',
      message: error.message
    });
  }
});

// GET конкретний transmog за ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const transmogId = parseInt(id);
    
    // Завантажуємо трансмоги
    const transmogsData = await loadTransmogsFromFile();
    let transmog = transmogsData.find(item => item.id === transmogId);
    
    // Якщо не знайдено в файлі, намагаємось отримати з Blizzard API по setId
    if (!transmog && transmogId > 0 && transmogId < 1000) {
      // Спробуємо завантажити деталі з API
      try {
        const details = await getItemSetDetails(transmogId);
        if (details) {
          transmog = {
            id: transmogId,
            setId: transmogId,
            name: details.name,
            iconUrl: details.imageUrl,
            class: details.classes && details.classes.length > 0 
              ? details.classes[0].charAt(0).toUpperCase() + details.classes[0].slice(1)
              : 'All',
            expansion: 'Unknown',
            description: details.description
          };
        }
      } catch (apiError) {
        console.warn('Не вдалося завантажити з API:', apiError.message);
      }
    }
    
    if (!transmog) {
      return res.status(404).json({ 
        error: 'Transmog not found',
        message: `No transmog found with ID ${transmogId}`
      });
    }
    
    // Отримуємо предмети з файлу
    let items = transmog.items && transmog.items.length > 0 ? transmog.items : [];
    
    // Якщо немає предметів, але є setId - спробуємо парсити Wowhead
    if (items.length === 0 && transmog.setId) {
      console.log(`📦 Завантажуємо предмети з Wowhead для сету ${transmog.setId}...`);
      try {
        items = await parseWowheadSetItems(transmog.setId);
        
        // Якщо отримали предмети з Wowhead, зберігаємо їх
        if (items.length > 0) {
          console.log(`  ✅ Знайдено ${items.length} предметів`);
          // Оновлюємо локальні дані
          transmog.items = items;
        } else {
          console.log(`  ℹ️ Wowhead не повернув предметів`);
        }
      } catch (wowheadError) {
        console.error(`  ❌ Помилка Wowhead: ${wowheadError.message}`);
      }
    }
    
    // Розширюємо дані для детальної сторінки
    const detailedTransmog = {
      id: transmog.id,
      name: transmog.name,
      iconUrl: transmog.iconUrl || classIcons[transmog.class] || null,
      imageUrl: transmog.imageUrl || transmog.iconUrl || classIcons[transmog.class] || null,
      class: transmog.class || 'All',
      expansion: transmog.expansion || 'Unknown',
      setId: transmog.setId,
      description: transmog.description || `Epic transmog set from ${transmog.expansion || 'World of Warcraft'}. This set provides unique visual appearance for ${transmog.class || 'all'} characters.`,
      items: items,
      stats: transmog.stats || {
        itemLevel: 60 + Math.floor(Math.random() * 40),
        requiredLevel: 60,
        durability: 100
      },
      source: transmog.source || {
        type: 'Raid',
        location: `${transmog.expansion || 'Unknown'} Raid`,
        difficulty: 'Normal'
      }
    };
    
    res.json(detailedTransmog);

  } catch (error) {
    console.error('Error fetching transmog details:', error.message);
    
    res.status(500).json({ 
      error: 'Failed to fetch transmog details',
      message: error.message
    });
  }
});

module.exports = router;