const axios = require('axios');

let cachedToken = null;
let tokenExpiry = null;

// Маппінг назв класів з API
const CLASS_NAME_MAP = {
  'Warrior': 'warrior',
  'Paladin': 'paladin',
  'Hunter': 'hunter',
  'Rogue': 'rogue',
  'Priest': 'priest',
  'Death Knight': 'deathknight',
  'Shaman': 'shaman',
  'Mage': 'mage',
  'Warlock': 'warlock',
  'Monk': 'monk',
  'Druid': 'druid',
  'Demon Hunter': 'demonhunter',
  'Evoker': 'evoker'
};

// Ручний маппінг відомих tier sets по назвах (ключові слова)
const CLASS_KEYWORDS = {
  warrior: ['battlegear of might', 'wrath', 'dreadnaught', 'onslaught', 'destroyer', 'warbringer', 'conqueror', 'ymirjar lord'],
  paladin: ['lawbringer', 'judgement', 'avenger', 'justicar', 'crystalforge', 'lightbringer', 'redemption', 'radiant'],
  hunter: ['giantstalker', 'dragonstalker', 'cryptstalker', 'beast lord', 'demon stalker', 'gronnstalker', 'scourgestalker', 'windrunner'],
  rogue: ['nightslayer', 'bloodfang', 'bonescythe', 'netherblade', 'slayer', 'deathmantle', 'terrorblade', 'shadowblade'],
  priest: ['prophecy', 'transcendence', 'vestments of faith', 'incarnate', 'avatar', 'absolution', 'sanctification', 'zabra'],
  deathknight: ['dreadnaught', 'scourgelord', 'darkruned', 'sanctified scourgelord', 'magma plated'],
  shaman: ['earthfury', 'ten storms', 'tidefury', 'cyclone', 'skyshatter', 'cataclysm', 'worldbreaker', 'frost witch'],
  mage: ['arcanist', 'netherwind', 'frostfire', 'tirisfal', 'tempest', 'aldor', 'kirin tor', 'firehawk'],
  warlock: ['felheart', 'nemesis', 'plagueheart', 'voidheart', 'corruptor', 'malefic', 'deathbringer', 'shadowflame'],
  monk: ['vestments of the eternal dynasty', 'fire-charm', 'battlegear of the thousandfold blades', 'white tiger'],
  druid: ['cenarion', 'stormrage', 'dreamwalker', 'malorne', 'nordrassil', 'thunderheart', 'nightsong', 'lasherweave', 'obsidian arborweave'],
  demonhunter: ['diabolic', 'demonbane', 'vestments of blind absolution', 'regalia of the dashing scoundrel'],
  evoker: ['scales of the awakened', 'draconic hierophant', 'elements of infusion']
};

async function getAccessToken() {
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  const clientId = process.env.BLIZZARD_CLIENT_ID;
  const clientSecret = process.env.BLIZZARD_CLIENT_SECRET;

  try {
    const response = await axios.post(
      'https://oauth.battle.net/token',
      'grant_type=client_credentials',
      {
        auth: { username: clientId, password: clientSecret },
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );

    cachedToken = response.data.access_token;
    tokenExpiry = Date.now() + (response.data.expires_in * 1000) - 60000;
    return cachedToken;
  } catch (error) {
    console.error('Error getting access token:', error.message);
    throw error;
  }
}

// Визначення класів по назві сету
function getClassesByName(setName) {
  const nameLower = setName.toLowerCase();
  const classes = [];

  for (const [className, keywords] of Object.entries(CLASS_KEYWORDS)) {
    for (const keyword of keywords) {
      if (nameLower.includes(keyword.toLowerCase())) {
        if (!classes.includes(className)) {
          classes.push(className);
        }
        break;
      }
    }
  }

  return classes;
}

// Визначення класів по типу броні
function getClassesByArmorType(armorType) {
  const armorTypeClasses = {
    'Cloth': ['priest', 'mage', 'warlock'],
    'Leather': ['druid', 'rogue', 'monk', 'demonhunter'],
    'Mail': ['hunter', 'shaman', 'evoker'],
    'Plate': ['warrior', 'paladin', 'deathknight']
  };
  
  return armorTypeClasses[armorType] || [];
}

async function getAllItemSets() {
  try {
    const token = await getAccessToken();
    const response = await axios.get(
      'https://eu.api.blizzard.com/data/wow/item-set/index',
      {
        params: {
          namespace: 'static-eu',
          locale: 'en_US'
        },
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    return response.data.item_sets || [];
  } catch (error) {
    console.error('Error fetching item sets:', error.message);
    return [];
  }
}

// Отримання іконки першого предмета
async function getFirstItemIcon(itemId, token) {
  try {
    const response = await axios.get(
      `https://eu.api.blizzard.com/data/wow/media/item/${itemId}`,
      {
        params: {
          namespace: 'static-eu',
          locale: 'en_US'
        },
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    const iconAsset = response.data.assets?.find(asset => asset.key === 'icon');
    return iconAsset?.value || null;
  } catch (error) {
    return null;
  }
}

async function getItemSetDetails(setId) {
  try {
    const token = await getAccessToken();
    
    const setResponse = await axios.get(
      `https://eu.api.blizzard.com/data/wow/item-set/${setId}`,
      {
        params: {
          namespace: 'static-eu',
          locale: 'en_US'
        },
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    const setData = setResponse.data;
    let classes = [];
    let imageUrl = null;
    let iconName = null;

    if (setData.items && setData.items.length > 0) {
      const firstItem = setData.items[0];
      
      if (firstItem.item && firstItem.item.id) {
        try {
          // Отримуємо деталі предмета
          const itemResponse = await axios.get(
            `https://eu.api.blizzard.com/data/wow/item/${firstItem.item.id}`,
            {
              params: { namespace: 'static-eu', locale: 'en_US' },
              headers: { 'Authorization': `Bearer ${token}` }
            }
          );

          const itemData = itemResponse.data;
          
          // Отримуємо назву іконки
          if (itemData.media?.id) {
            const mediaResponse = await axios.get(
              `https://eu.api.blizzard.com/data/wow/media/item/${itemData.media.id}`,
              {
                params: { namespace: 'static-eu', locale: 'en_US' },
                headers: { 'Authorization': `Bearer ${token}` }
              }
            );
            
            const iconAsset = mediaResponse.data.assets?.find(a => a.key === 'icon');
            if (iconAsset?.value) {
              imageUrl = iconAsset.value;
              // Витягуємо назву іконки з URL
              iconName = iconAsset.value.match(/\/([^\/]+)\.jpg/)?.[1];
            }
          }

          // Перевіряємо allowable_classes
          if (itemData.preview_item?.binding?.allowable_classes) {
            itemData.preview_item.binding.allowable_classes.forEach(classInfo => {
              const mappedClass = CLASS_NAME_MAP[classInfo.name];
              if (mappedClass && !classes.includes(mappedClass)) {
                classes.push(mappedClass);
              }
            });
          }
          
          // Якщо класи не знайдені, використовуємо тип броні
          if (classes.length === 0 && itemData.item_class?.name === 'Armor' && itemData.item_subclass) {
            const armorClasses = getClassesByArmorType(itemData.item_subclass.name);
            classes.push(...armorClasses);
          }
        } catch (error) {
          console.error(`Error fetching item ${firstItem.item.id}:`, error.message);
        }
      }
    }

    // Спроба 2: Визначити класи по назві сету
    if (classes.length === 0 && setData.name) {
      const nameClasses = getClassesByName(setData.name);
      if (nameClasses.length > 0) {
        classes = nameClasses;
      }
    }

    // Якщо жодна спроба не спрацювала, позначаємо як 'all'
    if (classes.length === 0) {
      classes = ['all'];
    }

    // Fallback для зображення якщо не вдалося отримати через API
    if (!imageUrl) {
      if (iconName) {
        // WoWHead fallback
        imageUrl = `https://wow.zamimg.com/images/wow/icons/large/${iconName}.jpg`;
      } else {
        // Placeholder
        imageUrl = `https://render-eu.worldofwarcraft.com/icons/56/inv_misc_questionmark.jpg`;
      }
    }

    return {
      id: setId,
      name: setData.name || `Item Set ${setId}`,
      classes: classes,
      imageUrl: imageUrl,
      iconName: iconName, // Зберігаємо для fallback
      description: setData.description || 'Epic transmog set from World of Warcraft'
    };
  } catch (error) {
    if (error.response?.status === 404) {
      return null;
    }
    console.error(`Error fetching set ${setId}:`, error.message);
    return null;
  }
}

module.exports = {
  getAccessToken,
  getAllItemSets,
  getItemSetDetails
};
