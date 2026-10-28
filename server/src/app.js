const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const mongoose = require('mongoose');
const env = require('./config/env');
const passport = require('./config/passport');
const errorHandler = require('./middleware/errorHandler');
const { verifyAuthToken } = require('./utils/token');
const { findUserById } = require('./services/dataStorage');

// Route imports
const authRoutes = require('./routes/authRoutes');
const datasetRoutes = require('./routes/datasetRoutes');
const analysisRoutes = require('./routes/analysisRoutes');
const reportRoutes = require('./routes/reportRoutes');

const app = express();

// Trust reverse proxy (Essential for Render / Vercel HTTPS cookies)
app.set('trust proxy', 1);

// Security Headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// Dynamic CORS configuration (accepts localhost:5173, localhost:5174, or configured CLIENT_URL)
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or same-origin)
      if (!origin) return callback(null, true);
      const allowedOrigins = [
        env.CLIENT_URL,
        'http://localhost:5173',
        'http://localhost:5174',
        'http://127.0.0.1:5173',
      ].filter(Boolean);
      if (
        allowedOrigins.includes(origin) ||
        origin.startsWith('http://localhost:') ||
        origin.startsWith('http://127.0.0.1:') ||
        origin.endsWith('.vercel.app')
      ) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// Request parsing
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Express Session Configuration
const sessionOptions = {
  secret: env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  proxy: true,
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
  },
};

// Use MongoStore whenever MongoDB URI is configured
if (env.MONGODB_URI) {
  try {
    const store = MongoStore.create({
      mongoUrl: env.MONGODB_URI,
      collectionName: 'sessions',
      ttl: 7 * 24 * 60 * 60,
    });
    store.on('error', (err) => console.warn('[Session Warning]', err.message));
    sessionOptions.store = store;
  } catch (storeErr) {
    console.warn('[Session Warning] Using memory store:', storeErr.message);
  }
}

app.use(session(sessionOptions));

// Initialize Passport & Session
app.use(passport.initialize());
app.use(passport.session());

// Bearer Token Cross-Domain Fallback Middleware
app.use(async (req, res, next) => {
  if (!req.user && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    const token = req.headers.authorization.split(' ')[1];
    const userId = verifyAuthToken(token);
    if (userId) {
      try {
        const user = await findUserById(userId);
        if (user) {
          req.user = user;
        }
      } catch (err) {
        // ignore
      }
    }
  }
  next();
});

// Health Check API
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    app: 'InsightAI API',
    time: new Date().toISOString(),
    databaseMode: mongoose.connection.readyState === 1 ? 'MongoDB' : 'In-Memory',
    aiConfigured: Boolean(env.AI_API_KEY && !env.AI_API_KEY.includes('your_ai_api_key')),
    googleOAuthConfigured: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/datasets', datasetRoutes);
app.use('/api/datasets', analysisRoutes);
app.use('/api/datasets', reportRoutes);

// 404 Route Handler
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint '${req.originalUrl}' not found.`,
  });
});

// Centralized Error Handler
app.use(errorHandler);

module.exports = app;
