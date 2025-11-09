const express = require('express');
const path = require('path');
const fs = require('fs').promises;

const router = express.Router();
const MEMORIES_DIR = path.join(__dirname, '../data/memories');

// Get all memories
router.get('/', async (req, res) => {
  try {
    let files = [];
    try {
      files = await fs.readdir(MEMORIES_DIR);
    } catch (error) {
      // Directory doesn't exist yet, return empty array
      return res.json([]);
    }
    
    const allMemories = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const content = await fs.readFile(path.join(MEMORIES_DIR, file), 'utf8');
          const memories = JSON.parse(content);
          allMemories.push(...memories);
        } catch (fileError) {
          console.error(`Error reading memory file ${file}:`, fileError);
        }
      }
    }

    res.json(allMemories);
  } catch (error) {
    console.error('Error fetching memories:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get memory by ID
router.get('/:id', async (req, res) => {
  try {
    let files = [];
    try {
      files = await fs.readdir(MEMORIES_DIR);
    } catch (error) {
      return res.status(404).json({ error: 'Memory not found' });
    }
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const content = await fs.readFile(path.join(MEMORIES_DIR, file), 'utf8');
          const memories = JSON.parse(content);
          const memory = memories.find(m => m.id === req.params.id);
          
          if (memory) {
            return res.json(memory);
          }
        } catch (fileError) {
          console.error(`Error reading memory file ${file}:`, fileError);
        }
      }
    }

    res.status(404).json({ error: 'Memory not found' });
  } catch (error) {
    console.error('Error fetching memory:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update memory (override action)
router.put('/:id', async (req, res) => {
  try {
    const { action } = req.body; // 'keep', 'compress', 'forget'
    let files = [];
    try {
      files = await fs.readdir(MEMORIES_DIR);
    } catch (error) {
      return res.status(404).json({ error: 'Memory not found' });
    }
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const filePath = path.join(MEMORIES_DIR, file);
          const content = await fs.readFile(filePath, 'utf8');
          const memories = JSON.parse(content);
          const memoryIndex = memories.findIndex(m => m.id === req.params.id);
          
          if (memoryIndex !== -1) {
            memories[memoryIndex].overrideAction = action;
            memories[memoryIndex].userOverridden = true;
            await fs.writeFile(filePath, JSON.stringify(memories, null, 2));
            return res.json(memories[memoryIndex]);
          }
        } catch (fileError) {
          console.error(`Error updating memory file ${file}:`, fileError);
        }
      }
    }

    res.status(404).json({ error: 'Memory not found' });
  } catch (error) {
    console.error('Error updating memory:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete memory (move to oblivion)
router.delete('/:id', async (req, res) => {
  try {
    let files = [];
    try {
      files = await fs.readdir(MEMORIES_DIR);
    } catch (error) {
      return res.status(404).json({ error: 'Memory not found' });
    }
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const filePath = path.join(MEMORIES_DIR, file);
          const content = await fs.readFile(filePath, 'utf8');
          const memories = JSON.parse(content);
          const memoryIndex = memories.findIndex(m => m.id === req.params.id);
          
          if (memoryIndex !== -1) {
            const memory = memories[memoryIndex];
            // Move to oblivion (save summary, delete original)
            const oblivionPath = path.join(__dirname, '../data/oblivion.json');
            let oblivion = [];
            try {
              const oblivionContent = await fs.readFile(oblivionPath, 'utf8');
              oblivion = JSON.parse(oblivionContent);
            } catch (e) {
              // File doesn't exist, create new
            }
            
            oblivion.push({
              id: memory.id,
              summary: memory.summary,
              cluster: memory.cluster,
              deletedAt: new Date().toISOString()
            });
            
            await fs.writeFile(oblivionPath, JSON.stringify(oblivion, null, 2));
            
            // Remove from memories
            memories.splice(memoryIndex, 1);
            await fs.writeFile(filePath, JSON.stringify(memories, null, 2));
            
            return res.json({ success: true, message: 'Memory moved to oblivion' });
          }
        } catch (fileError) {
          console.error(`Error deleting memory from file ${file}:`, fileError);
        }
      }
    }

    res.status(404).json({ error: 'Memory not found' });
  } catch (error) {
    console.error('Error deleting memory:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

