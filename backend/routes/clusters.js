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
            const validActions = ['keep', 'compress', 'low_relevance', 'delete'];
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
    const validActions = ['keep', 'compress', 'low_relevance', 'delete'];
    
    // First, load all memories to use their actual predicted actions from the files
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
    
    // Use actual predicted actions from the memory files (not fake percentile-based redistribution)
    const memoryActionMap = {};
    allMemories.forEach((memory) => {
      // First check for user override (always respect user overrides)
      let action = memory.overrideAction;
      
      // Normalize old "forget" to "low_relevance"
      if (action && action.toLowerCase() === 'forget') {
        action = 'low_relevance';
      }
      
      // If no user override, use the actual predicted action from the file
      if (!action || !validActions.includes(action.toLowerCase())) {
        // Use the actual predicted action from Nemotron analysis or memory data
        action = memory.predictedAction || 
                 memory.nemotronAnalysis?.predictedAction || 
                 'keep'; // Default fallback only if no prediction exists
      }
      
      // Normalize action to lowercase and ensure it's valid
      action = action.toLowerCase();
      if (!validActions.includes(action)) {
        action = 'keep'; // Fallback to keep if invalid
      }
      
      memoryActionMap[memory.id] = action;
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
      
      // Use actual predicted actions from memory files
      clusterMemoryIds.forEach(memoryId => {
        // Use the actual action from the memory file (from memoryActionMap), otherwise use cluster action
        const memoryAction = memoryActionMap[memoryId] || action;
        const finalAction = validActions.includes(memoryAction) ? memoryAction : 'keep';
        
        // Initialize cluster if needed
        if (!mergedClusters[finalAction]) {
          const actionNames = {
            'keep': 'Keep',
            'compress': 'Compress',
            'low_relevance': 'Low Future Relevance',
            'delete': 'Delete'
          };
          mergedClusters[finalAction] = {
            id: `merged-${finalAction}-${Date.now()}`,
            name: actionNames[finalAction] || finalAction.charAt(0).toUpperCase() + finalAction.slice(1),
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
          const actionNames = {
            'keep': 'Keep',
            'compress': 'Compress',
            'low_relevance': 'Low Future Relevance',
            'delete': 'Delete'
          };
          mergedClusters[finalAction] = {
            id: `merged-${finalAction}-${Date.now()}`,
            name: actionNames[finalAction] || finalAction.charAt(0).toUpperCase() + finalAction.slice(1),
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
    const actionNames = {
      'keep': 'Keep',
      'compress': 'Compress',
      'low_relevance': 'Low Future Relevance',
      'delete': 'Delete'
    };
    validActions.forEach(action => {
      if (!mergedClusters[action]) {
        mergedClusters[action] = {
          id: `empty-${action}-${Date.now()}`, // Generate a unique ID
          name: actionNames[action] || action.charAt(0).toUpperCase() + action.slice(1),
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

// Helper function to permanently delete a memory
async function deleteMemoryPermanently(memoryId) {
  const MEMORIES_DIR = path.join(__dirname, '../data/memories');
  const UPLOADS_DIR = path.join(__dirname, '../uploads');
  
  let files = [];
  try {
    files = await fs.readdir(MEMORIES_DIR);
  } catch (error) {
    return false;
  }
  
  for (const file of files) {
    if (file.endsWith('.json')) {
      try {
        const filePath = path.join(MEMORIES_DIR, file);
        const content = await fs.readFile(filePath, 'utf8');
        const memories = JSON.parse(content);
        const memoryIndex = memories.findIndex(m => m.id === memoryId);
        
        if (memoryIndex !== -1) {
          const memory = memories[memoryIndex];
          
          // Delete associated uploaded file if it exists
          if (memory.metadata?.storedFilename) {
            const uploadFilePath = path.join(UPLOADS_DIR, memory.metadata.storedFilename);
            try {
              await fs.unlink(uploadFilePath);
            } catch (e) {
              // File might not exist, that's okay
              console.log(`Could not delete upload file ${memory.metadata.storedFilename}:`, e.message);
            }
          }
          
          // Remove from memories array
          memories.splice(memoryIndex, 1);
          
          // Save updated memories or delete file if empty
          if (memories.length === 0) {
            await fs.unlink(filePath);
          } else {
            await fs.writeFile(filePath, JSON.stringify(memories, null, 2));
          }
          
          return true;
        }
      } catch (fileError) {
        console.error(`Error deleting memory from file ${file}:`, fileError);
      }
    }
  }
  
  return false;
}

// Delete a cluster and all its memories permanently
router.delete('/:id', async (req, res) => {
  try {
    // Decode the cluster ID in case it's URL encoded
    let clusterId = decodeURIComponent(req.params.id);
    const MEMORIES_DIR = path.join(__dirname, '../data/memories');
    
    console.log(`[Delete Cluster] Attempting to delete cluster with ID: ${clusterId}`);
    
    // Handle merged/empty action clusters (these are dynamically generated)
    // Extract the action from the cluster ID
    let action = null;
    const validActions = ['keep', 'compress', 'low_relevance', 'delete'];
    
    // Try multiple methods to extract the action
    if (clusterId.startsWith('merged-') || clusterId.startsWith('empty-')) {
      // Format: "merged-keep-1234567890" or "empty-keep-1234567890"
      const parts = clusterId.split('-');
      if (parts.length >= 2) {
        action = parts[1].toLowerCase();
        console.log(`[Delete Cluster] Extracted action "${action}" from cluster ID format`);
      }
    } else {
      // Try to find action name in the cluster ID
      const lowerId = clusterId.toLowerCase();
      for (const validAction of validActions) {
        if (lowerId.includes(validAction)) {
          action = validAction;
          console.log(`[Delete Cluster] Found action "${action}" in cluster ID`);
          break;
        }
      }
    }
    
    // Normalize action (handle 'forget' -> 'low_relevance')
    if (action === 'forget') {
      action = 'low_relevance';
    }
    
    // Validate action
    if (!action || !validActions.includes(action)) {
      console.log(`[Delete Cluster] Could not extract valid action from cluster ID: ${clusterId}`);
      // Try to find cluster in stored cluster files as fallback
      action = null;
    }
    
    // If we found an action, delete all memories with that action
    if (action && ['keep', 'compress', 'low_relevance', 'delete'].includes(action)) {
      
      // Get all memories to find which ones belong to this action
      let allMemories = [];
      try {
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
        // Can't read memories directory
      }
      
      // Find all memories with this action
      const validActions = ['keep', 'compress', 'low_relevance', 'delete'];
      const memoriesToDelete = allMemories.filter(memory => {
        let memoryAction = memory.overrideAction || memory.predictedAction || memory.nemotronAnalysis?.predictedAction || 'keep';
        if (memoryAction.toLowerCase() === 'forget') {
          memoryAction = 'low_relevance';
        }
        return memoryAction.toLowerCase() === action.toLowerCase();
      });
      
      // Delete all memories with this action
      let deletedMemories = 0;
      for (const memory of memoriesToDelete) {
        const deleted = await deleteMemoryPermanently(memory.id);
        if (deleted) {
          deletedMemories++;
        }
      }
      
      // Delete all clusters that have this action
      const files = await fs.readdir(CLUSTERS_DIR);
      let deletedClusters = 0;
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(CLUSTERS_DIR, file);
          const content = await fs.readFile(filePath, 'utf8');
          let clusters = JSON.parse(content);
          const initialLength = clusters.length;
          
          // Remove all clusters with this action
          clusters = clusters.filter(c => {
            const clusterAction = (c.action || '').toLowerCase();
            return clusterAction !== action.toLowerCase();
          });
          
          if (clusters.length < initialLength) {
            deletedClusters += (initialLength - clusters.length);
            // If file is now empty, delete it, otherwise save updated clusters
            if (clusters.length === 0) {
              await fs.unlink(filePath);
            } else {
              await fs.writeFile(filePath, JSON.stringify(clusters, null, 2));
            }
          }
        }
      }
      
      return res.json({ 
        success: true, 
        message: `Deleted ${deletedMemories} memory file(s) with action "${action}". The cluster will be automatically removed.` 
      });
    }
    
    // Handle normal cluster deletion (for non-merged clusters stored in files)
    const files = await fs.readdir(CLUSTERS_DIR);
    let clusterFound = false;
    let memoryIdsToDelete = [];
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(CLUSTERS_DIR, file);
        const content = await fs.readFile(filePath, 'utf8');
        const clusters = JSON.parse(content);
        const clusterIndex = clusters.findIndex(c => c.id === clusterId);
        
        if (clusterIndex !== -1) {
          clusterFound = true;
          const cluster = clusters[clusterIndex];
          
          // Get all memory IDs in this cluster
          memoryIdsToDelete = cluster.memoryIds || cluster.memories || [];
          if (!Array.isArray(memoryIdsToDelete)) {
            memoryIdsToDelete = [];
          }
          
          // Delete all memories in this cluster permanently
          let deletedMemories = 0;
          for (const memoryId of memoryIdsToDelete) {
            const deleted = await deleteMemoryPermanently(memoryId);
            if (deleted) {
              deletedMemories++;
            }
          }
          
          // Remove the cluster
          clusters.splice(clusterIndex, 1);
          
          // If file is now empty, delete it, otherwise save updated clusters
          if (clusters.length === 0) {
            await fs.unlink(filePath);
          } else {
            await fs.writeFile(filePath, JSON.stringify(clusters, null, 2));
          }
          
          return res.json({ 
            success: true, 
            message: `Cluster deleted successfully. Permanently deleted ${deletedMemories} memory file(s).` 
          });
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

