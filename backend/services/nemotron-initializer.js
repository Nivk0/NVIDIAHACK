const fs = require('fs').promises;
const path = require('path');
const NemotronAgent = require('../agents/nemotron');

const MEMORIES_DIR = path.join(__dirname, '../data/memories');
const REFRESH_DAYS = parseInt(process.env.NEMOTRON_REFRESH_DAYS || '7', 10);

async function ensureNemotronAnalysis() {
  const agent = new NemotronAgent();

  if (!agent.apiKey) {
    console.warn('[Nemotron] NEMOTRON_API_KEY not configured. Skipping memory re-analysis.');
    return;
  }

  let files = [];
  try {
    files = await fs.readdir(MEMORIES_DIR);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return;
    }
    console.error('[Nemotron] Failed to read memories directory:', error);
    return;
  }

  const jsonFiles = files.filter(f => f.endsWith('.json'));
  for (const file of jsonFiles) {
    const filePath = path.join(MEMORIES_DIR, file);
    try {
      const raw = await fs.readFile(filePath, 'utf8');
      const memories = JSON.parse(raw);
      const updatedMemories = [];
      let didUpdate = false;

      for (const memory of memories) {
        if (shouldRefresh(memory)) {
          try {
            const analysis = await agent.analyzeMemory(memory);
            updatedMemories.push({
              ...memory,
              relevance1Month: analysis.relevance1Month,
              relevance1Year: analysis.relevance1Year,
              attachment: analysis.attachment,
              predictedAction: analysis.predictedAction,
              sentiment: analysis.sentiment,
              nemotronAnalyzed: analysis.nemotronAnalyzed,
              nemotronExplanation: analysis.explanation,
              nemotronConfidence: analysis.confidence,
              nemotronUpdatedAt: analysis.nemotronUpdatedAt,
              nemotronAnalysis: analysis
            });
            didUpdate = true;
            await delay(300);
          } catch (analysisError) {
            console.error(`[Nemotron] Failed to analyze memory ${memory.id}:`, analysisError.message);
            updatedMemories.push(memory);
          }
        } else {
          updatedMemories.push(memory);
        }
      }

      if (didUpdate) {
        await fs.writeFile(filePath, JSON.stringify(updatedMemories, null, 2));
        console.log(`[Nemotron] Updated Nemotron analysis for ${file}`);
      }
    } catch (error) {
      console.error(`[Nemotron] Error processing file ${file}:`, error);
    }
  }
}

function shouldRefresh(memory) {
  if (!memory) return false;
  if (!memory.nemotronAnalyzed) return true;
  if (!memory.nemotronUpdatedAt) return true;

  const updatedAt = new Date(memory.nemotronUpdatedAt);
  if (Number.isNaN(updatedAt.getTime())) return true;

  const now = new Date();
  const diffDays = (now - updatedAt) / (1000 * 60 * 60 * 24);
  return diffDays >= REFRESH_DAYS;
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  ensureNemotronAnalysis
};

