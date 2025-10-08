require('dotenv').config();
const express = require('express');
const cors = require('cors');
const NodeCache = require('node-cache');
const blizzardApi = require('./services/blizzardApi');

const app = express();
const PORT = process.env.PORT || 5000;

// Кеш на 1 годину
const cache = new NodeCache({ stdTTL: 3600 });

// Middleware
app.use(cors());
app.use(express.json());

// Логування запитів
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ==================== ROUTES ====================

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Test Blizzard connection
app.get('/api/test-connection', async (req, res) => {
  try {
    const connected = await blizzardApi.testConnection();
    res.json({ 
      connected, 
      message: connected ? 'Successfully connected to Battle.net API' : 'Failed to connect'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get transmog sets
app.get('/api/transmogs', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 0;
    const pageSize = parseInt(req.query.pageSize) || 20;
    const classFilter = req.query.class || 'all';
    const search = req.query.search || '';

    const cacheKey = `transmogs_${page}_${pageSize}_${classFilter}_${search}`;
    
    const cached = cache.get(cacheKey);
    if (cached) {
      console.log('📦 Returning cached data');
      return res.json(cached);
    }

    console.log('🔄 Fetching from Blizzard Item Sets API...');
    
    const index = await blizzardApi.getItemSetsIndex();
    let sets = index.item_sets || [];

    console.log(`✅ Found ${sets.length} item sets total`);

    // Фільтрація по пошуку
    if (search) {
      sets = sets.filter(s => 
        s.name.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Пагінація
    const start = page * pageSize;
    const end = start + pageSize;
    const paginatedSets = sets.slice(start, end);

    console.log(`📄 Processing ${paginatedSets.length} sets...`);

    // Отримуємо деталі
    const detailedSets = [];
    
    for (const set of paginatedSets) {
      try {
        const setId = set.id;
        
        if (!setId) {
          continue;
        }

        console.log(`  Fetching set ${setId}: ${set.name}...`);
        const details = await blizzardApi.getItemSet(setId);
        
        // Витягуємо items правильно
        const items = details.items || [];
        
        detailedSets.push({
          id: setId,
          name: details.name || set.name,
          appearance_set: {
            class_restrictions: [],
            items: items.map(item => ({
              id: item.id || 0,  // id безпосередньо в об'єкті
              name: item.name || 'Unknown'  // name теж безпосередньо
            }))
          }
        });
        
        console.log(`  ✅ Set ${setId} loaded (${items.length} items)`);
        
      } catch (error) {
        console.error(`  ❌ Error with set ${set.id}: ${error.message}`);
      }
    }

    console.log(`✅ Successfully loaded ${detailedSets.length}/${paginatedSets.length} sets`);

    const result = {
      sets: detailedSets,
      total: sets.length,
      page,
      pageSize,
      totalPages: Math.ceil(sets.length / pageSize)
    };

    cache.set(cacheKey, result);
    res.json(result);
    
  } catch (error) {
    console.error('❌ Main error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch transmogs', 
      details: error.message 
    });
  }
});

// Get single transmog set
app.get('/api/transmogs/:id', async (req, res) => {
  try {
    const setId = parseInt(req.params.id);
    
    const cacheKey = `transmog_${setId}`;
    const cached = cache.get(cacheKey);
    
    if (cached) {
      console.log('📦 Returning cached transmog');
      return res.json(cached);
    }

    const set = await blizzardApi.getTransmogSet(setId);
    cache.set(cacheKey, set);
    
    res.json(set);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch transmog set', details: error.message });
  }
});

// Get item
app.get('/api/items/:id', async (req, res) => {
  try {
    const itemId = parseInt(req.params.id);
    const item = await blizzardApi.getItem(itemId);
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch item', details: error.message });
  }
});

// Get item media (icon)
app.get('/api/items/:id/media', async (req, res) => {
  try {
    const itemId = parseInt(req.params.id);
    const media = await blizzardApi.getItemMedia(itemId);
    res.json(media);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch item media', details: error.message });
  }
});

// Clear cache (для дебагу)
app.post('/api/cache/clear', (req, res) => {
  cache.flushAll();
  console.log('🗑️ Cache cleared');
  res.json({ message: 'Cache cleared successfully' });
});

// Детальний тест API
app.get('/api/debug-blizzard', async (req, res) => {
  try {
    const tests = {
      token: 'checking...',
      endpoints: {}
    };

    // Тест токена
    const tokenOk = await blizzardApi.testConnection();
    tests.token = tokenOk ? 'OK' : 'FAILED';

    // Тест Item
    try {
      const item = await blizzardApi.getItem(19019);
      tests.endpoints.item = 'OK';
      tests.itemExample = item.name;
    } catch (e) {
      tests.endpoints.item = `FAILED: ${e.message}`;
    }

    // Тест Item Set Index (Tier sets)
    try {
      const itemSets = await blizzardApi.getItemSetsIndex();
      tests.endpoints.itemSetsIndex = 'OK';
      tests.itemSetsCount = itemSets.item_sets?.length || 0;
    } catch (e) {
      tests.endpoints.itemSetsIndex = `FAILED: ${e.message}`;
    }

    // Тест конкретного Item Set
    try {
      const itemSet = await blizzardApi.getItemSet(1060); // Dreadnaught's Battlegear
      tests.endpoints.itemSet = 'OK';
      tests.itemSetExample = itemSet.name;
      tests.itemSetItems = itemSet.items?.length;
    } catch (e) {
      tests.endpoints.itemSet = `FAILED: ${e.message}`;
    }

    // Тест Item Appearance Set Index
    try {
      const appearanceSets = await blizzardApi.getItemAppearanceSetsIndex();
      tests.endpoints.appearanceSetsIndex = 'OK';
      tests.appearanceSetsCount = appearanceSets.item_appearance_sets?.length || 0;
    } catch (e) {
      tests.endpoints.appearanceSetsIndex = `FAILED: ${e.message}`;
    }

    res.json(tests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error', details: err.message });
});

// ==================== START SERVER ====================

app.listen(PORT, () => {
  console.log('\n🚀 TransmogVault Backend Server Started!');
  console.log(`📡 Server running on http://localhost:${PORT}`);
  console.log('\n📋 Available endpoints:');
  console.log(`   GET  http://localhost:${PORT}/api/health`);
  console.log(`   GET  http://localhost:${PORT}/api/test-connection`);
  console.log(`   GET  http://localhost:${PORT}/api/transmogs?page=0&pageSize=20`);
  console.log(`   GET  http://localhost:${PORT}/api/transmogs/:id`);
  console.log(`   GET  http://localhost:${PORT}/api/items/:id`);
  console.log(`   GET  http://localhost:${PORT}/api/items/:id/media`);
  console.log(`   POST http://localhost:${PORT}/api/cache/clear`);
  console.log('\n💡 Press Ctrl+C to stop the server\n');
});