require('dotenv').config();
const express = require('express');
const cors = require('cors');
const transmogsRouter = require('./routes/transmogs');

const app = express();
const PORT = 5001;

// CORS
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://wickless-actively-nora.ngrok-free.dev',
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : [])
];

app.use(cors({
  origin: (origin, callback) => {
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

app.get('/', (req, res) => {
  res.json({ message: 'TransmogVault API' });
});

app.listen(PORT, 'localhost', () => {
  console.log(`✓ Server running on port ${PORT}`);
  console.log(`✓ API available at http://localhost:${PORT}/api/transmogs`);
});
