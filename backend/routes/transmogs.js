const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

// Шлях до файлу з обробленими даними Kaggle
const TRANSMOGS_DATA_FILE = path.join(__dirname, '../data/transmog_sets.json');
const IMAGES_PATH = '/images/items'; // Шлях до статичних зображень

// Функція для завантаження трансмогів з файлу
async function loadTransmogsFromFile() {
  try {
    const data = await fs.readFile(TRANSMOGS_DATA_FILE, 'utf-8');
    const sets = JSON.parse(data);
    
    console.log(`✅ Завантажено ${sets.length} трансмог-сетів з Kaggle датасету`);
    return sets;
  } catch (error) {
    console.warn('⚠️ Файл transmog_sets.json не знайдено!');
    console.warn('💡 Запусти: node scripts/processKaggleData.js');
    
    // Fallback до порожнього масиву
    return [];
  }
}


router.get('/', async (req, res) => {
  try {
    // Приймаємо page / limit / pageSize (аліас) і нормалізуємо
    let { page = 0, limit, pageSize, class: classFilter } = req.query;

    const pageNum = Math.max(0, parseInt(page, 10) || 0);
    const sizeNum = Math.max(1, parseInt(limit || pageSize || 20, 10));
    const offset = pageNum * sizeNum;

    // Завантажуємо трансмоги з Kaggle датасету
    let transmogsData = await loadTransmogsFromFile();

    // Фільтрація за класом
    if (classFilter && classFilter !== 'all') {
      transmogsData = transmogsData.filter(set => {
        const setClasses = set.classes || [];
        const filterClass = classFilter.toLowerCase();
        
        // Універсальні сети (All) показуємо для всіх фільтрів
        if (setClasses.includes('All')) {
          return true;
        }
        
        // Перевіряємо чи є потрібний клас у списку
        return setClasses.some(cls => 
          cls.toLowerCase().replace(/\s+/g, '') === filterClass ||
          cls.toLowerCase().includes(filterClass)
        );
      });
    }

    // Пагінація
    const totalItems = transmogsData.length;
    const paginatedData = transmogsData.slice(offset, offset + sizeNum);
    
    const result = {
      transmogs: await Promise.all(paginatedData.map(async set => {
        // Використовуємо перший предмет для превʼю зображення
        const previewItem = set.items && set.items[0];
        let previewImageUrl = null;
        
        if (previewItem) {
          // Шукаємо файл зображення (може бути .jpg, .svg, або .json)
          const imageBasePath = path.join(__dirname, '../public/images/items');
          const safeName = previewItem.name.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
          
          const possibleExtensions = ['.jpg', '.svg', '.json'];
          for (const ext of possibleExtensions) {
            const fileName = `${previewItem.id}_${safeName}${ext}`;
            try {
              await fs.access(path.join(imageBasePath, fileName));
              previewImageUrl = `${IMAGES_PATH}/${fileName}`;
              break;
            } catch {
              // Файл не існує, пробуємо наступний
            }
          }
        }
        
        return {
          id: set.id,
          name: set.name,
          iconUrl: previewImageUrl,
          imageUrl: previewImageUrl,
          items: set.items.map(item => {
            const safeName = item.name.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
            return {
              ...item,
              iconUrl: `${IMAGES_PATH}/${item.id}_${safeName}.jpg` // Спробуємо знайти
            };
          }),
          class: set.classes && set.classes.length > 0 ? set.classes.join(', ') : 'All',
          classes: set.classes || ['All'],
          expansion: set.expansion || 'Unknown',
          quality: set.quality || 'Common',
          itemCount: set.itemCount || 0,
          minLevel: set.minLevel || 0,
          maxLevel: set.maxLevel || 0,
        };
      })),
      pagination: {
        currentPage: pageNum,
        totalItems,
        itemsPerPage: sizeNum,
        totalPages: Math.ceil(totalItems / sizeNum)
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
    
    // Завантажуємо трансмоги
    const transmogsData = await loadTransmogsFromFile();
    const transmog = transmogsData.find(set => set.id === id);
    
    if (!transmog) {
      return res.status(404).json({ 
        error: 'Transmog not found',
        message: `No transmog set found with ID ${id}`
      });
    }
    
    // Розширюємо дані для детальної сторінки
    let iconUrl = null;
    if (transmog.items && transmog.items[0]) {
      const previewItem = transmog.items[0];
      const imageBasePath = path.join(__dirname, '../public/images/items');
      const safeName = previewItem.name.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
      
      const possibleExtensions = ['.jpg', '.svg', '.json'];
      for (const ext of possibleExtensions) {
        const fileName = `${previewItem.id}_${safeName}${ext}`;
        try {
          await fs.access(path.join(imageBasePath, fileName));
          iconUrl = `${IMAGES_PATH}/${fileName}`;
          break;
        } catch {
          // Файл не існує
        }
      }
    }
    
    const detailedTransmog = {
      id: transmog.id,
      name: transmog.name,
      iconUrl: iconUrl,
      imageUrl: iconUrl,
      class: transmog.classes && transmog.classes.length > 0 
        ? transmog.classes.join(', ') 
        : 'All',
      classes: transmog.classes || ['All'],
      expansion: transmog.expansion || 'Unknown',
      quality: transmog.quality || 'Common',
      description: `${transmog.quality || 'Epic'} transmog set. This set contains ${transmog.itemCount || 0} pieces and is suitable for ${transmog.classes ? transmog.classes.join(', ') : 'all classes'}.`,
      items: (transmog.items || []).map(item => {
        const safeName = item.name.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
        return {
          ...item,
          iconUrl: `${IMAGES_PATH}/${item.id}_${safeName}.jpg`
        };
      }),
      stats: {
        itemCount: transmog.itemCount || 0,
        minLevel: transmog.minLevel || 0,
        maxLevel: transmog.maxLevel || 0,
        quality: transmog.quality || 'Common'
      },
      source: {
        type: 'Kaggle Dataset',
        dataset: 'World of Warcraft Items',
        url: 'https://www.kaggle.com/datasets/trolukovich/world-of-warcraft-items-dataset/'
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