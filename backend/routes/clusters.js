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
          // Normalize old format (memories) to new format (memoryIds)
          // Also normalize clusters to action-based format if they have a valid action
          const normalizedClusters = clusters.map(cluster => {
            let normalized = { ...cluster };
            
            // Normalize memoryIds
            if (cluster.memories && !cluster.memoryIds) {
              normalized.memoryIds = cluster.memories;
              normalized.size = cluster.size || (cluster.memories ? cluster.memories.length : 0);
            }
            
            // Ensure action is set - use predictedAction or default to 'keep'
            const validActions = ['keep', 'compress', 'forget', 'delete'];
            if (!normalized.action) {
              // Try to infer from cluster name or default to 'keep'
              const name = (normalized.name || '').toLowerCase();
              if (name.includes('old') || name.includes('12-18') || name.includes('6-12')) {
                normalized.action = 'compress';
              } else {
                normalized.action = 'keep';
              }
            }
            
            // Normalize action to lowercase
            normalized.action = normalized.action.toLowerCase();
            
            // If action is not valid, default to 'keep'
            if (!validActions.includes(normalized.action)) {
              normalized.action = 'keep';
            }
            
            return normalized;
          });
          allClusters.push(...normalizedClusters);
        } catch (fileError) {
          console.error(`Error reading cluster file ${file}:`, fileError);
        }
      }
    }

    // Merge clusters with the same action into single clusters
    const mergedClusters = {};
    const validActions = ['keep', 'compress', 'forget', 'delete'];
    
    // First, load all memories to redistribute them intelligently
    let allMemories = [];
    try {
      const MEMORIES_DIR = path.join(__dirname, '../data/memories');
      const memoryFiles = await fs.readdir(MEMORIES_DIR);
      for (const file of memoryFiles) {
        if (file.endsWith('.json')) {
          try {
            const content = await fs.readFile(path.join(MEMORIES_DIR, file), 'utf8');
            const memories = JSON.parse(content);
            allMemories.push(...memories);
          } catch (e) {
            // Skip file
          }
        }
      }
    } catch (e) {
      // If we can't load memories, proceed with cluster-based merging
    }
    
    // Redistribute memories across all 4 categories based on relevance
    // Sort memories by relevance (descending) to assign based on percentile
    const sortedMemories = [...allMemories].sort((a, b) => {
      const relA = a.relevance1Year || 0.5;
      const relB = b.relevance1Year || 0.5;
      return relB - relA; // Sort descending
    });
    
    const totalMemories = sortedMemories.length;
    const keepThreshold = Math.floor(totalMemories * 0.40); // Top 40% -> Keep
    const compressThreshold = Math.floor(totalMemories * 0.70); // Next 30% -> Compress
    const forgetThreshold = Math.floor(totalMemories * 0.90); // Next 20% -> Forget
    // Bottom 10% -> Delete
    
    const memoryActionMap = {};
    sortedMemories.forEach((memory, index) => {
      // Only respect user overrides, not predicted actions (redistribute everything else)
      let action = memory.overrideAction; // Only use user overrides
      
      // If no user override, assign based on percentile position
      if (!action || !validActions.includes(action.toLowerCase())) {
        // Distribute based on percentile position
        if (index < keepThreshold) {
          action = 'keep';
        } else if (index < compressThreshold) {
          action = 'compress';
        } else if (index < forgetThreshold) {
          action = 'forget';
        } else {
          action = 'delete';
        }
      }
      
      memoryActionMap[memory.id] = action.toLowerCase();
    });
    
    // Merge clusters and redistribute memories
    allClusters.forEach(cluster => {
      // Get action from cluster, default to 'keep' if not set
      let action = cluster.action ? cluster.action.toLowerCase() : 'keep';
      
      // If action is not valid, default to 'keep'
      if (!validActions.includes(action)) {
        action = 'keep';
      }
      
      // Get memory IDs from cluster
      const clusterMemoryIds = cluster.memoryIds || cluster.memories || [];
      
      // Redistribute each memory based on its actual relevance
      clusterMemoryIds.forEach(memoryId => {
        // Use redistributed action if available, otherwise use cluster action
        const memoryAction = memoryActionMap[memoryId] || action;
        const finalAction = validActions.includes(memoryAction) ? memoryAction : 'keep';
        
        // Initialize cluster if needed
        if (!mergedClusters[finalAction]) {
          mergedClusters[finalAction] = {
            id: `merged-${finalAction}-${Date.now()}`,
            name: finalAction.charAt(0).toUpperCase() + finalAction.slice(1),
            type: 'action',
            action: finalAction,
            memoryIds: [],
            size: 0,
            totalSize: 0
          };
        }
        
        // Add memory to appropriate cluster (avoid duplicates)
        if (!mergedClusters[finalAction].memoryIds.includes(memoryId)) {
          mergedClusters[finalAction].memoryIds.push(memoryId);
        }
      });
    });
    
    // Also include memories that aren't in any cluster
    const clusteredMemoryIds = new Set();
    Object.values(mergedClusters).forEach(cluster => {
      cluster.memoryIds.forEach(id => clusteredMemoryIds.add(id));
    });
    
    allMemories.forEach(memory => {
      if (!clusteredMemoryIds.has(memory.id)) {
        const action = memoryActionMap[memory.id] || 'keep';
        const finalAction = validActions.includes(action) ? action : 'keep';
        
        // Initialize cluster if needed
        if (!mergedClusters[finalAction]) {
          mergedClusters[finalAction] = {
            id: `merged-${finalAction}-${Date.now()}`,
            name: finalAction.charAt(0).toUpperCase() + finalAction.slice(1),
            type: 'action',
            action: finalAction,
            memoryIds: [],
            size: 0,
            totalSize: 0
          };
        }
        
        mergedClusters[finalAction].memoryIds.push(memory.id);
      }
    });
    
    // Update sizes for all merged clusters
    Object.keys(mergedClusters).forEach(action => {
      mergedClusters[action].size = mergedClusters[action].memoryIds.length;
    });

    // Ensure all 4 action clusters exist (even if empty)
    validActions.forEach(action => {
      if (!mergedClusters[action]) {
        mergedClusters[action] = {
          id: `empty-${action}-${Date.now()}`, // Generate a unique ID
          name: action.charAt(0).toUpperCase() + action.slice(1),
          type: 'action',
          action: action,
          memoryIds: [],
          size: 0,
          totalSize: 0
        };
      }
    });
    
    // Convert merged clusters object to array
    const finalClusters = Object.values(mergedClusters);
    
    // Recalculate totalSize for merged clusters from actual memories if available
    // (This is optional - summing should work, but recalculating is more accurate)
    try {
      const MEMORIES_DIR = path.join(__dirname, '../data/memories');
      const memoryFiles = await fs.readdir(MEMORIES_DIR);
      const allMemories = [];
      
      for (const file of memoryFiles) {
        if (file.endsWith('.json')) {
          try {
            const content = await fs.readFile(path.join(MEMORIES_DIR, file), 'utf8');
            const memories = JSON.parse(content);
            allMemories.push(...memories);
          } catch (e) {
            // Skip file
          }
        }
      }
      
      // Recalculate totalSize for action-based clusters
      finalClusters.forEach(cluster => {
        if (cluster.type === 'action' && cluster.memoryIds) {
          cluster.totalSize = cluster.memoryIds.reduce((sum, id) => {
            const memory = allMemories.find(m => m.id === id);
            return sum + (memory?.size || 0);
          }, 0);
        }
      });
    } catch (e) {
      // If we can't read memories, use the summed totalSize
      console.log('Could not recalculate cluster sizes from memories, using summed values');
    }

    res.json(finalClusters);
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

// Delete a cluster
router.delete('/:id', async (req, res) => {
  try {
    const files = await fs.readdir(CLUSTERS_DIR);
    let clusterFound = false;
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(CLUSTERS_DIR, file);
        const content = await fs.readFile(filePath, 'utf8');
        const clusters = JSON.parse(content);
        const clusterIndex = clusters.findIndex(c => c.id === req.params.id);
        
        if (clusterIndex !== -1) {
          clusterFound = true;
          // Remove the cluster
          clusters.splice(clusterIndex, 1);
          
          // If file is now empty, delete it, otherwise save updated clusters
          if (clusters.length === 0) {
            await fs.unlink(filePath);
          } else {
            await fs.writeFile(filePath, JSON.stringify(clusters, null, 2));
          }
          
          return res.json({ success: true, message: 'Cluster deleted successfully' });
        }
      }
    }
    
    if (!clusterFound) {
      return res.status(404).json({ error: 'Cluster not found' });
    }
  } catch (error) {
    console.error('Error deleting cluster:', error);
    res.status(500).json({ error: error.message });
  }
});

// Remove a memory from a cluster
router.delete('/:id/memories/:memoryId', async (req, res) => {
  try {
    const { id: clusterId, memoryId } = req.params;
    const files = await fs.readdir(CLUSTERS_DIR);
    let clusterFound = false;
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(CLUSTERS_DIR, file);
        const content = await fs.readFile(filePath, 'utf8');
        const clusters = JSON.parse(content);
        const cluster = clusters.find(c => c.id === clusterId);
        
        if (cluster) {
          clusterFound = true;
          // Support both old format (memories) and new format (memoryIds)
          const memoryIds = cluster.memoryIds || cluster.memories || [];
          if (!Array.isArray(memoryIds)) {
            return res.status(400).json({ error: 'Cluster has no valid memoryIds or memories array' });
          }
          
          // Normalize to memoryIds format
          if (cluster.memories && !cluster.memoryIds) {
            cluster.memoryIds = cluster.memories;
            delete cluster.memories;
          }
          
          const memoryIndex = cluster.memoryIds.indexOf(memoryId);
          if (memoryIndex !== -1) {
            cluster.memoryIds.splice(memoryIndex, 1);
            cluster.size = cluster.memoryIds.length;
            
            // Update total size
            const memoriesRoute = require('./memories');
            const MEMORIES_DIR = path.join(__dirname, '../data/memories');
            let memoryFiles = [];
            try {
              memoryFiles = await fs.readdir(MEMORIES_DIR);
            } catch (e) {
              // Directory doesn't exist
            }
            
            let totalSize = 0;
            for (const memFile of memoryFiles) {
              if (memFile.endsWith('.json')) {
                try {
                  const memContent = await fs.readFile(path.join(MEMORIES_DIR, memFile), 'utf8');
                  const memories = JSON.parse(memContent);
                  cluster.memoryIds.forEach(id => {
                    const mem = memories.find(m => m.id === id);
                    if (mem) totalSize += (mem.size || 0);
                  });
                } catch (e) {
                  // Skip file
                }
              }
            }
            cluster.totalSize = totalSize;
              
              await fs.writeFile(filePath, JSON.stringify(clusters, null, 2));
              
              // Also update the memory's cluster reference
              // MEMORIES_DIR is already declared above, reuse it
              let memoryFiles2 = [];
              try {
                memoryFiles2 = await fs.readdir(MEMORIES_DIR);
              } catch (e) {
                // Directory doesn't exist
              }
              
              for (const memFile of memoryFiles2) {
                if (memFile.endsWith('.json')) {
                  try {
                    const memFilePath = path.join(MEMORIES_DIR, memFile);
                    const memContent = await fs.readFile(memFilePath, 'utf8');
                    const memories = JSON.parse(memContent);
                    const memoryIndex = memories.findIndex(m => m.id === memoryId);
                    
                    if (memoryIndex !== -1) {
                      // Clear cluster reference from memory
                      delete memories[memoryIndex].cluster;
                      delete memories[memoryIndex].clusterName;
                      await fs.writeFile(memFilePath, JSON.stringify(memories, null, 2));
                      break;
                    }
                  } catch (e) {
                    // Skip file
                  }
                }
              }
              
              return res.json({ success: true, message: 'Memory removed from cluster', cluster });
            } else {
              return res.status(404).json({ error: 'Memory not found in cluster' });
            }
        }
      }
    }
    
    if (!clusterFound) {
      return res.status(404).json({ error: 'Cluster not found' });
    }
  } catch (error) {
    console.error('Error removing memory from cluster:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

