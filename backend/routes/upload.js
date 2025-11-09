const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const DataScanner = require('../agents/scanner');
const PredictionAgent = require('../agents/prediction');
const SentimentAgent = require('../agents/sentiment');
const CompressionAgent = require('../agents/compression');

const router = express.Router();
const upload = multer({ dest: path.join(__dirname, '../uploads/') });

// Store processing jobs
const processingJobs = new Map();

// Upload endpoint
router.post('/', upload.array('files', 100), async (req, res) => {
  try {
    const jobId = uuidv4();
    const files = req.files || [];
    let textData = [];
    let clientFileMetadata = {};
    
    try {
      textData = req.body.textData ? JSON.parse(req.body.textData) : [];
    } catch (parseError) {
      console.error('Error parsing textData:', parseError);
      textData = [];
    }

    try {
      const metadataPayload = req.body.fileMetadata ? JSON.parse(req.body.fileMetadata) : [];
      if (Array.isArray(metadataPayload)) {
        metadataPayload.forEach(meta => {
          if (meta?.originalname) {
            clientFileMetadata[meta.originalname] = meta;
          }
        });
      }
    } catch (metaError) {
      console.error('Error parsing fileMetadata:', metaError);
    }
    
    // Validate that we have at least some data
    if (files.length === 0 && textData.length === 0) {
      return res.status(400).json({ error: 'No files or text data provided' });
    }

    // Initialize job
    processingJobs.set(jobId, {
      status: 'processing',
      progress: 0,
      stage: 'scanning',
      memories: [],
      clusters: []
    });

    // Process in background
    processData(jobId, files, textData, clientFileMetadata);

    res.json({ jobId, status: 'processing' });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get processing status
router.get('/status/:jobId', (req, res) => {
  const job = processingJobs.get(req.params.jobId);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  res.json(job);
});

async function processData(jobId, files, textData, clientFileMetadata = {}) {
  const job = processingJobs.get(jobId);
  const scanner = new DataScanner();
  const predictor = new PredictionAgent();
  const sentiment = new SentimentAgent();
  const compressor = new CompressionAgent();

  try {
    // Stage 1: Scanning (25%)
    job.stage = 'scanning';
    job.progress = 10;
    const scannedData = await scanner.scan(files, textData, clientFileMetadata);
    job.progress = 25;

    // Stage 2: Prediction (50%)
    job.stage = 'predicting';
    job.progress = 30;
    const predictions = await predictor.predict(scannedData);
    job.progress = 50;

    // Stage 3: Sentiment Analysis (75%)
    job.stage = 'analyzing';
    job.progress = 55;
    const sentiments = await sentiment.analyze(predictions);
    job.progress = 75;

    // Stage 4: Compression/Clustering (100%)
    job.stage = 'clustering';
    job.progress = 80;
    const clusters = await compressor.process(sentiments);
    job.progress = 100;
    job.stage = 'complete';

    // Save memories
    job.memories = sentiments;
    job.clusters = clusters;

    // Save to files
    await saveMemories(jobId, sentiments);
    await saveClusters(jobId, clusters);

    job.status = 'completed';
  } catch (error) {
    console.error('Processing error:', error);
    job.status = 'failed';
    job.error = error.message;
  }
}

async function saveMemories(jobId, memories) {
  const memoriesPath = path.join(__dirname, '../data/memories', `${jobId}.json`);
  await fs.writeFile(memoriesPath, JSON.stringify(memories, null, 2));
}

async function saveClusters(jobId, clusters) {
  const clustersPath = path.join(__dirname, '../data/clusters', `${jobId}.json`);
  await fs.writeFile(clustersPath, JSON.stringify(clusters, null, 2));
}

module.exports = router;

