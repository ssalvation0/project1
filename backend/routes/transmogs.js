const express = require('express');
const router = express.Router();
const axios = require('axios');
const NodeCache = require('node-cache');

const cache = new NodeCache({ stdTTL: 3600 });

const CLIENT_ID = process.env.BLIZZARD_CLIENT_ID;
const CLIENT_SECRET = process.env.BLIZZARD_CLIENT_SECRET;
const REGION = process.env.BLIZZARD_REGION || 'us';

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
const classIcons = {
  'Warrior': 'https://render.worldofwarcraft.com/us/icons/56/classicon_warrior.jpg',
  'Paladin': 'https://render.worldofwarcraft.com/us/icons/56/classicon_paladin.jpg',
  'Hunter': 'https://render.worldofwarcraft.com/us/icons/56/classicon_hunter.jpg',
  'Rogue': 'https://render.worldofwarcraft.com/us/icons/56/classicon_rogue.jpg',
  'Priest': 'https://render.worldofwarcraft.com/us/icons/56/classicon_priest.jpg',
  'Shaman': 'https://render.worldofwarcraft.com/us/icons/56/classicon_shaman.jpg',
  'Mage': 'https://render.worldofwarcraft.com/us/icons/56/classicon_mage.jpg',
  'Warlock': 'https://render.worldofwarcraft.com/us/icons/56/classicon_warlock.jpg',
  'Druid': 'https://render.worldofwarcraft.com/us/icons/56/classicon_druid.jpg',
  'Death Knight': 'https://render.worldofwarcraft.com/us/icons/56/classicon_deathknight.jpg',
  'Monk': 'https://render.worldofwarcraft.com/us/icons/56/classicon_monk.jpg',
  'Demon Hunter': 'https://render.worldofwarcraft.com/us/icons/56/classicon_demonhunter.jpg'
};

// Тимчасові дані для тестування
const mockTransmogData = [
  { id: 1, name: "Tier 1 - Might (Warrior)", class: "Warrior", expansion: "Classic" },
  { id: 2, name: "Tier 1 - Wrath (Rogue)", class: "Rogue", expansion: "Classic" },
  { id: 3, name: "Tier 1 - Vestments of Prophecy (Priest)", class: "Priest", expansion: "Classic" },
  { id: 4, name: "Tier 1 - Cenarion Raiment (Druid)", class: "Druid", expansion: "Classic" },
  { id: 5, name: "Tier 2 - Judgment (Paladin)", class: "Paladin", expansion: "Classic" },
  { id: 6, name: "Tier 2 - Nemesis (Warlock)", class: "Warlock", expansion: "Classic" },
  { id: 7, name: "Tier 2 - Netherwind (Mage)", class: "Mage", expansion: "Classic" },
  { id: 8, name: "Tier 2 - Dragonstalker (Hunter)", class: "Hunter", expansion: "Classic" },
  { id: 9, name: "Tier 3 - Dreadnaught (Warrior)", class: "Warrior", expansion: "Classic" },
  { id: 10, name: "Tier 3 - Bonescythe (Rogue)", class: "Rogue", expansion: "Classic" },
  { id: 11, name: "Tier 4 - Justicar (Paladin)", class: "Paladin", expansion: "TBC" },
  { id: 12, name: "Tier 4 - Demon Stalker (Hunter)", class: "Hunter", expansion: "TBC" },
  { id: 13, name: "Tier 5 - Crystalforge (Paladin)", class: "Paladin", expansion: "TBC" },
  { id: 14, name: "Tier 6 - Lightbringer (Paladin)", class: "Paladin", expansion: "TBC" },
  { id: 15, name: "Tier 7 - Heroes' Dreadnaught (Warrior)", class: "Warrior", expansion: "WotLK" },
  { id: 16, name: "Tier 8 - Conqueror's Siegebreaker (Warrior)", class: "Warrior", expansion: "WotLK" },
  { id: 17, name: "Tier 9 - Wrynn's Battlegear (Warrior)", class: "Warrior", expansion: "WotLK" },
  { id: 18, name: "Tier 10 - Sanctified Ymirjar Lord's Battlegear", class: "Warrior", expansion: "WotLK" },
  { id: 19, name: "Bloodfang Armor (Rogue)", class: "Rogue", expansion: "Classic" },
  { id: 20, name: "Vestments of Faith (Priest)", class: "Priest", expansion: "Classic" }
];

router.get('/', async (req, res) => {
  try {
    console.log('\n📥 New request received');
    console.log('Query params:', req.query);
    
    const { page = 0, limit = 20 } = req.query;
    const offset = parseInt(page) * parseInt(limit);

    // Використовуємо mock дані з іконками класів
    const paginatedData = mockTransmogData.slice(offset, offset + parseInt(limit));
    
    const result = {
      transmogs: paginatedData.map(item => ({
        id: item.id,
        name: item.name,
        iconUrl: classIcons[item.class] || null,
        items: [],
        class: item.class,
        expansion: item.expansion
      })),
      pagination: {
        currentPage: parseInt(page),
        totalItems: mockTransmogData.length,
        itemsPerPage: parseInt(limit),
        totalPages: Math.ceil(mockTransmogData.length / parseInt(limit))
      }
    };

    console.log('✓ Response sent successfully with mock data\n');
    res.json(result);

  } catch (error) {
    console.error('\n❌ ERROR in /api/transmogs:');
    console.error('Message:', error.message);
    
    res.status(500).json({ 
      error: 'Failed to fetch transmogs',
      message: error.message
    });
  }
});

module.exports = router;