/**
 * Script to re-analyze existing memories using Nemotron
 * Run with: node backend/scripts/analyze-memories.js
 */

// Load environment variables from .env file
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const fs = require('fs').promises;
const path = require('path');
const NemotronAgent = require('../agents/nemotron');

const MEMORIES_DIR = path.join(__dirname, '../data/memories');

async function analyzeExistingMemories() {
  const nemotron = new NemotronAgent();
  
  if (!nemotron.apiKey) {
    console.error('❌ NEMOTRON_API_KEY environment variable is not set!');
    console.error('Please set it before running this script:');
    console.error('export NEMOTRON_API_KEY=your_api_key_here');
    process.exit(1);
  }

  try {
    // Read all memory files
    const files = await fs.readdir(MEMORIES_DIR);
    const memoryFiles = files.filter(f => f.endsWith('.json'));

    console.log(`Found ${memoryFiles.length} memory file(s)`);

    for (const file of memoryFiles) {
      console.log(`\n📄 Processing ${file}...`);
      const filePath = path.join(MEMORIES_DIR, file);
      const content = await fs.readFile(filePath, 'utf8');
      const memories = JSON.parse(content);

      console.log(`  Analyzing ${memories.length} memories with Nemotron...`);

      // Analyze each memory
      const updatedMemories = [];
      for (let i = 0; i < memories.length; i++) {
        const memory = memories[i];
        console.log(`  [${i + 1}/${memories.length}] Analyzing: ${memory.id}`);

        try {
          const analysis = await nemotron.analyzeMemory(memory);
          
          // Update memory with Nemotron analysis
          const updatedMemory = {
            ...memory,
            // Use Nemotron-generated summary if available
            summary: analysis.summary || memory.summary,
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
          };

          updatedMemories.push(updatedMemory);
          console.log(`    ✅ Action: ${analysis.predictedAction} | Relevance: ${(analysis.relevance1Year * 100).toFixed(0)}%`);

          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.error(`    ❌ Error analyzing ${memory.id}:`, error.message);
          updatedMemories.push(memory); // Keep original if analysis fails
        }
      }

      // Write updated memories back to file
      await fs.writeFile(filePath, JSON.stringify(updatedMemories, null, 2));
      console.log(`  ✅ Updated ${file}`);
    }

    console.log('\n🎉 Analysis complete!');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run the script
analyzeExistingMemories();

