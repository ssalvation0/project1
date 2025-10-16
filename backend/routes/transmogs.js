const express = require('express');
const router = express.Router();
const { getAllItemSets, getItemSetDetails } = require('../utils/blizzardAPI');

let cachedTransmogs = null;
let cacheExpiry = null;

async function getAllTransmogs() {
  if (cachedTransmogs && cacheExpiry && Date.now() < cacheExpiry) {
    console.log('Returning cached transmogs...');
    return cachedTransmogs;
  }

  console.log('Fetching all item sets from Blizzard API...');
  
  const allSets = await getAllItemSets();
  console.log(`Found ${allSets.length} item sets in index`);

  const transmogs = [];
  let processedCount = 0;

  // Обробляємо сети порціями
  const batchSize = 10;
  for (let i = 0; i < allSets.length; i += batchSize) {
    const batch = allSets.slice(i, i + batchSize);
    
    const batchPromises = batch.map(async (set) => {
      const setDetails = await getItemSetDetails(set.id);
      if (setDetails) {
        processedCount++;
        if (processedCount % 50 === 0) {
          console.log(`Processed ${processedCount}/${allSets.length} sets...`);
        }
        return setDetails;
      }
      return null;
    });

    const batchResults = await Promise.all(batchPromises);
    transmogs.push(...batchResults.filter(t => t !== null));

    // Затримка між батчами
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log(`✓ Successfully loaded ${transmogs.length} transmogs`);

  // СОРТУВАННЯ ПО КЛАСАХ
  const classOrder = [
    'warrior', 
    'paladin', 
    'hunter', 
    'rogue', 
    'priest', 
    'deathknight', 
    'shaman', 
    'mage', 
    'warlock', 
    'monk', 
    'druid', 
    'demonhunter', 
    'evoker', 
    'all'
  ];
  
  transmogs.sort((a, b) => {
    // Беремо перший клас з масиву класів
    const aClass = a.classes[0] || 'all';
    const bClass = b.classes[0] || 'all';
    
    // Знаходимо індекс в порядку класів
    const aIndex = classOrder.indexOf(aClass);
    const bIndex = classOrder.indexOf(bClass);
    
    // Якщо класи різні, сортуємо по індексу класу
    if (aIndex !== bIndex) {
      return aIndex - bIndex;
    }
    
    // Якщо класи однакові, сортуємо по ID (старіші сети першими)
    return a.id - b.id;
  });

  console.log('✓ Transmogs sorted by class');

  // Кешуємо на 1 годину
  cachedTransmogs = transmogs;
  cacheExpiry = Date.now() + (60 * 60 * 1000);

  // Статистика по класах
  const classCounts = {};
  transmogs.forEach(t => {
    t.classes.forEach(c => {
      classCounts[c] = (classCounts[c] || 0) + 1;
    });
  });
  console.log('Transmogs per class:', classCounts);

  // Показуємо перші 5 сетів для перевірки сортування
  console.log('\nFirst 5 transmogs:');
  transmogs.slice(0, 5).forEach(t => {
    console.log(`  - ${t.name} (${t.classes.join(', ')}) [ID: ${t.id}]`);
  });

  return transmogs;
}

// GET всі трансмоги
router.get('/', async (req, res) => {
  try {
    const { page = 0, limit = 20, class: classFilter } = req.query;
    
    const allTransmogs = await getAllTransmogs();

    let filteredTransmogs = allTransmogs;
    
    // Фільтрація по класу
    if (classFilter && classFilter !== 'all') {
      filteredTransmogs = allTransmogs.filter(transmog => 
        transmog.classes.includes(classFilter.toLowerCase())
      );
      console.log(`Filtered to ${filteredTransmogs.length} transmogs for class: ${classFilter}`);
    }

    const startIndex = parseInt(page) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedTransmogs = filteredTransmogs.slice(startIndex, endIndex);

    console.log(`Returning page ${page}: ${paginatedTransmogs.length} items (${startIndex}-${endIndex} of ${filteredTransmogs.length})`);

    res.json({
      transmogs: paginatedTransmogs,
      currentPage: parseInt(page),
      totalPages: Math.ceil(filteredTransmogs.length / parseInt(limit)),
      totalItems: filteredTransmogs.length
    });
  } catch (error) {
    console.error('Error fetching transmogs:', error);
    res.status(500).json({ error: 'Failed to fetch transmogs' });
  }
});

// GET конкретний трансмог
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const allTransmogs = await getAllTransmogs();
    
    const transmog = allTransmogs.find(t => t.id === parseInt(id));
    
    if (!transmog) {
      return res.status(404).json({ error: 'Transmog not found' });
    }
    
    res.json(transmog);
  } catch (error) {
    console.error('Error fetching transmog:', error);
    res.status(500).json({ error: 'Failed to fetch transmog' });
  }
});

// Очистити кеш
router.post('/clear-cache', (req, res) => {
  cachedTransmogs = null;
  cacheExpiry = null;
  console.log('✓ Cache cleared');
  res.json({ message: 'Cache cleared successfully' });
});

module.exports = router;