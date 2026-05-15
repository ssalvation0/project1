require('dotenv').config();
const express = require('express');
const cors = require('cors');
const transmogsRouter = require('./routes/transmogs');

const app = express();

// PaaS providers (Fly.io, Render, etc.) inject the port they want us to
// listen on via the PORT env var. Fallback to 5001 for local dev.
const PORT = parseInt(process.env.PORT, 10) || 5001;

// CORS — explicit allowlist. FRONTEND_URL is the production Vercel domain
// (set as a secret on Fly.io). Local dev origins stay unconditionally
// allowed so `npm run dev` keeps working without env tweaks.
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow same-origin / curl / health checks (no Origin header) and any
    // origin in the explicit list above.
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
}));

app.use(express.json());

// Routes
app.use('/api/transmogs', transmogsRouter);

// Health endpoint used by Fly.io / Render uptime checks.
app.get('/', (_req, res) => {
  res.json({ status: 'ok', service: 'TransmogVault API' });
});

// Bind to 0.0.0.0 so the process is reachable from outside the container.
// Binding to 'localhost' only listens on the loopback interface and the
// PaaS health check will fail (container marked unhealthy → restart loop).
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✓ Server running on port ${PORT}`);
  console.log(`✓ API available at http://0.0.0.0:${PORT}/api/transmogs`);
});
