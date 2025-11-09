const NemotronAgent = require('./nemotron');

class PredictionAgent {
  constructor() {
    this.nemotron = new NemotronAgent();
    this.useNemotron = process.env.USE_NEMOTRON !== 'false'; // Default to true
  }

  async predict(scannedData) {
    // ONLY use Nemotron - no fallback to hardcoded rules
    if (!this.useNemotron || !this.nemotron.apiKey) {
      throw new Error('Nemotron is required but not configured. Please set NEMOTRON_API_KEY in your .env file.');
    }
    
    // Use Nemotron for AI-powered analysis
    return await this.predictWithNemotron(scannedData);
  }

  async predictWithNemotron(scannedData) {
    const results = [];
    
    for (const item of scannedData) {
      const age = this.calculateAge(item.createdAt);
      const contextSummary = this.buildContextSummary(item, age);
      const analysis = await this.nemotron.analyzeMemory({
        ...item,
        age,
        contextSummary
      });
      
      results.push({
        ...item,
        age,
        // Use Nemotron-generated summary if available, otherwise keep original summary
        summary: analysis.summary || item.summary,
        relevance1Month: analysis.relevance1Month,
        relevance1Year: analysis.relevance1Year,
        attachment: analysis.attachment,
        predictedAction: analysis.predictedAction,
        sentiment: analysis.sentiment,
        nemotronAnalysis: analysis,
        nemotronExplanation: analysis.explanation,
        nemotronConfidence: analysis.confidence,
        nemotronAnalyzed: analysis.nemotronAnalyzed,
        nemotronUpdatedAt: analysis.nemotronUpdatedAt
      });

      // Gentle rate limiting between calls
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    
    return results;
  }

  predictWithRules(scannedData) {
    return scannedData.map(item => {
      const age = this.calculateAge(item.createdAt);
      const relevance1Month = this.calculateRelevance(item, 1);
      const relevance1Year = this.calculateRelevance(item, 12);
      
      return {
        ...item,
        age,
        relevance1Month,
        relevance1Year,
        predictedAction: this.predictAction(relevance1Month, relevance1Year, age)
      };
    });
  }

  calculateAge(createdAt) {
    const now = new Date();
    const created = new Date(createdAt);
    const diffTime = Math.abs(now - created);
    const diffMonths = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 30));
    return diffMonths;
  }

  calculateRelevance(item, monthsAhead) {
    const age = this.calculateAge(item.createdAt);
    const totalAge = age + monthsAhead;
    
    let baseRelevance = 0.5;
    
    // Older items are less relevant
    if (totalAge > 60) baseRelevance *= 0.3; // 5+ years
    else if (totalAge > 24) baseRelevance *= 0.5; // 2+ years
    else if (totalAge > 12) baseRelevance *= 0.7; // 1+ year
    
    // Type-based relevance
    if (item.type === 'document') baseRelevance *= 1.2;
    if (item.type === 'email') baseRelevance *= 0.9;
    if (item.type === 'image') baseRelevance *= 0.8;
    
    // Content length (longer = potentially more important)
    if (item.content && item.content.length > 1000) baseRelevance *= 1.1;
    if (item.content && item.content.length < 100) baseRelevance *= 0.9;
    
    // Ensure relevance is between 0 and 1
    return Math.min(1, Math.max(0, baseRelevance));
  }

  predictAction(relevance1Month, relevance1Year, age) {
    if (relevance1Year < 0.2 && age > 24) {
      return 'low_relevance';
    } else if (relevance1Month < 0.4 || relevance1Year < 0.3) {
      return 'compress';
    } else {
      return 'keep';
    }
  }

  buildContextSummary(item, age) {
    const parts = [];
    parts.push(`Age: ${age} months`);
    parts.push(`Type: ${item.type || 'unknown'}`);
    if (item.title) {
      parts.push(`Title: ${item.title}`);
    }
    if (item.summary) {
      parts.push(`Summary: ${item.summary}`);
    }
    if (item.content) {
      const excerpt = item.content.substring(0, 280).replace(/\s+/g, ' ');
      if (excerpt.length > 0) {
        parts.push(`Excerpt: ${excerpt}${item.content.length > 280 ? '...' : ''}`);
      }
    }
    if (item.metadata?.imageQuality) {
      parts.push(`Image quality: ${item.metadata.imageQuality}`);
    }
    if (item.metadata?.qualityHint) {
      parts.push(`Quality hint: ${item.metadata.qualityHint}`);
    }
    if (item.metadata?.width && item.metadata?.height) {
      parts.push(`Dimensions: ${item.metadata.width}x${item.metadata.height}`);
    }
    if (item.metadata?.pageCount) {
      parts.push(`Pages: ${item.metadata.pageCount}`);
    }
    if (item.metadata?.columns) {
      parts.push(`Columns: ${item.metadata.columns}`);
    }
    if (item.metadata?.rows) {
      parts.push(`Rows: ${item.metadata.rows}`);
    }
    if (item.metadata?.topic) {
      parts.push(`Topic: ${item.metadata.topic}`);
    }
    if (Array.isArray(item.tags) && item.tags.length > 0) {
      parts.push(`Tags: ${item.tags.join(', ')}`);
    }
    if (item.metadata?.sentimentHint) {
      parts.push(`Sentiment hint: ${item.metadata.sentimentHint}`);
    }
    if (item.metadata?.importance) {
      parts.push(`Importance level: ${item.metadata.importance}`);
    }
    if (item.metadata?.flags?.includes('blurry')) {
      parts.push('Flag: blurry');
    }
    if (item.metadata?.category) {
      parts.push(`Category: ${item.metadata.category}`);
    }
    if (item.size) {
      parts.push(`Size: ${item.size} bytes`);
    }
    return parts.join(' | ');
  }
}

module.exports = PredictionAgent;

