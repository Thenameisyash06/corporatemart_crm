require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const dealRoutes = require('./routes/deals');
const documentRoutes = require('./routes/documents');
const dashboardRoutes = require('./routes/dashboard');
const userRoutes = require('./routes/users');
const leadRoutes = require('./routes/leads');

const app = express();
const PORT = process.env.PORT || 4000;

// Enable CORS for desktop clients and Vite dev server
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health Check
app.get('/api/health', async (req, res) => {
  let dbStatus = 'disconnected';
  let dbError = null;
  try {
    const prisma = require('./lib/prisma');
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'connected';
  } catch (err) {
    dbStatus = 'error';
    dbError = err.message;
  }

  res.json({
    status: dbStatus === 'connected' ? 'ok' : 'degraded',
    database: dbStatus,
    dbError: dbError,
    timestamp: new Date().toISOString(),
    service: 'CorporateMart CRM Backend API',
    hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/deals', dealRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/users', userRoutes);
app.use('/api/leads', leadRoutes);

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ error: err.message || 'An unexpected internal error occurred.' });
});

if (require.main === module) {
  const server = app.listen(PORT, () => {
    console.log(`CorporateMart CRM API Server running on http://localhost:${PORT}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`[ERROR] Port ${PORT} is already in use by another process. Please free port ${PORT} or configure a different PORT.`);
    } else {
      console.error('[ERROR] Server failed to start:', err);
    }
    process.exit(1);
  });
}

module.exports = app;
