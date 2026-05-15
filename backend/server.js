require('dotenv').config();

// Initialize Sentry FIRST — before any other require — so its auto-instrumentation
// can wrap Express/HTTP modules properly. No-op when SENTRY_DSN is not set.
const Sentry = require('@sentry/node');
if (process.env.SENTRY_DSN) {
  // JWTs and Supabase key formats — same redaction set as the frontend.
  const JWT_REGEX = /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g;
  const SUPABASE_KEY_REGEX = /sb_[a-z]+_[A-Za-z0-9_-]{20,}/g;
  const redact = (s) => typeof s === 'string'
    ? s.replace(JWT_REGEX, '<redacted-jwt>').replace(SUPABASE_KEY_REGEX, '<redacted-key>')
    : s;

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.SENTRY_ENVIRONMENT || 'production',
    tracesSampleRate: 0.1,
    // Belt-and-suspenders: never attach request headers / user IPs.
    sendDefaultPii: false,
    // Scrub stray secrets that might land in error messages or breadcrumbs.
    beforeSend(event) {
      try {
        return JSON.parse(redact(JSON.stringify(event)));
      } catch {
        return event;
      }
    },
    beforeBreadcrumb(crumb) {
      if (crumb?.message) crumb.message = redact(crumb.message);
      return crumb;
    },
  });
}

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
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

// Rate limit /api/* to protect against scraping. The limits are generous on
// purpose — real users hitting catalog + detail pages browse 30–60 endpoints
// per minute, so we allow much more. Behind Vercel's rewrite + Fly.io the
// client IP is in X-Forwarded-For; enable `trust proxy` so express-rate-limit
// keys on the real client rather than the proxy address.
app.set('trust proxy', 1);

app.use('/api/', rateLimit({
  windowMs: 60 * 1000,      // 1-minute rolling window
  max: 300,                  // 300 requests/minute per IP
  standardHeaders: true,     // sends RateLimit-* response headers
  legacyHeaders: false,
  message: { error: 'Too many requests, please slow down.' },
}));

// Routes
app.use('/api/transmogs', transmogsRouter);

// Health endpoint used by Fly.io / Render uptime checks.
app.get('/', (_req, res) => {
  res.json({ status: 'ok', service: 'TransmogVault API' });
});

// Sentry error handler — catches errors that bubble up from any route.
// Must be added AFTER all routes/middleware. No-op when DSN is not set.
if (process.env.SENTRY_DSN) {
  Sentry.setupExpressErrorHandler(app);
}

// Bind to 0.0.0.0 so the process is reachable from outside the container.
// Binding to 'localhost' only listens on the loopback interface and the
// PaaS health check will fail (container marked unhealthy → restart loop).
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✓ Server running on port ${PORT}`);
  console.log(`✓ API available at http://0.0.0.0:${PORT}/api/transmogs`);
});
