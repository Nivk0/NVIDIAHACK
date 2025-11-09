const https = require('https');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

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
    
    // Deterministic temperature for consistent results
    this.temperature = parseFloat(process.env.NEMOTRON_TEMPERATURE || '0');
    
    // In-memory cache for fast lookups
    this.memoryCache = new Map();
    
    // Cache directory
    this.cacheDir = path.join(__dirname, '../data/analysis-cache');
    
    // Ensure cache directory exists
    this.ensureCacheDir();
  }

  async ensureCacheDir() {
    try {
      await fs.mkdir(this.cacheDir, { recursive: true });
    } catch (error) {
      // Directory might already exist, that's fine
    }
  }

  generateContentHash(memory) {
    // Create a deterministic hash based on content and key metadata
    const hashInput = JSON.stringify({
      type: memory.type || 'unknown',
      content: memory.content || memory.summary || '',
      filename: memory.filename || memory.title || '',
      createdAt: memory.createdAt || '',
      size: memory.size || 0,
      metadata: memory.metadata || {},
      tags: memory.tags || []
    });
    return crypto.createHash('sha256').update(hashInput).digest('hex').substring(0, 16);
  }

  generateSeed(contentHash) {
    // Convert hex hash to integer seed (0-2147483647)
    return parseInt(contentHash, 16) % 2147483647;
  }

  getCacheKey(memory) {
    return this.generateContentHash(memory);
  }

  async getCachedAnalysis(memory) {
    const cacheKey = this.getCacheKey(memory);
    
    // Check in-memory cache first
    if (this.memoryCache.has(cacheKey)) {
      const cached = this.memoryCache.get(cacheKey);
      const age = Date.now() - cached.timestamp;
      const ttl = 7 * 24 * 60 * 60 * 1000; // 7 days
      if (age < ttl) {
        console.log(`[Nemotron] Using in-memory cached analysis for ${memory.id}`);
        return cached.result;
      }
      this.memoryCache.delete(cacheKey);
    }
    
    // Check disk cache
    try {
      const cacheFilePath = path.join(this.cacheDir, `${cacheKey}.json`);
      const cacheContent = await fs.readFile(cacheFilePath, 'utf8');
      const cache = JSON.parse(cacheContent);
      
      const age = Date.now() - cache.timestamp;
      const ttl = 7 * 24 * 60 * 60 * 1000; // 7 days
      if (age < ttl) {
        console.log(`[Nemotron] Using disk cached analysis for ${memory.id}`);
        // Store in memory cache for faster access
        this.memoryCache.set(cacheKey, cache);
        return cache.result;
      } else {
        // Cache expired, delete it
        await fs.unlink(cacheFilePath).catch(() => {});
      }
    } catch (error) {
      // Cache file doesn't exist or is invalid, that's fine
    }
    
    return null;
  }

  async setCachedAnalysis(memory, result) {
    const cacheKey = this.getCacheKey(memory);
    const cache = {
      timestamp: Date.now(),
      result: result
    };
    
    // Store in memory cache
    this.memoryCache.set(cacheKey, cache);
    
    // Store on disk
    try {
      const cacheFilePath = path.join(this.cacheDir, `${cacheKey}.json`);
      await fs.writeFile(cacheFilePath, JSON.stringify(cache, null, 2));
    } catch (error) {
      console.error(`[Nemotron] Failed to write cache for ${memory.id}:`, error.message);
    }
  }

  async generateSummary(memory) {
    try {
      const age = typeof memory.age === 'number' ? memory.age : this.calculateAge(memory.createdAt);
      const content = memory.content || '';
      const type = memory.type || 'unknown';
      const title = memory.title || memory.summary || '';
      
      // Create a focused prompt just for summary generation
      const summaryPrompt = `You are an AI assistant that creates concise, informative summaries of documents and files.

Your task: Analyze the content below and create a clear 2-3 sentence summary that describes what this document/memory actually is.

CRITICAL INSTRUCTIONS:
- DO NOT copy the first lines verbatim
- DO NOT quote the content directly
- Analyze the ENTIRE content and synthesize a summary
- Write in your own words as a description, not an excerpt

Content Type: ${type}
${title ? `Title/Subject: ${title}` : ''}
Content Length: ${content.length} characters

Content to analyze:
${content.substring(0, 3000)}

Now create a 2-3 sentence summary that:
1. Describes what this document/memory is
2. Explains its main purpose or content
3. Highlights key information

Respond with ONLY the summary text, no JSON, no quotes, just the summary:`;

      const response = await this.callNemotronAPI(summaryPrompt);
      const summaryText = response.choices?.[0]?.message?.content || '';
      
      // Clean up the summary (remove quotes, JSON markers, etc.)
      let cleanedSummary = summaryText.trim();
      // Remove JSON markers if present
      cleanedSummary = cleanedSummary.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '');
      // Remove quotes if the entire response is quoted
      if ((cleanedSummary.startsWith('"') && cleanedSummary.endsWith('"')) ||
          (cleanedSummary.startsWith("'") && cleanedSummary.endsWith("'"))) {
        cleanedSummary = cleanedSummary.slice(1, -1);
      }
      // Remove "summary:" prefix if present
      cleanedSummary = cleanedSummary.replace(/^summary\s*:?\s*/i, '');
      
      return cleanedSummary.trim() || null;
    } catch (error) {
      console.error(`Error generating summary for memory ${memory.id}:`, error);
      return null;
    }
  }

  async analyzeMemory(memory) {
    try {
      // Check cache first
      const cached = await this.getCachedAnalysis(memory);
      if (cached) {
        return cached;
      }
      
      // First generate a proper summary
      const generatedSummary = await this.generateSummary(memory);
      
      // Then do the full analysis with the generated summary
      const prompt = await this.buildPrompt(memory);
      const contentHash = this.generateContentHash(memory);
      const seed = this.generateSeed(contentHash);
      const response = await this.callNemotronAPI(prompt, seed);
      const analysis = this.parseResponse(response, memory);
      
      // Use the generated summary if available, otherwise use what Nemotron returned
      if (generatedSummary && generatedSummary.length > 20) {
        analysis.summary = generatedSummary;
      }
      
      // Round values for consistency
      analysis.relevance1Month = Math.round(analysis.relevance1Month * 100) / 100;
      analysis.relevance1Year = Math.round(analysis.relevance1Year * 100) / 100;
      analysis.attachment = Math.round(analysis.attachment * 100) / 100;
      analysis.confidence = Math.round(analysis.confidence * 100) / 100;
      if (analysis.sentiment?.score !== undefined) {
        analysis.sentiment.score = Math.round(analysis.sentiment.score * 100) / 100;
      }
      
      // Cache the result
      await this.setCachedAnalysis(memory, analysis);
      
      return analysis;
    } catch (error) {
      console.error(`Error analyzing memory ${memory.id}:`, error);
      // Fallback to basic analysis if API fails
      return this.fallbackAnalysis(memory);
    }
  }

  async getUserProfile() {
    try {
      const profilePath = path.join(__dirname, '../data/user-profile.json');
      const content = await fs.readFile(profilePath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      // Profile doesn't exist, return null
      return null;
    }
  }

  formatUserProfile(profile) {
    if (!profile) return '';
    
    const parts = [];
    if (profile.age) parts.push(`Age: ${profile.age}`);
    if (profile.lifeStage) parts.push(`Life Stage: ${profile.lifeStage}`);
    if (profile.isStudent) parts.push('Currently a student');
    if (profile.educationLevel) parts.push(`Education: ${profile.educationLevel}`);
    if (profile.occupation) parts.push(`Occupation: ${profile.occupation}`);
    if (profile.location) parts.push(`Location: ${profile.location}`);
    if (profile.interests && profile.interests.length > 0) {
      parts.push(`Interests: ${profile.interests.join(', ')}`);
    }
    if (profile.notes) parts.push(`Additional context: ${profile.notes}`);
    
    return parts.length > 0 ? parts.join('\n') : '';
  }

  async buildPrompt(memory) {
    const age = typeof memory.age === 'number' ? memory.age : this.calculateAge(memory.createdAt);
    const content = memory.content || memory.summary || '';
    const type = memory.type || 'unknown';
    const tags = Array.isArray(memory.tags) && memory.tags.length > 0 ? memory.tags.join(', ') : 'none';
    const importance = memory.metadata?.importance || memory.metadata?.sentimentHint || memory.metadata?.topic || 'unspecified';
    const quality = this.describeQuality(memory);
    const attachments = this.describeAttachments(memory);
    const contextInsights = memory.contextSummary || this.contextualInsights(memory, age);
    
    // Load user profile for personalized analysis
    const userProfile = await this.getUserProfile();
    const profileContext = this.formatUserProfile(userProfile);
    
    // Calculate quantitative metrics
    const contentLength = content.length;
    const wordCount = content.split(/\s+/).filter(w => w.length > 0).length;
    const hasSummary = !!(memory.summary && memory.summary.length > 10);
    const metadataCount = memory.metadata ? Object.keys(memory.metadata).length : 0;
    const tagsCount = Array.isArray(memory.tags) ? memory.tags.length : 0;
    
    // Age categorization
    let ageCategory = 'recent';
    let recencyScore = 10;
    if (age > 24) {
      ageCategory = 'old';
      recencyScore = 2;
    } else if (age > 12) {
      ageCategory = 'medium';
      recencyScore = 5;
    } else if (age > 6) {
      ageCategory = 'recent';
      recencyScore = 7;
    }
    
    return `You are an AI memory curator using NVIDIA Nemotron. Analyze this memory and provide a structured assessment.

${profileContext ? `=== USER CONTEXT ===
${profileContext}

Use this context to personalize your analysis. Consider:
- Life stage and current priorities
- Interests and hobbies
- Professional/academic context
- Personal relationships and values

` : ''}=== MEMORY INFORMATION ===

Basic Stats:
- Type: ${type}
- Age: ${age} months old (${ageCategory})
- Created: ${memory.createdAt ? new Date(memory.createdAt).toISOString() : 'unknown'}
- Size: ${memory.size ? this.formatBytes(memory.size) : 'unknown'}
- Source: ${memory.source || 'unknown'}

Content Metrics:
- Content Length: ${contentLength} characters
- Word Count: ${wordCount} words
- Has Summary: ${hasSummary ? 'Yes' : 'No'}
- Metadata Fields: ${metadataCount}
- Tags: ${tagsCount > 0 ? tags.join(', ') : 'none'}

Quality & Context:
- Quality: ${quality}
- Importance Hints: ${importance}
${attachments ? `- Related Files: ${attachments}` : ''}

Content Preview (first 2000 characters - analyze to understand what this is):
${content.substring(0, 2000)}
${content.length > 2000 ? '\n[... content truncated ...]' : ''}

Contextual Insights:
${contextInsights}

=== ANALYSIS FRAMEWORK ===

Evaluate using these 5 factors (each 0-1 scale):

1. TEMPORAL RELEVANCE
   - Recent items (0-6 months): High relevance
   - Medium age (6-12 months): Moderate relevance
   - Old items (12+ months): Lower relevance unless historically significant
   - Recency Score: ${recencyScore}/10

2. CONTENT VALUE
   - Quality and completeness
   - Information density
   - Uniqueness of information
   - Practical utility

3. EMOTIONAL/SENTIMENTAL VALUE
   - Personal significance
   - Emotional attachment
   - Sentimental importance
   - Relationship to important people/events

4. PRACTICAL UTILITY
   - Likelihood of future reference
   - Professional/academic value
   - Legal or financial importance
   - Actionable information

5. UNIQUENESS
   - Is this information available elsewhere?
   - Is it redundant with other memories?
   - Is it replaceable?

=== ACTION DECISION RULES ===

KEEP: High scores across multiple factors, especially:
- Recent items with high content value
- Items with high emotional attachment
- Unique, irreplaceable memories
- Items highly relevant to user's current context/interests

COMPRESS: Moderate importance but lower future relevance:
- Old but occasionally referenced documents
- Items with moderate value but high storage cost
- Documents related to past but not current interests

LOW_RELEVANCE: Low scores across most factors:
- Blurry/low-quality images
- Outdated documents
- Redundant work emails
- Items with low future relevance

DELETE: Very low scores across all factors:
- Completely outdated items
- Highly redundant content
- Items unrelated to user's current life stage/interests
- Very low quality with no sentimental value

=== RESPONSE FORMAT ===

Respond with ONLY valid JSON (no markdown, no code blocks, no extra text):

{
  "summary": "A clear 2-3 sentence summary describing what this memory actually is. For images: describe what's visible, who/what, setting, mood. For documents: main topic, purpose, key findings. For emails: sender, recipient, subject, main message. DO NOT copy content verbatim - write a true summary.",
  "relevance1Month": 0.75,
  "relevance1Year": 0.60,
  "attachment": 0.65,
  "action": "keep",
  "explanation": "2-3 sentences explaining the decision. Be specific: reference age (${age} months), content type (${type}), relevance scores, emotional factors, quality, and how it relates to user context. Example: 'This ${age}-month-old ${type} has moderate relevance (${ageCategory} age) with ${hasSummary ? 'good' : 'limited'} context. The content suggests [specific reason]. Given the user's [context], this should be [action] because [specific factor].'",
  "sentiment": "positive",
  "sentimentScore": 0.3,
  "confidence": 0.85
}

IMPORTANT:
- All numbers must be between 0-1 (except sentimentScore: -1 to 1)
- Action must be exactly: "keep", "compress", "low_relevance", or "delete"
- Sentiment must be exactly: "positive", "negative", "neutral", or "mixed"
- Provide specific, actionable explanations
- Be consistent: similar memories should get similar scores`;
  }

  async callNemotronAPI(prompt, seed = null) {
    if (!this.apiKey) {
      throw new Error('NEMOTRON_API_KEY is not set');
    }

    // Using NVIDIA NIM API format (OpenAI-compatible)
    const requestBody = {
      model: this.model,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: this.temperature,
      top_p: 0.9,
      max_tokens: 800, // Increased for better explanations
      stream: false
    };
    
    // Add seed for deterministic results if provided
    if (seed !== null) {
      requestBody.seed = seed;
    }
    
    const requestData = JSON.stringify(requestBody);

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
      let content = response.choices?.[0]?.message?.content || '';
      
      // Clean up the content - remove markdown code blocks if present
      content = content.trim();
      if (content.startsWith('```json')) {
        content = content.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
      } else if (content.startsWith('```')) {
        content = content.replace(/^```\s*/i, '').replace(/\s*```$/i, '');
      }
      
      // Try to extract JSON from the response
      let analysis;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          analysis = JSON.parse(jsonMatch[0]);
        } catch (parseError) {
          console.error('[Nemotron] JSON parse error, trying text parsing:', parseError.message);
          analysis = this.parseTextResponse(content);
        }
      } else {
        // If no JSON found, try to parse the text response
        console.warn('[Nemotron] No JSON found in response, using text parser');
        analysis = this.parseTextResponse(content);
      }

      // Validate and normalize the analysis
      const relevance1Month = this.toNumber(analysis.relevance1Month, 0.5);
      const relevance1Year = this.toNumber(analysis.relevance1Year, 0.5);
      const attachment = this.toNumber(analysis.attachment, 0.5);
      const sentimentScore = this.toNumber(analysis.sentimentScore, 0, -1, 1);

      let predictedAction = (analysis.action || '').toLowerCase().trim() || 'keep';
      // Normalize old "forget" to "low_relevance"
      if (predictedAction === 'forget') {
        predictedAction = 'low_relevance';
      }
      // Validate action is one of the allowed values
      const validActions = ['keep', 'compress', 'low_relevance', 'delete'];
      if (!validActions.includes(predictedAction)) {
        console.warn(`[Nemotron] Invalid action "${predictedAction}", defaulting to "keep"`);
        predictedAction = 'keep';
      }

      // Extract and clean summary
      let nemotronSummary = analysis.summary || null;
      if (nemotronSummary && typeof nemotronSummary === 'string') {
        nemotronSummary = nemotronSummary.trim();
        // Remove quotes if the entire summary is quoted
        if ((nemotronSummary.startsWith('"') && nemotronSummary.endsWith('"')) ||
            (nemotronSummary.startsWith("'") && nemotronSummary.endsWith("'"))) {
          nemotronSummary = nemotronSummary.slice(1, -1);
        }
        // Remove "summary:" prefix if present
        nemotronSummary = nemotronSummary.replace(/^summary\s*:?\s*/i, '').trim();
        if (nemotronSummary.length < 10) {
          nemotronSummary = null; // Too short to be useful
        }
      }

      // Extract and clean explanation
      let explanation = analysis.explanation || 'Analyzed by Nemotron';
      if (typeof explanation === 'string') {
        explanation = explanation.trim();
        if (explanation.length < 20) {
          // Generate a better explanation from the data
          explanation = this.generateExplanation(memory, predictedAction, relevance1Month, relevance1Year, attachment);
        }
      }

      // Validate sentiment
      const validSentiments = ['positive', 'negative', 'neutral', 'mixed'];
      let sentimentLabel = (analysis.sentiment || 'neutral').toLowerCase().trim();
      if (!validSentiments.includes(sentimentLabel)) {
        sentimentLabel = 'neutral';
      }

      return {
        relevance1Month,
        relevance1Year,
        attachment,
        predictedAction,
        summary: nemotronSummary,
        sentiment: {
          label: sentimentLabel,
          score: sentimentScore
        },
        explanation: explanation,
        confidence: this.toNumber(analysis.confidence, 0.6),
        nemotronAnalyzed: true,
        nemotronUpdatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('[Nemotron] Error parsing response:', error);
      return this.fallbackAnalysis(memory);
    }
  }

  generateExplanation(memory, action, relevance1Month, relevance1Year, attachment) {
    const age = typeof memory.age === 'number' ? memory.age : this.calculateAge(memory.createdAt);
    const actionName = action === 'low_relevance' ? 'Low Future Relevance' :
                      action.charAt(0).toUpperCase() + action.slice(1);
    
    const reasons = [];
    if (relevance1Year < 0.3) {
      reasons.push(`low long-term relevance (${Math.round(relevance1Year * 100)}%)`);
    }
    if (age > 24) {
      reasons.push(`age of ${age} months`);
    }
    if (attachment < 0.3) {
      reasons.push(`low emotional attachment (${Math.round(attachment * 100)}%)`);
    }
    if (memory.metadata?.imageQuality === 'blurry') {
      reasons.push('low image quality');
    }
    
    const reasonText = reasons.length > 0 
      ? ` due to ${reasons.join(', ')}`
      : ` based on relevance scores (${Math.round(relevance1Month * 100)}% 1-month, ${Math.round(relevance1Year * 100)}% 1-year)`;
    
    return `This ${age}-month-old ${memory.type || 'memory'} is recommended for ${actionName}${reasonText}.`;
  }

  toNumber(value, fallback, min = 0, max = 1) {
    if (value === null || value === undefined) return fallback;
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (Number.isNaN(num)) return fallback;
    return Math.max(min, Math.min(max, num));
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
    const actionMatch = content.toLowerCase().match(/(keep|compress|low_relevance|forget|delete)/);
    if (actionMatch) {
      let action = actionMatch[1];
      // Normalize old "forget" to "low_relevance"
      if (action === 'forget') {
        action = 'low_relevance';
      }
      result.action = action;
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
      action = 'low_relevance';
    } else if (relevance1Month < 0.4 || relevance1Year < 0.3) {
      action = 'compress';
    } else {
      action = 'keep';
    }

    if (memory.metadata?.imageQuality === 'blurry' || memory.metadata?.flags?.includes('blurry')) {
      relevance1Year = Math.min(relevance1Year, 0.15);
      action = 'low_relevance';
      explanation = 'Marked as blurry/low quality';
    }

    if ((memory.tags || []).some(tag => ['childhood', 'family', 'wedding'].includes(tag))) {
      attachment = Math.max(attachment, 0.85);
      relevance1Year = Math.max(relevance1Year, 0.6);
      action = action === 'low_relevance' ? 'compress' : 'keep';
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

  formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
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

