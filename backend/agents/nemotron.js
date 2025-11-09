const https = require('https');

class NemotronAgent {
  constructor() {
    // NVIDIA NIM API endpoint for Nemotron models
    // You'll need to set NEMOTRON_API_KEY environment variable
    // Get your API key from: https://build.nvidia.com/
    this.apiKey = process.env.NEMOTRON_API_KEY || '';
    
    // Try different API endpoints - NVIDIA may use different URLs
    // Some keys work with integrate.api.nvidia.com, others with api.nvidia.com
    this.apiUrl = process.env.NEMOTRON_API_URL || 'https://integrate.api.nvidia.com/v1';
    
    // Available models - try common ones
    // meta/llama-3.1-70b-instruct, meta/llama-3.1-8b-instruct, mistralai/mistral-large, etc.
    this.model = process.env.NEMOTRON_MODEL || 'meta/llama-3.1-70b-instruct';
  }

  async analyzeMemory(memory) {
    try {
      const prompt = this.buildPrompt(memory);
      const response = await this.callNemotronAPI(prompt);
      return this.parseResponse(response, memory);
    } catch (error) {
      console.error(`Error analyzing memory ${memory.id}:`, error);
      // Fallback to basic analysis if API fails
      return this.fallbackAnalysis(memory);
    }
  }

  buildPrompt(memory) {
    const age = typeof memory.age === 'number' ? memory.age : this.calculateAge(memory.createdAt);
    const content = memory.content || memory.summary || '';
    const type = memory.type || 'unknown';
    const tags = Array.isArray(memory.tags) && memory.tags.length > 0 ? memory.tags.join(', ') : 'none';
    const importance = memory.metadata?.importance || memory.metadata?.sentimentHint || memory.metadata?.topic || 'unspecified';
    const quality = this.describeQuality(memory);
    const attachments = this.describeAttachments(memory);
    const contextInsights = memory.contextSummary || this.contextualInsights(memory, age);
    
    return `You are an AI memory curator using NVIDIA Nemotron. Decide whether to KEEP, COMPRESS, or FORGET the memory using the provided context.

Memory Stats:
- Type: ${type}
- Age: ${age} months old
- Created: ${memory.createdAt ? new Date(memory.createdAt).toISOString() : 'unknown'}
- Tags: ${tags}
- Estimated size: ${memory.size || 'unknown'} bytes
- Source: ${memory.source || 'unknown'}
- Importance hints: ${importance}
- Quality assessment: ${quality}
${attachments ? `- Related files: ${attachments}` : ''}

Content Preview:
${content.substring(0, 1200)}

Contextual Insights:
${contextInsights}

Decision Principles:
- KEEP: Significant life events, irreplaceable childhood photos, high emotional attachment, or recently referenced documents.
- COMPRESS: Moderately important items that should be retained in smaller form (e.g., old but occasionally referenced research PDFs).
- FORGET: Blurry/low-quality images, outdated documents, redundant work emails, or items with low future relevance and attachment.

Analyze this memory and respond in JSON:
{
  "relevance1Month": number 0-1,
  "relevance1Year": number 0-1,
  "attachment": number 0-1,
  "action": "keep|compress|forget",
  "explanation": "1-2 sentence rationale referencing age/quality/importance",
  "sentiment": "positive|negative|neutral|mixed",
  "sentimentScore": number -1 to 1,
  "confidence": number 0-1
}`;
  }

  async callNemotronAPI(prompt) {
    if (!this.apiKey) {
      throw new Error('NEMOTRON_API_KEY is not set');
    }

    // Using NVIDIA NIM API format (OpenAI-compatible)
    const requestData = JSON.stringify({
      model: this.model,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      top_p: 0.9,
      max_tokens: 500,
      stream: false
    });

    return new Promise((resolve, reject) => {
      const url = new URL(`${this.apiUrl}/chat/completions`);
      
      const options = {
        hostname: url.hostname,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Length': Buffer.byteLength(requestData),
          'User-Agent': 'MemoryStorageApp/1.0'
        }
      };

      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            if (res.statusCode === 401 || res.statusCode === 403) {
              const errorDetail = data ? JSON.parse(data).detail || data : 'Unknown error';
              throw new Error(`API authentication failed (${res.statusCode}): ${errorDetail}. Please verify your NEMOTRON_API_KEY is valid and has access to the model.`);
            }
            if (res.statusCode === 404) {
              throw new Error(`Model not found: ${this.model}. Available models may include: meta/llama-3.1-70b-instruct, meta/llama-3.1-8b-instruct, mistralai/mistral-large`);
            }
            if (res.statusCode !== 200) {
              const errorMsg = data ? (JSON.parse(data).detail || data.substring(0, 200)) : 'Unknown error';
              throw new Error(`API error (${res.statusCode}): ${errorMsg}`);
            }
            const response = JSON.parse(data);
            resolve(response);
          } catch (error) {
            reject(error);
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`Network error: ${error.message}`));
      });

      req.setTimeout(30000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.write(requestData);
      req.end();
    });
  }

  parseResponse(response, memory) {
    try {
      // Extract the content from the API response
      const content = response.choices?.[0]?.message?.content || '';
      
      // Try to extract JSON from the response
      let analysis;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        // If no JSON found, try to parse the text response
        analysis = this.parseTextResponse(content);
      }

      const relevance1Month = this.toNumber(analysis.relevance1Month, 0.5);
      const relevance1Year = this.toNumber(analysis.relevance1Year, 0.5);
      const attachment = this.toNumber(analysis.attachment, 0.5);
      const sentimentScore = this.toNumber(analysis.sentimentScore, 0);

      return {
        relevance1Month,
        relevance1Year,
        attachment,
        predictedAction: (analysis.action || '').toLowerCase() || 'keep',
        sentiment: {
          label: (analysis.sentiment || 'neutral').toLowerCase(),
          score: sentimentScore
        },
        explanation: analysis.explanation || 'Analyzed by Nemotron',
        confidence: this.toNumber(analysis.confidence, 0.6),
        nemotronAnalyzed: true,
        nemotronUpdatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error parsing Nemotron response:', error);
      return this.fallbackAnalysis(memory);
    }
  }

  parseTextResponse(content) {
    // Fallback parser for non-JSON responses
    const result = {
      relevance1Month: 0.5,
      relevance1Year: 0.5,
      attachment: 0.5,
      action: 'keep',
      sentiment: 'neutral',
      sentimentScore: 0,
      explanation: content.substring(0, 200)
    };

    // Try to extract action
    const actionMatch = content.toLowerCase().match(/(keep|compress|forget)/);
    if (actionMatch) {
      result.action = actionMatch[1];
    }

    // Try to extract scores
    const scoreMatches = content.match(/(\d+\.?\d*)/g);
    if (scoreMatches && scoreMatches.length >= 3) {
      result.relevance1Month = Math.min(1, Math.max(0, parseFloat(scoreMatches[0])));
      result.relevance1Year = Math.min(1, Math.max(0, parseFloat(scoreMatches[1])));
      result.attachment = Math.min(1, Math.max(0, parseFloat(scoreMatches[2])));
    }

    return result;
  }

  fallbackAnalysis(memory) {
    // Fallback to rule-based analysis if API is unavailable
    const age = this.calculateAge(memory.createdAt);
    let relevance1Month = 0.5;
    let relevance1Year = 0.5;
    let attachment = 0.5;
    let action = 'keep';
    let explanation = 'Fallback analysis (Nemotron unavailable)';

    // Simple heuristics
    if (age > 24) {
      relevance1Year = 0.2;
      relevance1Month = 0.3;
    } else if (age > 12) {
      relevance1Year = 0.4;
      relevance1Month = 0.6;
    } else {
      relevance1Year = 0.7;
      relevance1Month = 0.8;
    }

    // Determine action
    if (relevance1Year < 0.2 && age > 24) {
      action = 'forget';
    } else if (relevance1Month < 0.4 || relevance1Year < 0.3) {
      action = 'compress';
    } else {
      action = 'keep';
    }

    if (memory.metadata?.imageQuality === 'blurry' || memory.metadata?.flags?.includes('blurry')) {
      relevance1Year = Math.min(relevance1Year, 0.15);
      action = 'forget';
      explanation = 'Marked as blurry/low quality';
    }

    if ((memory.tags || []).some(tag => ['childhood', 'family', 'wedding'].includes(tag))) {
      attachment = Math.max(attachment, 0.85);
      relevance1Year = Math.max(relevance1Year, 0.6);
      action = action === 'forget' ? 'compress' : 'keep';
      explanation = 'Family/childhood memory prioritized for retention';
    }

    return {
      relevance1Month,
      relevance1Year,
      attachment,
      predictedAction: action,
      sentiment: { label: 'neutral', score: 0 },
      explanation,
      confidence: 0.4,
      nemotronAnalyzed: false,
      nemotronUpdatedAt: new Date().toISOString()
    };
  }

  calculateAge(createdAt) {
    const now = new Date();
    const created = new Date(createdAt);
    const diffTime = Math.abs(now - created);
    return Math.floor(diffTime / (1000 * 60 * 60 * 24 * 30));
  }

  describeQuality(memory) {
    const metadata = memory.metadata || {};
    if (metadata.imageQuality) {
      return `image quality flagged as ${metadata.imageQuality}`;
    }
    if (metadata.qualityHint) {
      return metadata.qualityHint;
    }
    if (metadata.flags?.includes('blurry')) {
      return 'blurry/low clarity';
    }
    if (metadata.resolution) {
      return `resolution ${metadata.resolution}`;
    }
    return 'no explicit quality notes';
  }

  describeAttachments(memory) {
    if (memory.metadata?.attachmentSummary?.length) {
      return memory.metadata.attachmentSummary.join(', ');
    }
    if (Array.isArray(memory.relatedFiles) && memory.relatedFiles.length > 0) {
      return memory.relatedFiles.join(', ');
    }
    return '';
  }

  contextualInsights(memory, age) {
    const lines = [];
    if (memory.metadata?.imageQuality === 'blurry') {
      lines.push('- Flagged as blurry image (candidate for deletion unless historically important).');
    }
    if ((memory.tags || []).includes('childhood')) {
      lines.push('- Tagged as childhood memory (high sentimental value).');
    }
    if (age > 36 && memory.type === 'document') {
      lines.push('- Old document; check if still referenced before keeping.');
    } else if (age <= 6 && memory.type !== 'image') {
      lines.push('- Recently created; likely still relevant.');
    }
    if (memory.metadata?.topic) {
      lines.push(`- Topic focus: ${memory.metadata.topic}.`);
    }
    if (memory.metadata?.sentimentHint) {
      lines.push(`- Sentiment hint from user metadata: ${memory.metadata.sentimentHint}.`);
    }

    if (lines.length === 0) {
      lines.push('- No additional context flags.');
    }

    return lines.join('\n');
  }

  toNumber(value, fallback) {
    if (value === null || value === undefined) return fallback;
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (Number.isNaN(num)) return fallback;
    return Math.max(0, Math.min(1, num));
  }

  async analyzeBatch(memories) {
    // Analyze memories in batches to avoid rate limits
    const batchSize = 5;
    const results = [];

    for (let i = 0; i < memories.length; i += batchSize) {
      const batch = memories.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(memory => this.analyzeMemory(memory))
      );
      results.push(...batchResults);

      // Add a small delay between batches to avoid rate limiting
      if (i + batchSize < memories.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  }
}

module.exports = NemotronAgent;

