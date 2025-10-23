require('dotenv').config();
const express = require('express');
const cors = require('cors');
const transmogsRouter = require('./routes/transmogs');

const app = express();
const PORT = process.env.PORT || 5001;

// CORS - дозволити всі origins для тестування
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

app.use(express.json());

// Routes
app.use('/api/transmogs', transmogsRouter);

app.get('/', (req, res) => {
  res.json({ message: 'WoW Transmog API Server' });
});

app.listen(PORT, () => {
  console.log(`✓ Server running on port ${PORT}`);
  console.log(`✓ API available at http://localhost:${PORT}/api/transmogs`);
  console.log(`✓ CORS enabled for all origins`);
});