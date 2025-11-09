const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const DataScanner = require('../agents/scanner');
const PredictionAgent = require('../agents/prediction');
const SentimentAgent = require('../agents/sentiment');
const CompressionAgent = require('../agents/compression');

const SAMPLE_DATA_DIR = path.join(__dirname, '../../sample-data');
const MEMORIES_DIR = path.join(__dirname, '../data/memories');
const CLUSTERS_DIR = path.join(__dirname, '../data/clusters');

async function ensureDirectories() {
  await fs.mkdir(MEMORIES_DIR, { recursive: true });
  await fs.mkdir(CLUSTERS_DIR, { recursive: true });
}

async function loadSampleFiles() {
  const files = [];
  try {
    const entries = await fs.readdir(SAMPLE_DATA_DIR);

    for (const entry of entries) {
      const fullPath = path.join(SAMPLE_DATA_DIR, entry);
      const stats = await fs.stat(fullPath);


      if (stats.isDirectory()) continue;

      const ext = path.extname(entry).toLowerCase();
      const allowedExts = ['.txt', '.md', '.csv', '.eml', '.jpg.txt'];

      if (allowedExts.some(e => entry.endsWith(e))) {
        files.push({
          path: fullPath,
          originalname: entry,
          mimetype: getMimeType(entry),
          size: stats.size,
          birthtime: stats.birthtime
        });
      }
    }
  } catch (error) {
    console.error('Error reading sample data directory:', error);
  }

  return files;
}

function getMimeType(filename) {
  const ext = path.extname(filename).toLowerCase();
  const mimeTypes = {
    '.txt': 'text/plain',
    '.md': 'text/markdown',
    '.csv': 'text/csv',
    '.eml': 'message/rfc822',
    '.jpg.txt': 'text/plain'
  };
  return mimeTypes[ext] || 'text/plain';
}

async function processSampleData() {
  console.log('🌱 Seeding sample data...\n');

  await ensureDirectories();


  console.log('📂 Loading sample files...');
  const sampleFiles = await loadSampleFiles();
  console.log(`   Found ${sampleFiles.length} sample files\n`);

  if (sampleFiles.length === 0) {
    console.log('⚠️  No sample files found in sample-data directory');
    return;
  }


  const UPLOADS_DIR = path.join(__dirname, '../uploads');
  await fs.mkdir(UPLOADS_DIR, { recursive: true });

  const processedFiles = [];
  for (const file of sampleFiles) {
    const tempPath = path.join(UPLOADS_DIR, `${uuidv4()}${path.extname(file.originalname)}`);
    await fs.copyFile(file.path, tempPath);
    processedFiles.push({
      ...file,
      path: tempPath
    });
  }

  try {

    console.log('🔍 Scanning files...');
    const scanner = new DataScanner();
    const scannedData = await scanner.scan(processedFiles, []);
    console.log(`   Scanned ${scannedData.length} items\n`);


    console.log('🤖 Predicting relevance...');
    const predictor = new PredictionAgent();
    let predictions;
    try {
      predictions = await predictor.predict(scannedData);
    } catch (error) {
      console.log(`   ⚠️  Nemotron not available, using fallback predictions...`);

      predictions = scannedData.map(item => {
        const age = calculateAge(item.createdAt);

        const content = (item.content || item.summary || '').toLowerCase();
        let predictedAction = 'keep';
        let relevance1Year = 0.7;

        if (content.includes('important') || content.includes('insurance') || content.includes('policy')) {
          predictedAction = 'keep';
          relevance1Year = 0.9;
        } else if (content.includes('random') || content.includes('old photo') || content.includes('blurry')) {
          predictedAction = 'low_relevance';
          relevance1Year = 0.3;
        } else if (content.includes('meeting') || content.includes('project')) {
          predictedAction = 'keep';
          relevance1Year = 0.8;
        } else if (content.includes('expense') || content.includes('csv')) {
          predictedAction = 'compress';
          relevance1Year = 0.5;
        }

        return {
          ...item,
          age,
          relevance1Month: Math.min(relevance1Year + 0.1, 1.0),
          relevance1Year,
          predictedAction,
          nemotronAnalysis: {
            nemotronAnalyzed: false,
            predictedAction,
            relevance1Month: Math.min(relevance1Year + 0.1, 1.0),
            relevance1Year
          }
        };
      });
    }
    console.log(`   Generated predictions for ${predictions.length} items\n`);


    console.log('💭 Analyzing sentiment...');
    const sentiment = new SentimentAgent();
    const sentiments = await sentiment.analyze(predictions);
    console.log(`   Analyzed sentiment for ${sentiments.length} items\n`);


    console.log('📦 Creating clusters...');
    const compressor = new CompressionAgent();
    const clusters = await compressor.process(sentiments);
    console.log(`   Created ${clusters.length} clusters\n`);


    const jobId = 'sample-data-seed';
    const memoriesPath = path.join(MEMORIES_DIR, `${jobId}.json`);
    await fs.writeFile(memoriesPath, JSON.stringify(sentiments, null, 2));
    console.log(`✅ Saved ${sentiments.length} memories to ${memoriesPath}`);


    const clustersPath = path.join(CLUSTERS_DIR, `${jobId}.json`);
    await fs.writeFile(clustersPath, JSON.stringify(clusters, null, 2));
    console.log(`✅ Saved ${clusters.length} clusters to ${clustersPath}\n`);

    console.log('🎉 Sample data seeded successfully!');
    console.log(`   - ${sentiments.length} memories created`);
    console.log(`   - ${clusters.length} clusters created`);

  } catch (error) {
    console.error('❌ Error processing sample data:', error);
    throw error;
  } finally {

    for (const file of processedFiles) {
      try {
        await fs.unlink(file.path);
      } catch (e) {

      }
    }
  }
}

function calculateAge(createdAt) {
  if (!createdAt) return 0;
  const now = new Date();
  const created = new Date(createdAt);
  if (Number.isNaN(created.getTime())) return 0;
  const diffTime = Math.abs(now - created);
  return Math.floor(diffTime / (1000 * 60 * 60 * 24 * 30));
}


if (require.main === module) {
  processSampleData()
    .then(() => {
      console.log('\n✨ Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Failed to seed sample data:', error);
      process.exit(1);
    });
}

module.exports = { processSampleData };

