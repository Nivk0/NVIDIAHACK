const express = require('express');
const path = require('path');
const fs = require('fs').promises;

const router = express.Router();
const MEMORIES_DIR = path.join(__dirname, '../data/memories');

function calculateAge(createdAt) {
  if (!createdAt) return null;
  const now = new Date();
  const created = new Date(createdAt);
  if (Number.isNaN(created.getTime())) return null;
  const diffTime = Math.abs(now - created);
  return Math.floor(diffTime / (1000 * 60 * 60 * 24 * 30));
}


router.get('/', async (req, res) => {
  try {
    let files = [];
    try {
      files = await fs.readdir(MEMORIES_DIR);
    } catch (error) {

      return res.json([]);
    }

    const allMemories = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const content = await fs.readFile(path.join(MEMORIES_DIR, file), 'utf8');
          const memories = JSON.parse(content).map(memory => ({
            ...memory,
            age: memory.age ?? calculateAge(memory.createdAt)
          }));
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
          const memories = JSON.parse(content).map(memory => ({
            ...memory,
            age: memory.age ?? calculateAge(memory.createdAt)
          }));
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


router.put('/:id', async (req, res) => {
  try {
    const { action } = req.body;
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

            const oblivionPath = path.join(__dirname, '../data/oblivion.json');
            let oblivion = [];
            try {
              const oblivionContent = await fs.readFile(oblivionPath, 'utf8');
              oblivion = JSON.parse(oblivionContent);
            } catch (e) {

            }

            oblivion.push({
              id: memory.id,
              summary: memory.summary,
              cluster: memory.cluster,
              deletedAt: new Date().toISOString()
            });

            await fs.writeFile(oblivionPath, JSON.stringify(oblivion, null, 2));


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

