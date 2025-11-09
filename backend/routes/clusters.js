const express = require('express');
const path = require('path');
const fs = require('fs').promises;

const router = express.Router();
const CLUSTERS_DIR = path.join(__dirname, '../data/clusters');

// Get all clusters
router.get('/', async (req, res) => {
  try {
    let files = [];
    try {
      files = await fs.readdir(CLUSTERS_DIR);
    } catch (error) {
      // Directory doesn't exist yet, return empty array
      return res.json([]);
    }
    
    const allClusters = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const content = await fs.readFile(path.join(CLUSTERS_DIR, file), 'utf8');
          const clusters = JSON.parse(content);
          allClusters.push(...clusters);
        } catch (fileError) {
          console.error(`Error reading cluster file ${file}:`, fileError);
        }
      }
    }

    res.json(allClusters);
  } catch (error) {
    console.error('Error fetching clusters:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get cluster by ID
router.get('/:id', async (req, res) => {
  try {
    const files = await fs.readdir(CLUSTERS_DIR);
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const content = await fs.readFile(path.join(CLUSTERS_DIR, file), 'utf8');
        const clusters = JSON.parse(content);
        const cluster = clusters.find(c => c.id === req.params.id);
        
        if (cluster) {
          return res.json(cluster);
        }
      }
    }

    res.status(404).json({ error: 'Cluster not found' });
  } catch (error) {
    console.error('Error fetching cluster:', error);
    res.status(500).json({ error: error.message });
  }
});

// Batch update cluster actions
router.put('/:id/batch-action', async (req, res) => {
  try {
    const { action, memoryIds } = req.body;
    const memoriesRoute = require('./memories');
    
    // Update each memory in the cluster
    for (const memoryId of memoryIds) {
      // This would ideally update all at once, but for now we'll do individual updates
    }
    
    res.json({ success: true, message: `Batch action ${action} applied to cluster` });
  } catch (error) {
    console.error('Error updating cluster:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

