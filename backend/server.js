require('dotenv').config();
const express = require('express');
const cors = require('cors');
const transmogsRouter = require('./routes/transmogs');

const app = express();
const PORT = 5001; // Залишити 5001 як у вас

// CORS - дозволити запити з усіх джерел (для розробки)
app.use(cors({
  origin: '*', // Дозволити всі origins
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: false // Вимкнути credentials коли origin: '*'
}));

// Альтернативно, якщо потрібні credentials:
// app.use(cors({
//   origin: [
//     'http://localhost:3000', 
//     'http://localhost:5001',
//     'https://wickless-actively-nora.ngrok-free.dev'
//   ],
//   methods: ['GET', 'POST', 'PUT', 'DELETE'],
//   credentials: true
// }));

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