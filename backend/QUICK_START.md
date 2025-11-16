# ✅ Quick Start Checklist

## Для запуску нової системи:

### 1. ☐ Завантаж датасет з Kaggle
- [ ] Перейди на https://www.kaggle.com/datasets/trolukovich/world-of-warcraft-items-dataset/
- [ ] Натисни "Download" (потрібен акаунт)
- [ ] Розархівуй `wowItems.csv`
- [ ] Помісти у: `backend/data/kaggle/wowItems.csv`

### 2. ☐ Встанови залежності
```bash
cd backend
npm install
```

### 3. ☐ Оброби датасет
```bash
npm run setup:kaggle
```
Це створить `backend/data/transmog_sets.json` (~5MB, 500+ сетів)

### 4. ☐ Завантаж зображення
```bash
npm run setup:images
```
Це завантажить іконки у `backend/public/images/items/` (~10-30 хвилин)

### 5. ☐ Запусти сервер
```bash
npm start
# або для dev mode:
npm run dev
```

### 6. ☐ Перевір API
Відкрий у браузері або Postman:
- http://localhost:5001/api/transmogs
- http://localhost:5001/api/transmogs?class=warrior
- http://localhost:5001/api/transmogs/set-1

## Перевірка успіху:

- [ ] Сервер стартує без помилок
- [ ] API повертає дані (не порожній масив)
- [ ] Фільтрація по класах працює
- [ ] Зображення завантажуються

## Якщо щось не працює:

1. **Порожній API response**
   - Перевір чи існує `backend/data/transmog_sets.json`
   - Запусти `npm run setup:kaggle`

2. **Відсутні зображення**
   - Нормально, якщо ще не запустив `npm run setup:images`
   - Це опціонально для тестування API

3. **Помилка CSV**
   - Переконайся що файл у правильному місці: `backend/data/kaggle/wowItems.csv`

## Що далі?

- [ ] Протестувати фільтрацію по класах
- [ ] Перевірити пагінацію
- [ ] Подивитися деталі конкретного сету
- [ ] Інтегрувати з фронтендом

---

Повна документація: [KAGGLE_SETUP.md](./KAGGLE_SETUP.md)
