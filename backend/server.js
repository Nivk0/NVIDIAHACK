// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs').promises;

const uploadRoutes = require('./routes/upload');
const memoryRoutes = require('./routes/memories');
const clusterRoutes = require('./routes/clusters');
const profileRoutes = require('./routes/profile');
const searchRoutes = require('./routes/search');
const { ensureNemotronAnalysis } = require('./services/nemotron-initializer');

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Ensure data directories exist
const DATA_DIR = path.join(__dirname, 'data');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const MEMORIES_DIR = path.join(DATA_DIR, 'memories');
const CLUSTERS_DIR = path.join(DATA_DIR, 'clusters');

async function ensureDirectories() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
  await fs.mkdir(MEMORIES_DIR, { recursive: true });
  await fs.mkdir(CLUSTERS_DIR, { recursive: true });
}

// Routes
app.use('/uploads', express.static(UPLOADS_DIR));
app.use('/api/upload', uploadRoutes);
app.use('/api/memories', memoryRoutes);
app.use('/api/clusters', clusterRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/search', searchRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Start server
ensureDirectories()
  .then(async () => {
    try {
      await ensureNemotronAnalysis();
    } catch (error) {
      console.error('[Server] Nemotron initialization failed:', error.message);
    }
  })
  .finally(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  });

module.exports = app;

