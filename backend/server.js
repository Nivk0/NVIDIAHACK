

const path = require('path');
const fs = require('fs');
const fsPromises = require('fs').promises;
const backendEnvPath = path.join(__dirname, '.env');
const rootEnvPath = path.join(__dirname, '..', '.env');

if (fs.existsSync(backendEnvPath)) {
  require('dotenv').config({ path: backendEnvPath });
} else if (fs.existsSync(rootEnvPath)) {
  require('dotenv').config({ path: rootEnvPath });
} else {
  require('dotenv').config();
}

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const uploadRoutes = require('./routes/upload');
const memoryRoutes = require('./routes/memories');
const clusterRoutes = require('./routes/clusters');
const profileRoutes = require('./routes/profile');
const searchRoutes = require('./routes/search');
const { ensureNemotronAnalysis } = require('./services/nemotron-initializer');

const app = express();
const PORT = process.env.PORT || 5001;


app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://nvidiaai.netlify.app',
    process.env.FRONTEND_URL
  ].filter(Boolean)
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


const DATA_DIR = path.join(__dirname, 'data');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const MEMORIES_DIR = path.join(DATA_DIR, 'memories');
const CLUSTERS_DIR = path.join(DATA_DIR, 'clusters');

async function ensureDirectories() {
  await fsPromises.mkdir(DATA_DIR, { recursive: true });
  await fsPromises.mkdir(UPLOADS_DIR, { recursive: true });
  await fsPromises.mkdir(MEMORIES_DIR, { recursive: true });
  await fsPromises.mkdir(CLUSTERS_DIR, { recursive: true });
}


app.use('/uploads', express.static(UPLOADS_DIR));
app.use('/api/upload', uploadRoutes);
app.use('/api/memories', memoryRoutes);
app.use('/api/clusters', clusterRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/search', searchRoutes);


app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});


ensureDirectories()
  .then(async () => {
    try {
      await ensureNemotronAnalysis();
    } catch (error) {
      console.error('[Server] Nemotron initialization failed:', error.message);
    }
  })
  .finally(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  });

module.exports = app;

