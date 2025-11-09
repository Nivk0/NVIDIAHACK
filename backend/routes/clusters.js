const express = require('express');
const path = require('path');
const fs = require('fs').promises;

const router = express.Router();
const CLUSTERS_DIR = path.join(__dirname, '../data/clusters');


router.get('/', async (req, res) => {
  try {
    let files = [];
    try {
      files = await fs.readdir(CLUSTERS_DIR);
    } catch (error) {

      return res.json([]);
    }

    const allClusters = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const content = await fs.readFile(path.join(CLUSTERS_DIR, file), 'utf8');
          const clusters = JSON.parse(content);


          const normalizedClusters = clusters.map(cluster => {
            let normalized = { ...cluster };


            if (cluster.memories && !cluster.memoryIds) {
              normalized.memoryIds = cluster.memories;
              normalized.size = cluster.size || (cluster.memories ? cluster.memories.length : 0);
            }


            const validActions = ['keep', 'compress', 'low_relevance', 'delete'];
            if (!normalized.action) {

              const name = (normalized.name || '').toLowerCase();
              if (name.includes('old') || name.includes('12-18') || name.includes('6-12')) {
                normalized.action = 'compress';
              } else {
                normalized.action = 'keep';
              }
            }


            normalized.action = normalized.action.toLowerCase();


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


    const mergedClusters = {};
    const validActions = ['keep', 'compress', 'low_relevance', 'delete'];


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

          }
        }
      }
    } catch (e) {

    }


    const memoryActionMap = {};
    allMemories.forEach((memory) => {

      let action = memory.overrideAction;


      if (action && action.toLowerCase() === 'forget') {
        action = 'low_relevance';
      }


      if (!action || !validActions.includes(action.toLowerCase())) {

        action = memory.predictedAction ||
                 memory.nemotronAnalysis?.predictedAction ||
                 'keep';
      }


      action = action.toLowerCase();
      if (!validActions.includes(action)) {
        action = 'keep';
      }

      memoryActionMap[memory.id] = action;
    });


    allClusters.forEach(cluster => {

      let action = cluster.action ? cluster.action.toLowerCase() : 'keep';


      if (!validActions.includes(action)) {
        action = 'keep';
      }


      const clusterMemoryIds = cluster.memoryIds || cluster.memories || [];


      clusterMemoryIds.forEach(memoryId => {

        const memoryAction = memoryActionMap[memoryId] || action;
        const finalAction = validActions.includes(memoryAction) ? memoryAction : 'keep';


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


        if (!mergedClusters[finalAction].memoryIds.includes(memoryId)) {
          mergedClusters[finalAction].memoryIds.push(memoryId);
        }
      });
    });


    const clusteredMemoryIds = new Set();
    Object.values(mergedClusters).forEach(cluster => {
      cluster.memoryIds.forEach(id => clusteredMemoryIds.add(id));
    });

    allMemories.forEach(memory => {
      if (!clusteredMemoryIds.has(memory.id)) {
        const action = memoryActionMap[memory.id] || 'keep';
        const finalAction = validActions.includes(action) ? action : 'keep';


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


    Object.keys(mergedClusters).forEach(action => {
      mergedClusters[action].size = mergedClusters[action].memoryIds.length;
    });


    const actionNames = {
      'keep': 'Keep',
      'compress': 'Compress',
      'low_relevance': 'Low Future Relevance',
      'delete': 'Delete'
    };
    validActions.forEach(action => {
      if (!mergedClusters[action]) {
        mergedClusters[action] = {
          id: `empty-${action}-${Date.now()}`,
          name: actionNames[action] || action.charAt(0).toUpperCase() + action.slice(1),
          type: 'action',
          action: action,
          memoryIds: [],
          size: 0,
          totalSize: 0
        };
      }
    });


    const finalClusters = Object.values(mergedClusters);



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

          }
        }
      }


      finalClusters.forEach(cluster => {
        if (cluster.type === 'action' && cluster.memoryIds) {
          cluster.totalSize = cluster.memoryIds.reduce((sum, id) => {
            const memory = allMemories.find(m => m.id === id);
            return sum + (memory?.size || 0);
          }, 0);
        }
      });
    } catch (e) {

      console.log('Could not recalculate cluster sizes from memories, using summed values');
    }

    res.json(finalClusters);
  } catch (error) {
    console.error('Error fetching clusters:', error);
    res.status(500).json({ error: error.message });
  }
});


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


router.put('/:id/batch-action', async (req, res) => {
  try {
    const { action, memoryIds } = req.body;
    const memoriesRoute = require('./memories');


    for (const memoryId of memoryIds) {

    }

    res.json({ success: true, message: `Batch action ${action} applied to cluster` });
  } catch (error) {
    console.error('Error updating cluster:', error);
    res.status(500).json({ error: error.message });
  }
});


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


          if (memory.metadata?.storedFilename) {
            const uploadFilePath = path.join(UPLOADS_DIR, memory.metadata.storedFilename);
            try {
              await fs.unlink(uploadFilePath);
            } catch (e) {

              console.log(`Could not delete upload file ${memory.metadata.storedFilename}:`, e.message);
            }
          }


          memories.splice(memoryIndex, 1);


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


router.delete('/:id', async (req, res) => {
  try {

    let clusterId = decodeURIComponent(req.params.id);
    const MEMORIES_DIR = path.join(__dirname, '../data/memories');

    console.log(`[Delete Cluster] Attempting to delete cluster with ID: ${clusterId}`);



    let action = null;
    const validActions = ['keep', 'compress', 'low_relevance', 'delete'];


    if (clusterId.startsWith('merged-') || clusterId.startsWith('empty-')) {

      const parts = clusterId.split('-');
      if (parts.length >= 2) {
        action = parts[1].toLowerCase();
        console.log(`[Delete Cluster] Extracted action "${action}" from cluster ID format`);
      }
    } else {

      const lowerId = clusterId.toLowerCase();
      for (const validAction of validActions) {
        if (lowerId.includes(validAction)) {
          action = validAction;
          console.log(`[Delete Cluster] Found action "${action}" in cluster ID`);
          break;
        }
      }
    }


    if (action === 'forget') {
      action = 'low_relevance';
    }


    if (!action || !validActions.includes(action)) {
      console.log(`[Delete Cluster] Could not extract valid action from cluster ID: ${clusterId}`);

      action = null;
    }


    if (action && ['keep', 'compress', 'low_relevance', 'delete'].includes(action)) {


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

            }
          }
        }
      } catch (e) {

      }


      const validActions = ['keep', 'compress', 'low_relevance', 'delete'];
      const memoriesToDelete = allMemories.filter(memory => {
        let memoryAction = memory.overrideAction || memory.predictedAction || memory.nemotronAnalysis?.predictedAction || 'keep';
        if (memoryAction.toLowerCase() === 'forget') {
          memoryAction = 'low_relevance';
        }
        return memoryAction.toLowerCase() === action.toLowerCase();
      });


      let deletedMemories = 0;
      for (const memory of memoriesToDelete) {
        const deleted = await deleteMemoryPermanently(memory.id);
        if (deleted) {
          deletedMemories++;
        }
      }


      const files = await fs.readdir(CLUSTERS_DIR);
      let deletedClusters = 0;

      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(CLUSTERS_DIR, file);
          const content = await fs.readFile(filePath, 'utf8');
          let clusters = JSON.parse(content);
          const initialLength = clusters.length;


          clusters = clusters.filter(c => {
            const clusterAction = (c.action || '').toLowerCase();
            return clusterAction !== action.toLowerCase();
          });

          if (clusters.length < initialLength) {
            deletedClusters += (initialLength - clusters.length);

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


          memoryIdsToDelete = cluster.memoryIds || cluster.memories || [];
          if (!Array.isArray(memoryIdsToDelete)) {
            memoryIdsToDelete = [];
          }


          let deletedMemories = 0;
          for (const memoryId of memoryIdsToDelete) {
            const deleted = await deleteMemoryPermanently(memoryId);
            if (deleted) {
              deletedMemories++;
            }
          }


          clusters.splice(clusterIndex, 1);


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

          const memoryIds = cluster.memoryIds || cluster.memories || [];
          if (!Array.isArray(memoryIds)) {
            return res.status(400).json({ error: 'Cluster has no valid memoryIds or memories array' });
          }


          if (cluster.memories && !cluster.memoryIds) {
            cluster.memoryIds = cluster.memories;
            delete cluster.memories;
          }

          const memoryIndex = cluster.memoryIds.indexOf(memoryId);
          if (memoryIndex !== -1) {
            cluster.memoryIds.splice(memoryIndex, 1);
            cluster.size = cluster.memoryIds.length;


            const memoriesRoute = require('./memories');
            const MEMORIES_DIR = path.join(__dirname, '../data/memories');
            let memoryFiles = [];
            try {
              memoryFiles = await fs.readdir(MEMORIES_DIR);
            } catch (e) {

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

                }
              }
            }
            cluster.totalSize = totalSize;

              await fs.writeFile(filePath, JSON.stringify(clusters, null, 2));



              let memoryFiles2 = [];
              try {
                memoryFiles2 = await fs.readdir(MEMORIES_DIR);
              } catch (e) {

              }

              for (const memFile of memoryFiles2) {
                if (memFile.endsWith('.json')) {
                  try {
                    const memFilePath = path.join(MEMORIES_DIR, memFile);
                    const memContent = await fs.readFile(memFilePath, 'utf8');
                    const memories = JSON.parse(memContent);
                    const memoryIndex = memories.findIndex(m => m.id === memoryId);

                    if (memoryIndex !== -1) {

                      delete memories[memoryIndex].cluster;
                      delete memories[memoryIndex].clusterName;
                      await fs.writeFile(memFilePath, JSON.stringify(memories, null, 2));
                      break;
                    }
                  } catch (e) {

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

