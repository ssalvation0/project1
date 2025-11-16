const axios = require('axios');
const { getWowheadSetImage } = require('./wowheadParser');

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
  warrior: ['battlegear of might', 'wrath', 'dreadnaught', 'onslaught', 'destroyer', 'warbringer', 'conqueror', 'ymirjar lord', 'vindicator', 'onslaught', 'warmonger', 'siegebreaker'],
  paladin: ['lawbringer', 'judgement', 'avenger', 'justicar', 'crystalforge', 'lightbringer', 'redemption', 'radiant', 'guardian', 'righteous', 'purifier'],
  hunter: ['giantstalker', 'dragonstalker', 'cryptstalker', 'beast lord', 'demon stalker', 'gronnstalker', 'scourgestalker', 'windrunner', 'beastmaster', 'ranger', 'tracker'],
  rogue: ['nightslayer', 'bloodfang', 'bonescythe', 'netherblade', 'slayer', 'deathmantle', 'terrorblade', 'shadowblade', 'assassin', 'outlaw', 'subterfuge'],
  priest: ['prophecy', 'transcendence', 'vestments of faith', 'incarnate', 'avatar', 'absolution', 'sanctification', 'zabra', 'devout', 'divine', 'holy'],
  deathknight: ['dreadnaught', 'scourgelord', 'darkruned', 'sanctified scourgelord', 'magma plated', 'unholy', 'frost', 'blood', 'lich', 'reaper'],
  shaman: ['earthfury', 'ten storms', 'tidefury', 'cyclone', 'skyshatter', 'cataclysm', 'worldbreaker', 'frost witch', 'elemental', 'stormcaller', 'thunder'],
  mage: ['arcanist', 'netherwind', 'frostfire', 'tirisfal', 'tempest', 'aldor', 'kirin tor', 'firehawk', 'archmage', 'frost', 'arcane'],
  warlock: ['felheart', 'nemesis', 'plagueheart', 'voidheart', 'corruptor', 'malefic', 'deathbringer', 'shadowflame', 'demonic', 'affliction', 'destruction'],
  monk: ['vestments of the eternal dynasty', 'fire-charm', 'battlegear of the thousandfold blades', 'white tiger', 'zen', 'mistweaver', 'windwalker', 'brewmaster'],
  druid: ['cenarion', 'stormrage', 'dreamwalker', 'malorne', 'nordrassil', 'thunderheart', 'nightsong', 'lasherweave', 'obsidian arborweave', 'balance', 'feral', 'guardian', 'restoration'],
  demonhunter: ['diabolic', 'demonbane', 'vestments of blind absolution', 'regalia of the dashing scoundrel', 'vengeance', 'havoc', 'fel'],
  evoker: ['scales of the awakened', 'draconic hierophant', 'elements of infusion', 'preservation', 'devastation', 'augmentation']
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

  // Спеціальна обробка Gladiator сетів (PvP) - потрібно визначити по типу броні, але за замовчуванням показуємо для всіх
  // "Gladiator's Wildhide" - Druid (hide = leather)
  // "Gladiator's Investiture" - могло бути різне
  // "Gladiator's Raiment" - Cloth (Priest/Mage/Warlock)
  if (nameLower.includes('gladiator')) {
    if (nameLower.includes('wildhide') || nameLower.includes('hide')) {
      classes.push('druid');
    } else if (nameLower.includes('raiment') || nameLower.includes('vestments')) {
      // Cloth - може бути Priest, Mage, Warlock
      classes.push('priest', 'mage', 'warlock');
    } else if (nameLower.includes('battlegear') || nameLower.includes('armor')) {
      // Plate - Warrior, Paladin, Death Knight
      classes.push('warrior', 'paladin', 'deathknight');
    } else if (nameLower.includes('mail')) {
      // Mail - Hunter, Shaman, Evoker
      classes.push('hunter', 'shaman', 'evoker');
    } else if (nameLower.includes('leather')) {
      // Leather - Druid, Rogue, Monk, Demon Hunter
      classes.push('druid', 'rogue', 'monk', 'demonhunter');
    }
    // Якщо не знайдено специфічних підказок, не додаємо нічого - буде перевірено по іншим методам
  }

  // Перевірка за ключовими словами
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

  // Спеціальні випадки для новіших сетів
  if (nameLower.includes('iceborne') || nameLower.includes('ice bound')) {
    // Iceborne Embrace - потрібно визначити по типу броні, але зазвичай це для Plate
    if (!classes.length) {
      classes.push('warrior', 'paladin', 'deathknight');
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
    let bestItemForImage = null;

    // Знаходимо найбільш представницький предмет для зображення сету
    // Пріоритет: Helm (0), Chest (4), Shoulders (2), Legs (6)
    const prioritySlots = [0, 4, 2, 6, 1, 5, 7, 8, 9, 3]; // Inventory type priorities
    
    if (setData.items && setData.items.length > 0) {
      // Сортуємо предмети за пріоритетом слотів
      const sortedItems = [...setData.items].sort((a, b) => {
        const slotA = a.display_string?.match(/\((Head|Chest|Shoulder|Leg|Hand|Foot|Waist|Wrist|Back)\)/)?.[1] || '';
        const slotB = b.display_string?.match(/\((Head|Chest|Shoulder|Leg|Hand|Foot|Waist|Wrist|Back)\)/)?.[1] || '';
        const priorityA = slotA === 'Head' ? 0 : slotA === 'Chest' ? 1 : slotA === 'Shoulder' ? 2 : slotA === 'Leg' ? 3 : 99;
        const priorityB = slotB === 'Head' ? 0 : slotB === 'Chest' ? 1 : slotB === 'Shoulder' ? 2 : slotB === 'Leg' ? 3 : 99;
        return priorityA - priorityB;
      });

      bestItemForImage = sortedItems.find(item => item.item?.id) || setData.items[0];
      const firstItem = bestItemForImage || setData.items[0];
      
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
            try {
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
            } catch (mediaError) {
              // Якщо media не доступна, спробуємо через item icon name
              if (itemData.name && itemData.name.en_US) {
                // Fallback - використовуємо icon name з самого item якщо доступно
                console.log(`Media not available for item ${itemData.id}, trying alternative`);
              }
            }
          }
          
          // Альтернативний спосіб - спробуємо отримати media безпосередньо через item ID
          if (!imageUrl && firstItem.item.id) {
            try {
              const directMediaResponse = await axios.get(
                `https://eu.api.blizzard.com/data/wow/media/item/${firstItem.item.id}`,
                {
                  params: { namespace: 'static-eu', locale: 'en_US' },
                  headers: { 'Authorization': `Bearer ${token}` }
                }
              );
              
              const iconAsset = directMediaResponse.data.assets?.find(a => a.key === 'icon');
              if (iconAsset?.value) {
                imageUrl = iconAsset.value;
                iconName = iconAsset.value.match(/\/([^\/]+)\.jpg/)?.[1];
              }
            } catch (directMediaError) {
              // Ігноруємо помилку, продовжуємо з іншими методами
            }
          }

          // Перевіряємо inventory_type для вибору найкращого предмета для зображення
          if (itemData.inventory_type) {
            const invType = itemData.inventory_type.type;
            // Якщо це шолом (1) або нагрудник (5), зберігаємо для зображення
            if ((invType === 'HEAD' || invType === 'CHEST') && !bestItemForImage) {
              bestItemForImage = firstItem;
            }
          }

          // Перевіряємо allowable_classes в preview_item
          if (itemData.preview_item?.binding?.allowable_classes) {
            itemData.preview_item.binding.allowable_classes.forEach(classInfo => {
              const mappedClass = CLASS_NAME_MAP[classInfo.name];
              if (mappedClass && !classes.includes(mappedClass)) {
                classes.push(mappedClass);
              }
            });
          }
          
          // Перевіряємо allowable_classes безпосередньо в item
          if (classes.length === 0 && itemData.requirements?.allowable_classes) {
            itemData.requirements.allowable_classes.forEach(classInfo => {
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
          
          // Остання спроба - перевіряємо item_subclass для додаткових підказок
          if (classes.length === 0 && itemData.item_subclass?.name) {
            const subclass = itemData.item_subclass.name.toLowerCase();
            // Можна додати додаткову логіку на основі підкласу
          }
        } catch (error) {
          console.error(`Error fetching item ${firstItem.item.id}:`, error.message);
        }
      }
    }

    // Спроба 2: Визначити класи по назві сету (пріоритетний метод, якщо API недоступний)
    if (setData.name) {
      const nameClasses = getClassesByName(setData.name);
      if (nameClasses.length > 0) {
        // Якщо знайшли класи по назві, використовуємо їх (особливо якщо API не працює)
        classes = [...new Set([...classes, ...nameClasses])]; // Об'єднуємо з вже знайденими
      }
    }
    
    // Якщо все ще немає класів, повторно перевіряємо по назві (можливо, була помилка в попередній перевірці)
    if (classes.length === 0 && setData.name) {
      const nameClasses = getClassesByName(setData.name);
      if (nameClasses.length > 0) {
        classes = nameClasses;
      }
    }

    // Спроба 3: Перевіряємо всі предмети в сеті для визначення класів
    if (classes.length === 0 && setData.items && setData.items.length > 0) {
      for (const setItem of setData.items.slice(0, 3)) { // Перевіряємо перші 3 предмети
        if (setItem.item && setItem.item.id) {
          try {
            const itemResp = await axios.get(
              `https://eu.api.blizzard.com/data/wow/item/${setItem.item.id}`,
              {
                params: { namespace: 'static-eu', locale: 'en_US' },
                headers: { 'Authorization': `Bearer ${token}` }
              }
            );
            
            const item = itemResp.data;
            if (item.requirements?.allowable_classes) {
              item.requirements.allowable_classes.forEach(classInfo => {
                const mappedClass = CLASS_NAME_MAP[classInfo.name];
                if (mappedClass && !classes.includes(mappedClass)) {
                  classes.push(mappedClass);
                }
              });
              if (classes.length > 0) break; // Якщо знайшли класи, зупиняємось
            }
          } catch (err) {
            // Ігноруємо помилки, продовжуємо
          }
        }
      }
    }

    // Якщо жодна спроба не спрацювала, спробуємо визначити по назві (останній fallback)
    if (classes.length === 0 && setData.name) {
      const nameClasses = getClassesByName(setData.name);
      if (nameClasses.length > 0) {
        classes = nameClasses;
      }
    }
    
    // Якщо все ще немає класів, позначаємо як 'all' (тільки якщо дійсно не вдалося визначити)
    if (classes.length === 0) {
      classes = ['all'];
    }

    // Якщо не знайшли іконку, спробуємо знайти краще зображення серед інших предметів сету
    if (!imageUrl && setData.items && setData.items.length > 1) {
      // Шукаємо серед інших предметів (не першого)
      for (const setItem of setData.items.slice(1, 5)) {
        if (setItem.item && setItem.item.id) {
          try {
            const altMediaResp = await axios.get(
              `https://eu.api.blizzard.com/data/wow/media/item/${setItem.item.id}`,
              {
                params: { namespace: 'static-eu', locale: 'en_US' },
                headers: { 'Authorization': `Bearer ${token}` }
              }
            );
            
            const iconAsset = altMediaResp.data.assets?.find(a => a.key === 'icon');
            if (iconAsset?.value && !iconAsset.value.includes('questionmark')) {
              imageUrl = iconAsset.value;
              iconName = iconAsset.value.match(/\/([^\/]+)\.jpg/)?.[1];
              break;
            }
          } catch (err) {
            // Продовжуємо пошук
          }
        }
      }
    }

    // Якщо все ще немає зображення, спробуємо отримати з Wowhead
    let wowheadImage = null;
    if (!imageUrl || imageUrl.includes('questionmark')) {
      try {
        wowheadImage = await getWowheadSetImage(setId);
        if (wowheadImage) {
          imageUrl = wowheadImage;
          console.log(`✓ Отримано зображення сету ${setId} з Wowhead`);
        }
      } catch (wowheadError) {
        // Ігноруємо помилки Wowhead парсингу
        console.log(`⚠️ Не вдалося отримати зображення з Wowhead для сету ${setId}`);
      }
    }

    // Fallback для зображення якщо не вдалося отримати через API
    if (!imageUrl) {
      if (iconName) {
        // WoWHead fallback - використовуємо велике зображення для картки
        imageUrl = `https://wow.zamimg.com/images/wow/icons/large/${iconName}.jpg`;
      } else {
        // Placeholder
        imageUrl = `https://render-eu.worldofwarcraft.com/icons/56/inv_misc_questionmark.jpg`;
      }
    }

    // Використовуємо велике зображення предмета для картки
    // Конвертуємо маленьку іконку (56x56) в більше зображення (512x512 або 256x256)
    let previewImageUrl = imageUrl;
    let largeImageUrl = imageUrl;
    
    if (imageUrl && iconName && !imageUrl.includes('questionmark')) {
      // Render.worldofwarcraft.com підтримує різні розміри: 56, 256, 512
      // Конвертуємо з 56x56 на 512x512 для кращої якості на картках
      largeImageUrl = imageUrl.replace(/\/icons\/\d+\//, '/icons/512/');
      previewImageUrl = imageUrl.replace(/\/icons\/\d+\//, '/icons/256/');
      
      // Альтернативно, якщо не спрацювало, спробуємо через iconName
      if (largeImageUrl === imageUrl && iconName) {
        // Формуємо URL до великого зображення напряму
        const domain = imageUrl.match(/^https?:\/\/([^\/]+)/)?.[1];
        if (domain) {
          largeImageUrl = `https://${domain}/icons/512/${iconName}.jpg`;
          previewImageUrl = `https://${domain}/icons/256/${iconName}.jpg`;
        }
      }
    }

    return {
      id: setId,
      name: setData.name || `Item Set ${setId}`,
      classes: classes,
      imageUrl: largeImageUrl || previewImageUrl, // Велике зображення для картки (512x512)
      previewImageUrl: previewImageUrl, // Велика іконка предмета як fallback (256x256)
      iconUrl: imageUrl, // Маленька іконка для деталей (56x56)
      iconName: iconName, // Зберігаємо для fallback
      wowheadUrl: `https://www.wowhead.com/item-set=${setId}`, // Посилання на Wowhead
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
  getItemSetDetails,
  getClassesByName // Експортуємо для тестування та використання в скриптах
};
