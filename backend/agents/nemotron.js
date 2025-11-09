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
    const age = this.calculateAge(memory.createdAt);
    const content = memory.content || memory.summary || '';
    const type = memory.type || 'unknown';
    
    return `You are an AI memory management assistant. Analyze the following memory and determine the best action: keep, compress, or forget.

Memory Details:
- Type: ${type}
- Age: ${age} months old
- Created: ${new Date(memory.createdAt).toLocaleDateString()}
- Content: ${content.substring(0, 1000)}
${memory.summary ? `- Summary: ${memory.summary}` : ''}

Guidelines:
- KEEP: Important, meaningful memories with high emotional value, recent documents needed for reference, or significant life events
- COMPRESS: Moderately important memories that could be stored more efficiently, older but still relevant content
- FORGET: Outdated information, irrelevant content, duplicates, or memories with no future value

Analyze this memory and provide:
1. A relevance score (0.0 to 1.0) for 1 month from now
2. A relevance score (0.0 to 1.0) for 1 year from now
3. An attachment level (0.0 to 1.0) indicating emotional/sentimental value
4. The recommended action: "keep", "compress", or "forget"
5. A brief explanation (1-2 sentences)

Respond in JSON format:
{
  "relevance1Month": 0.0-1.0,
  "relevance1Year": 0.0-1.0,
  "attachment": 0.0-1.0,
  "action": "keep|compress|forget",
  "explanation": "brief explanation",
  "sentiment": "positive|negative|neutral",
  "sentimentScore": -1.0 to 1.0
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

      return {
        relevance1Month: analysis.relevance1Month || 0.5,
        relevance1Year: analysis.relevance1Year || 0.5,
        attachment: analysis.attachment || 0.5,
        predictedAction: analysis.action || 'keep',
        sentiment: {
          label: analysis.sentiment || 'neutral',
          score: analysis.sentimentScore || 0
        },
        explanation: analysis.explanation || 'Analyzed by Nemotron',
        nemotronAnalyzed: true
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

    return {
      relevance1Month,
      relevance1Year,
      attachment,
      predictedAction: action,
      sentiment: { label: 'neutral', score: 0 },
      explanation: 'Fallback analysis (Nemotron API unavailable)',
      nemotronAnalyzed: false
    };
  }

  calculateAge(createdAt) {
    const now = new Date();
    const created = new Date(createdAt);
    const diffTime = Math.abs(now - created);
    return Math.floor(diffTime / (1000 * 60 * 60 * 24 * 30));
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

