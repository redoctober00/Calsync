import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/googleAuth.js';
import calendarRoutes from './routes/calendarService.js';
import supabaseEventsRoutes from './routes/supabaseEvents.js';

const app = express();
const PORT = process.env.PORT || 5000;

// ── Security Middleware ───────────────────────────────────────────────────────
app.use(helmet()); // Basic security headers

// Rate limiting (DDoS prevention)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // max 100 requests per IP
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// ── Standard Middleware ───────────────────────────────────────────────────────
app.use(
  cors({
    origin: 'http://localhost:5173',
    credentials: true,
  })
);

app.use(express.json());

app.use(
  session({
    secret: process.env.SESSION_SECRET, // Required: will throw error if undefined in strict production setups
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', 
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/', authRoutes);
app.use('/api', calendarRoutes);
app.use('/api', supabaseEventsRoutes);

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'OK' }));

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
