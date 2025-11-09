const express = require('express');
const path = require('path');
const fs = require('fs').promises;

const router = express.Router();
const PROFILE_FILE = path.join(__dirname, '../data/user-profile.json');


router.get('/', async (req, res) => {
  try {
    const content = await fs.readFile(PROFILE_FILE, 'utf8');
    const profile = JSON.parse(content);
    res.json(profile);
  } catch (error) {

    if (error.code === 'ENOENT') {
      return res.json(null);
    }
    console.error('Error reading profile:', error);
    res.status(500).json({ error: error.message });
  }
});


router.put('/', async (req, res) => {
  try {
    const profile = req.body;


    const dataDir = path.dirname(PROFILE_FILE);
    await fs.mkdir(dataDir, { recursive: true });


    await fs.writeFile(PROFILE_FILE, JSON.stringify(profile, null, 2));

    res.json({ success: true, profile });
  } catch (error) {
    console.error('Error saving profile:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

