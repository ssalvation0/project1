require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const transmogsRouter = require('./routes/transmogs');
const authRouter = require('./routes/auth');

const app = express();
const PORT = 5001; // Залишити 5001 як у вас

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/transmogvault';
mongoose.connect(MONGODB_URI)
  .then(() => console.log('✓ Connected to MongoDB'))
  .catch(err => console.error('✗ MongoDB connection error:', err.message));

// CORS - дозволити конкретні origins для безпеки
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://wickless-actively-nora.ngrok-free.dev', // додано явно
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : [])
];

app.use(cors({
  origin: (origin, callback) => {
    // Дозволити requests без origin (наприклад, мобільні додатки або Postman)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

app.use(express.json());

// Routes
app.use('/api/transmogs', transmogsRouter);
app.use('/api/auth', authRouter);

app.get('/', (req, res) => {
  res.json({ message: 'WoW Transmog API Server' });
});

app.listen(PORT, 'localhost', () => {
  console.log(`✓ Server running on port ${PORT}`);
  console.log(`✓ API available at http://localhost:${PORT}/api/transmogs`);
  console.log(`✓ CORS enabled for all origins`);
});