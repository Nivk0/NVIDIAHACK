const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const NemotronAgent = require('../agents/nemotron');

const router = express.Router();
const MEMORIES_DIR = path.join(__dirname, '../data/memories');

// Load all memories
async function loadAllMemories() {
  try {
    const files = await fs.readdir(MEMORIES_DIR);
    const allMemories = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const content = await fs.readFile(path.join(MEMORIES_DIR, file), 'utf8');
          const memories = JSON.parse(content);
          allMemories.push(...memories);
        } catch (error) {
          console.error(`Error reading memory file ${file}:`, error);
        }
      }
    }

    return allMemories;
  } catch (error) {
    return [];
  }
}

// AI-powered search endpoint
router.post('/', async (req, res) => {
  try {
    const { query } = req.body;

    if (!query || typeof query !== 'string' || !query.trim()) {
      return res.status(400).json({ error: 'Query is required' });
    }

    // Load all memories
    const allMemories = await loadAllMemories();

    if (allMemories.length === 0) {
      return res.json({
        results: [],
        explanation: 'No memories available to search.'
      });
    }

    // Use RAG (Retrieval-Augmented Generation) with Nemotron for semantic search
    const nemotron = new NemotronAgent();
    
    // Step 1: Use Nemotron to understand the query semantically with STRICT type filtering
    const queryUnderstandingPrompt = `You are an AI assistant performing semantic search. Analyze the user's search query and extract EXACT requirements.

User's search query: "${query}"

CRITICAL RULES:
1. If the query mentions "photo", "image", "picture", "photo", "jpg", "png", "gif" → requiredType MUST be "image"
2. If the query mentions "document", "pdf", "file", "doc", "text" → requiredType MUST be "document"
3. If the query mentions "email", "message" → requiredType MUST be "email" or "chat"
4. If NO specific type is mentioned → requiredType is null (all types allowed)
5. Be STRICT - if user asks for photos, ONLY return photos. If user asks for documents, ONLY return documents.

SPECIAL QUERY TYPES:
- If query mentions "blank", "empty", "void", "no content", "minimal content", "sparse" → this is a CONTENT QUALITY filter
- These queries are looking for documents/files with little or no meaningful content
- Add "blank", "empty", "void", "minimal" to relatedConcepts and searchKeywords
- Set a flag: "requiresBlankContent": true

ACTION FILTERING (CRITICAL - BE VERY STRICT):
- If query mentions ANY of: "delete", "should delete", "to delete", "need to delete", "memories to delete", "docs to delete", "files to delete", "should be deleted", "want to delete" → requiredAction MUST be "delete"
- If query mentions ANY of: "forget", "should forget", "to forget", "need to forget", "memories to forget", "low relevance", "low future relevance" → requiredAction MUST be "low_relevance"
- If query mentions ANY of: "compress", "should compress", "to compress", "need to compress", "memories to compress" → requiredAction MUST be "compress"
- If query mentions ANY of: "keep", "should keep", "to keep", "need to keep", "memories to keep" → requiredAction MUST be "keep"
- If NO specific action is mentioned → requiredAction is null (all actions allowed)
- Be EXTREMELY STRICT - if user asks for "docs I should delete" or "memories to delete", ONLY return memories with action="delete"
- Check for phrases like "I should delete", "should I delete", "to delete", "need to delete" - these ALL mean requiredAction="delete"

Your task:
1. Identify the PRIMARY subject/topic
2. Determine if a SPECIFIC document type is required (photo/image, document/pdf, email, etc.)
3. Determine if a SPECIFIC action is required (delete, low_relevance, compress, keep)
4. Extract ALL relevant keywords that would appear in matching content
5. Identify any other filters (date, etc.)

Respond ONLY with valid JSON (no markdown, no code blocks):
{
  "mainTopic": "the exact primary subject",
  "requiredType": "image|document|email|chat|text|null (STRICT - only set if explicitly mentioned)",
  "requiredAction": "delete|low_relevance|compress|keep|null (STRICT - only set if explicitly mentioned)",
  "relatedConcepts": ["keywords", "synonyms", "related", "terms"],
  "searchKeywords": ["all", "keywords", "for", "matching"],
  "explanation": "What the user is searching for",
  "strictTypeFilter": true/false (true if type is explicitly required),
  "strictActionFilter": true/false (true if action is explicitly required),
  "requiresBlankContent": true/false (true if query is about blank/empty/minimal content documents)
}`;

    let queryUnderstanding = null;
    let explanation = `Searching for: ${query}`;

    try {
      const response = await nemotron.callNemotronAPI(queryUnderstandingPrompt);
      const content = response.choices?.[0]?.message?.content || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        queryUnderstanding = JSON.parse(jsonMatch[0]);
        explanation = queryUnderstanding.explanation || explanation;
      }
    } catch (error) {
      console.error('Error understanding query:', error.message);
    }

    // Step 2: STRICT pre-filtering based on type requirements
    const batchSize = 5;
    const semanticScores = new Map();
    
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 1);
    const allSearchTerms = [
      ...queryWords,
      ...(queryUnderstanding?.relatedConcepts || []),
      ...(queryUnderstanding?.searchKeywords || [])
    ].map(t => t.toLowerCase()).filter((v, i, a) => a.indexOf(v) === i);
    
    // STRICT type and action filtering first
    let typeFilteredMemories = allMemories;
    if (queryUnderstanding?.requiredType && queryUnderstanding?.strictTypeFilter) {
      const requiredType = queryUnderstanding.requiredType.toLowerCase();
      typeFilteredMemories = allMemories.filter(memory => {
        const memoryType = (memory.type || '').toLowerCase();
        // Map common types
        if (requiredType === 'image' || requiredType === 'photo' || requiredType === 'picture') {
          return memoryType === 'image' || memoryType === 'photo' || 
                 (memory.filename || '').toLowerCase().match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i) ||
                 (memory.metadata?.mimeType || '').toLowerCase().startsWith('image/');
        }
        if (requiredType === 'document' || requiredType === 'pdf' || requiredType === 'file') {
          return memoryType === 'document' || memoryType === 'pdf' ||
                 (memory.filename || '').toLowerCase().match(/\.(pdf|doc|docx|txt|rtf)$/i) ||
                 (memory.metadata?.mimeType || '').toLowerCase().includes('pdf') ||
                 (memory.metadata?.mimeType || '').toLowerCase().includes('document');
        }
        if (requiredType === 'email' || requiredType === 'message') {
          return memoryType === 'email' || memoryType === 'chat' || memoryType === 'message';
        }
        return memoryType === requiredType;
      });
      
      console.log(`Type filter: ${allMemories.length} → ${typeFilteredMemories.length} (required: ${queryUnderstanding.requiredType})`);
      
      // If type filter returns 0 results, warn but continue with all memories
      if (typeFilteredMemories.length === 0) {
        console.warn(`Type filter removed all memories. Continuing with all memories.`);
        typeFilteredMemories = allMemories;
      }
    }
    
    // STRICT action filtering - check query directly if AI didn't detect it
    let actionFilteredMemories = typeFilteredMemories;
    
    // Direct query check for action keywords (more reliable than AI detection)
    // Check for common patterns: "should delete", "to delete", "I should delete", "docs to delete", etc.
    let detectedAction = null;
    const deletePatterns = ['delete', 'should delete', 'to delete', 'i should delete', 'should be deleted', 'want to delete', 'need to delete'];
    const lowRelevancePatterns = ['forget', 'should forget', 'to forget', 'i should forget', 'low relevance', 'low future relevance'];
    const compressPatterns = ['compress', 'should compress', 'to compress', 'i should compress'];
    const keepPatterns = ['should keep', 'to keep', 'i should keep'];
    
    if (deletePatterns.some(pattern => queryLower.includes(pattern))) {
      detectedAction = 'delete';
      console.log(`Direct detection: Found DELETE action in query: "${query}"`);
    } else if (lowRelevancePatterns.some(pattern => queryLower.includes(pattern))) {
      detectedAction = 'low_relevance';
      console.log(`Direct detection: Found LOW_RELEVANCE action in query: "${query}"`);
    } else if (compressPatterns.some(pattern => queryLower.includes(pattern))) {
      detectedAction = 'compress';
      console.log(`Direct detection: Found COMPRESS action in query: "${query}"`);
    } else if (keepPatterns.some(pattern => queryLower.includes(pattern))) {
      detectedAction = 'keep';
      console.log(`Direct detection: Found KEEP action in query: "${query}"`);
    }
    
    // Use AI detection if available, otherwise use direct detection
    const requiredAction = queryUnderstanding?.requiredAction || detectedAction;
    const shouldFilterByAction = queryUnderstanding?.strictActionFilter || (detectedAction !== null);
    
    if (requiredAction && shouldFilterByAction) {
      const actionLower = requiredAction.toLowerCase();
      actionFilteredMemories = typeFilteredMemories.filter(memory => {
        const memoryAction = (memory.overrideAction || memory.predictedAction || memory.nemotronAnalysis?.action || 'keep').toLowerCase();
        const matches = memoryAction === actionLower;
        if (!matches) {
          console.log(`Filtering out memory ${memory.id}: action=${memoryAction}, required=${actionLower}`);
        }
        return matches;
      });
      
      console.log(`Action filter: ${typeFilteredMemories.length} → ${actionFilteredMemories.length} (required: ${requiredAction})`);
      
      // If action filter returns 0 results, that's OK - user asked for specific action
      if (actionFilteredMemories.length === 0) {
        console.warn(`Action filter removed all memories. User asked for ${requiredAction} but no memories have that action.`);
        // Don't fallback - return empty results if user specifically asked for an action that doesn't exist
      }
    }
    
    // Update the filtered set to use action-filtered memories
    typeFilteredMemories = actionFilteredMemories;
    
    // Special handling for blank/empty content queries
    const requiresBlankContent = queryUnderstanding?.requiresBlankContent || 
                                 queryLower.includes('blank') || 
                                 queryLower.includes('empty') ||
                                 queryLower.includes('void') ||
                                 queryLower.includes('no content') ||
                                 queryLower.includes('minimal content');
    
      // TIGHTER keyword-based pre-filtering - prioritize Nemotron summaries
    const preFilteredMemories = typeFilteredMemories.filter(memory => {
      // First check Nemotron summary/explanation for keyword matches (most reliable)
      const nemotronText = ((memory.nemotronAnalysis?.summary || '') + ' ' + (memory.nemotronAnalysis?.explanation || '')).toLowerCase();
      const nemotronMatches = queryWords.some(w => nemotronText.includes(w)) || 
                             allSearchTerms.some(t => nemotronText.includes(t.toLowerCase()));
      
      // Then check regular summary/content
      const searchText = [
        memory.title || '',
        memory.filename || '',
        memory.summary || '',
        memory.content || ''
      ].join(' ').toLowerCase();
      
      // Require matches in either Nemotron analysis OR regular content
      const hasMatch = nemotronMatches || 
                      queryWords.some(word => searchText.includes(word)) ||
                      allSearchTerms.some(term => searchText.includes(term.toLowerCase()));
      
      if (!hasMatch) return false;
      
      // Special filter for blank/empty content queries
      if (requiresBlankContent) {
        const contentLength = (memory.content || '').trim().length;
        const summaryLength = (memory.summary || '').trim().length;
        const titleLength = (memory.title || memory.filename || '').trim().length;
        
        // Consider blank/empty if:
        // - Content is very short (< 100 chars) AND summary is minimal (< 30 chars)
        // - Content is completely missing (0 chars) AND summary is short (< 50 chars)
        // - Has title/filename but content is minimal (< 50 chars)
        // - Content is just whitespace or very short text
        const isBlank = (contentLength < 100 && summaryLength < 30) || 
                       (contentLength === 0 && summaryLength < 50) ||
                       (titleLength > 0 && contentLength < 50 && summaryLength < 40) ||
                       (contentLength > 0 && contentLength < 30 && summaryLength < 20);
        
        if (!isBlank) {
          return false; // Skip non-blank documents for blank content queries
        }
      }
      
      // If strict type filter is active, be more lenient with keywords
      if (queryUnderstanding?.strictTypeFilter) {
        return nemotronMatches || 
               queryWords.some(word => searchText.includes(word)) ||
               allSearchTerms.some(term => searchText.includes(term.toLowerCase())) ||
               searchText.includes(queryLower);
      }
      
      // For blank content queries, don't require keyword matches in content (since content is blank)
      // But still check filename/title for type matches (e.g., "blank documents" should match document filenames)
      if (requiresBlankContent) {
        const filenameMatch = (memory.filename || '').toLowerCase().includes(queryLower) ||
                             queryWords.some(w => (memory.filename || '').toLowerCase().includes(w));
        const titleMatch = (memory.title || '').toLowerCase().includes(queryLower) ||
                          queryWords.some(w => (memory.title || '').toLowerCase().includes(w));
        // If query mentions a type (document, image, etc.), check if filename matches that type
        const typeMatch = queryUnderstanding?.requiredType ? 
          ((memory.type || '').toLowerCase() === queryUnderstanding.requiredType.toLowerCase()) : true;
        return filenameMatch || titleMatch || typeMatch; // Include if filename/title/type matches
      }
      
      // Otherwise, require keyword matches
      if (queryWords.length <= 2) {
        return searchText.includes(queryLower) || 
               allSearchTerms.some(term => searchText.includes(term));
      }
      
      return queryWords.some(word => searchText.includes(word)) ||
             allSearchTerms.some(term => searchText.includes(term));
    });

    // TIGHTER candidate selection - prioritize memories with Nemotron analysis and better keyword matches
    const candidatesToAnalyze = preFilteredMemories.length > 50 
      ? preFilteredMemories
          .sort((a, b) => {
            // Prioritize memories with Nemotron analysis (more reliable summaries)
            const aHasNemotron = !!(a.nemotronAnalysis?.summary || a.nemotronAnalysis?.explanation);
            const bHasNemotron = !!(b.nemotronAnalysis?.summary || b.nemotronAnalysis?.explanation);
            if (aHasNemotron !== bHasNemotron) return bHasNemotron ? 1 : -1;
            
            // Then prioritize by keyword matches in Nemotron summary/explanation
            const aNemotronText = ((a.nemotronAnalysis?.summary || '') + ' ' + (a.nemotronAnalysis?.explanation || '')).toLowerCase();
            const bNemotronText = ((b.nemotronAnalysis?.summary || '') + ' ' + (b.nemotronAnalysis?.explanation || '')).toLowerCase();
            const aNemotronMatches = queryWords.filter(w => aNemotronText.includes(w)).length;
            const bNemotronMatches = queryWords.filter(w => bNemotronText.includes(w)).length;
            if (aNemotronMatches !== bNemotronMatches) return bNemotronMatches - aNemotronMatches;
            
            // Then by title/summary match
            const aText = ((a.title || a.filename || '') + ' ' + (a.summary || '')).toLowerCase();
            const bText = ((b.title || b.filename || '') + ' ' + (b.summary || '')).toLowerCase();
            const aMatches = queryWords.filter(w => aText.includes(w)).length;
            const bMatches = queryWords.filter(w => bText.includes(w)).length;
            if (aMatches !== bMatches) return bMatches - aMatches;
            
            // Finally by relevance
            const relA = a.nemotronAnalysis?.relevance1Month ?? a.relevance1Month ?? 0.5;
            const relB = b.nemotronAnalysis?.relevance1Month ?? b.relevance1Month ?? 0.5;
            return relB - relA;
          })
          .slice(0, 50) // Reduced to 50 for tighter focus
      : preFilteredMemories;

    // Helper function to generate specific reason from memory content - prioritize Nemotron analysis
    const generateSpecificReason = (memory, query, queryWords, allSearchTerms, queryLower) => {
      const title = (memory.title || memory.filename || '').toLowerCase();
      const nemotronSummary = (memory.nemotronAnalysis?.summary || '').toLowerCase();
      const nemotronExplanation = (memory.nemotronAnalysis?.explanation || '').toLowerCase();
      const summary = (memory.summary || '').toLowerCase();
      const content = (memory.content || '').substring(0, 300).toLowerCase();
      const memoryType = memory.type || '';
      
      // PRIORITY 1: Check Nemotron summary/explanation (most reliable)
      if (nemotronSummary && nemotronSummary.includes(queryLower)) {
        const summaryPreview = (memory.nemotronAnalysis?.summary || '').substring(0, 150);
        return `Nemotron analysis summary directly matches "${query}": "${summaryPreview}${summaryPreview.length < (memory.nemotronAnalysis?.summary || '').length ? '...' : ''}"`;
      }
      
      if (nemotronExplanation && nemotronExplanation.includes(queryLower)) {
        const explanationPreview = (memory.nemotronAnalysis?.explanation || '').substring(0, 150);
        return `Nemotron analysis explanation matches "${query}": "${explanationPreview}${explanationPreview.length < (memory.nemotronAnalysis?.explanation || '').length ? '...' : ''}"`;
      }
      
      // Check for matched query words in Nemotron analysis
      const matchedWordsInNemotron = queryWords.filter(w => 
        nemotronSummary.includes(w) || nemotronExplanation.includes(w)
      );
      if (matchedWordsInNemotron.length > 0) {
        const location = nemotronSummary.includes(matchedWordsInNemotron[0]) ? 'Nemotron summary' : 'Nemotron explanation';
        return `Contains keywords "${matchedWordsInNemotron.join('", "')}" in ${location}${memoryType ? ` (${memoryType})` : ''}`;
      }
      
      // PRIORITY 2: Check for exact query match in title
      if (title.includes(queryLower)) {
        return `Title "${memory.title || memory.filename}" directly matches "${query}"`;
      }
      
      // PRIORITY 3: Check for exact query match in summary
      if (summary.includes(queryLower)) {
        const summaryPreview = (memory.summary || '').substring(0, 150);
        return `Summary contains "${query}": "${summaryPreview}${summaryPreview.length < (memory.summary || '').length ? '...' : ''}"`;
      }
      
      // Check for matched query words
      const matchedWords = queryWords.filter(w => 
        title.includes(w) || summary.includes(w) || content.includes(w)
      );
      if (matchedWords.length > 0) {
        const location = title.includes(matchedWords[0]) ? 'title' : 
                        summary.includes(matchedWords[0]) ? 'summary' : 'content';
        return `Contains keywords "${matchedWords.join('", "')}" in ${location}${memoryType ? ` (${memoryType})` : ''}`;
      }
      
      // Check for related terms
      const matchedTerms = allSearchTerms.filter(t => 
        title.includes(t.toLowerCase()) || summary.includes(t.toLowerCase()) || content.includes(t.toLowerCase())
      );
      if (matchedTerms.length > 0) {
        return `Matches related concepts: "${matchedTerms.slice(0, 3).join('", "')}"${memoryType ? ` (${memoryType} file)` : ''}`;
      }
      
      // Type-specific reasons
      if (queryLower.includes('photo') || queryLower.includes('image') || queryLower.includes('picture')) {
        if (memoryType === 'image' || (memory.filename || '').match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
          return `This is an image file (${memory.filename || memoryType}) matching your "${query}" search`;
        }
      }
      
      if (queryLower.includes('document') || queryLower.includes('pdf') || queryLower.includes('file')) {
        if (memoryType === 'document' || (memory.filename || '').match(/\.(pdf|doc|docx|txt)$/i)) {
          return `This is a document file (${memory.filename || memoryType}) matching your "${query}" search`;
        }
      }
      
      // Fallback with content preview
      if (summary.length > 0) {
        const summaryText = (memory.summary || '').substring(0, 120);
        return `Summary content suggests relevance to "${query}": "${summaryText}${summaryText.length < (memory.summary || '').length ? '...' : ''}"`;
      }
      
      if (content.length > 0) {
        const contentPreview = (memory.content || '').substring(0, 150);
        return `Content preview indicates relevance to "${query}": "${contentPreview}..."`;
      }
      
      // Last resort - use filename and type
      if (memory.filename) {
        return `File "${memory.filename}" (${memoryType || 'unknown type'}) appears relevant to "${query}" based on filename`;
      }
      
      return `Memory (${memoryType || 'unknown type'}) identified as relevant to "${query}" through content analysis`;
    };
    
    // Helper to check if reason is generic
    const isGenericReason = (reason) => {
      if (!reason || reason.trim() === '') return true;
      const genericPhrases = [
        'matches search criteria',
        'matches criteria',
        'analyzed by rag',
        'related content',
        'matches query',
        'content matches',
        'matches your search',
        'search criteria',
        'match your search',
        'match criteria'
      ];
      const reasonLower = reason.toLowerCase();
      // Check if it contains generic phrases AND is short (likely generic)
      // OR if it's just a very short reason (likely generic)
      return (genericPhrases.some(phrase => reasonLower.includes(phrase)) && reason.length < 80) ||
             (reason.length < 30 && !reason.includes('"') && !reason.includes(':')); // Very short without quotes or details
    };

    // Step 3: First pass - Semantic relevance check using RAG
    // Compare each document's summary to the query to determine if they're actually related
    console.log(`Performing semantic relevance check on ${candidatesToAnalyze.length} candidate memories...`);
    const semanticallyRelevantMemories = [];
    
    // Process in smaller batches for relevance checking
    const relevanceBatchSize = 10;
    for (let i = 0; i < candidatesToAnalyze.length; i += relevanceBatchSize) {
      const batch = candidatesToAnalyze.slice(i, i + relevanceBatchSize);
      
      const relevanceCheckPrompt = `You are performing STRICT semantic relevance checking. Your goal is to find documents that are VERY CLOSELY related to the user's query - not loosely related.

User's search query: "${query}"
${queryUnderstanding ? `
Query intent: ${queryUnderstanding.mainTopic}
Required concepts: ${queryUnderstanding.relatedConcepts.join(', ')}
Search keywords: ${queryUnderstanding.searchKeywords?.join(', ') || queryUnderstanding.relatedConcepts.join(', ')}
` : ''}
${(queryUnderstanding?.requiredAction && queryUnderstanding.strictActionFilter) || detectedAction ? `
⚠️ ACTION FILTER: User wants memories with action="${queryUnderstanding?.requiredAction || detectedAction}"
- ONLY mark documents as relevant if their action is "${queryUnderstanding?.requiredAction || detectedAction}"
- Check the document's predictedAction or overrideAction
- If action doesn't match, mark isRelevant=false
- This is CRITICAL - wrong action = not relevant
` : ''}

Documents to check:
${batch.map((mem, idx) => {
  const nemotronSummary = mem.nemotronAnalysis?.summary || mem.summary || '';
  const nemotronExplanation = mem.nemotronAnalysis?.explanation || '';
  const predictedAction = mem.overrideAction || mem.predictedAction || mem.nemotronAnalysis?.action || 'keep';
  return `
Document ${idx + 1}:
- Title: ${mem.title || mem.filename || 'Untitled'}
- Nemotron Summary: ${nemotronSummary.substring(0, 400)}
- Nemotron Analysis Explanation: ${nemotronExplanation.substring(0, 300)}
- Original Summary: ${(mem.summary || mem.content || '').substring(0, 300)}
- Type: ${mem.type}
- Predicted Action: ${predictedAction}
- Content Preview: ${(mem.content || '').substring(0, 200)}
`;
}).join('\n')}

CRITICAL RELEVANCE RULES - BE VERY STRICT:
1. The document's Nemotron summary OR explanation must DIRECTLY relate to the user's query topic
2. The document must be about the SAME specific subject/topic as the query - not just tangentially related
3. If the query mentions specific concepts, those concepts must appear in the summary/explanation/content
4. Generic or loosely related documents should be marked as NOT relevant
5. Only mark as relevant if there's a STRONG semantic match - the document should clearly address what the user is asking for

Examples:
- Query: "college projects" → Document about "CS4349 algorithms course project" = RELEVANT (same topic)
- Query: "college projects" → Document about "work meeting notes" = NOT RELEVANT (different topic)
- Query: "delete documents" → Document with action="delete" about "old receipts" = RELEVANT (matches action)
- Query: "delete documents" → Document with action="keep" about "important contract" = NOT RELEVANT (wrong action)

Be EXTREMELY STRICT - only mark as relevant if the document is VERY CLOSELY related to the query. Reject loose connections.

Respond ONLY with valid JSON array (no markdown, no code blocks):
[
  {"documentIndex": 0, "isRelevant": true/false, "relevanceExplanation": "brief explanation of why it is or isn't relevant"},
  {"documentIndex": 1, "isRelevant": true/false, "relevanceExplanation": "brief explanation"},
  ...
]`;

      try {
        const relevanceResponse = await nemotron.callNemotronAPI(relevanceCheckPrompt);
        const relevanceContent = relevanceResponse.choices?.[0]?.message?.content || '';
        const relevanceJsonMatch = relevanceContent.match(/\[[\s\S]*\]/);
        
        if (relevanceJsonMatch) {
          try {
            const relevanceChecks = JSON.parse(relevanceJsonMatch[0]);
            if (Array.isArray(relevanceChecks)) {
              relevanceChecks.forEach(({ documentIndex, isRelevant, relevanceExplanation }) => {
                if (documentIndex !== undefined && documentIndex !== null) {
                  const memory = batch[documentIndex];
                  if (memory && isRelevant === true) {
                    // Double-check action filter even if RAG says it's relevant
                    const requiredAction = queryUnderstanding?.requiredAction || detectedAction;
                    if (requiredAction) {
                      const memoryAction = (memory.overrideAction || memory.predictedAction || memory.nemotronAnalysis?.action || 'keep').toLowerCase();
                      if (memoryAction !== requiredAction.toLowerCase()) {
                        console.log(`✗ Action mismatch: ${memory.title || memory.filename} - RAG said relevant but action=${memoryAction}, required=${requiredAction}`);
                        return; // Skip - action doesn't match
                      }
                    }
                    // Only include if semantically relevant AND action matches
                    semanticallyRelevantMemories.push(memory);
                    console.log(`✓ Relevant: ${memory.title || memory.filename} - ${relevanceExplanation || 'Semantically related'}`);
                  } else if (memory) {
                    console.log(`✗ Not relevant: ${memory.title || memory.filename} - ${relevanceExplanation || 'Not semantically related'}`);
                  }
                }
              });
            }
          } catch (parseError) {
            console.error('Error parsing relevance check:', parseError);
            // Fallback: include with action filter check
            batch.forEach(memory => {
              // Check action first
              const requiredAction = queryUnderstanding?.requiredAction || detectedAction;
              if (requiredAction) {
                const memoryAction = (memory.overrideAction || memory.predictedAction || memory.nemotronAnalysis?.action || 'keep').toLowerCase();
                if (memoryAction !== requiredAction.toLowerCase()) {
                  return; // Skip - action doesn't match
                }
              }
              semanticallyRelevantMemories.push(memory);
            });
          }
        } else {
          // No JSON found - fallback to keyword-based check with action filter
          batch.forEach(memory => {
            // Check action first
            const requiredAction = queryUnderstanding?.requiredAction || detectedAction;
            if (requiredAction) {
              const memoryAction = (memory.overrideAction || memory.predictedAction || memory.nemotronAnalysis?.action || 'keep').toLowerCase();
              if (memoryAction !== requiredAction.toLowerCase()) {
                return; // Skip - action doesn't match
              }
            }
            
            const searchText = [
              memory.title || '',
              memory.filename || '',
              memory.summary || '',
              memory.content || ''
            ].join(' ').toLowerCase();
            const hasMatch = queryWords.some(w => searchText.includes(w)) ||
                            allSearchTerms.some(t => searchText.includes(t.toLowerCase()));
            if (hasMatch) {
              semanticallyRelevantMemories.push(memory);
            }
          });
        }
      } catch (error) {
        console.error(`Error in relevance check batch ${i / relevanceBatchSize + 1}:`, error.message);
        // Fallback: include with action filter check
        batch.forEach(memory => {
          // Check action first
          const requiredAction = queryUnderstanding?.requiredAction || detectedAction;
          if (requiredAction) {
            const memoryAction = (memory.overrideAction || memory.predictedAction || memory.nemotronAnalysis?.action || 'keep').toLowerCase();
            if (memoryAction !== requiredAction.toLowerCase()) {
              return; // Skip - action doesn't match
            }
          }
          semanticallyRelevantMemories.push(memory);
        });
      }
      
      // Small delay between batches
      if (i + relevanceBatchSize < candidatesToAnalyze.length) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }
    
    console.log(`Semantic relevance check: ${candidatesToAnalyze.length} → ${semanticallyRelevantMemories.length} relevant memories`);
    
    // Step 4: Use RAG to score and rank the semantically relevant memories
    console.log(`Analyzing ${semanticallyRelevantMemories.length} semantically relevant memories with RAG...`);
    
    for (let i = 0; i < semanticallyRelevantMemories.length; i += batchSize) {
      const batch = semanticallyRelevantMemories.slice(i, i + batchSize);
      
      const ragPrompt = `You are performing STRICT semantic search using RAG. Find documents that EXACTLY match what the user is searching for.

User's search query: "${query}"
${queryUnderstanding ? `
Query Analysis:
- Main Topic: ${queryUnderstanding.mainTopic}
- Required Type: ${queryUnderstanding.requiredType || 'ANY (no type restriction)'}
- Strict Type Filter: ${queryUnderstanding.strictTypeFilter ? 'YES - ONLY return the required type' : 'NO'}
- Related Concepts: ${queryUnderstanding.relatedConcepts.join(', ')}
- Search Keywords: ${queryUnderstanding.searchKeywords?.join(', ') || queryUnderstanding.relatedConcepts.join(', ')}
` : ''}

CRITICAL STRICT RULES:
${queryUnderstanding?.strictTypeFilter && queryUnderstanding?.requiredType ? `
⚠️ TYPE FILTER IS ACTIVE ⚠️
- User is searching for: ${queryUnderstanding.requiredType}
- ONLY return memories of type "${queryUnderstanding.requiredType}"
- If a memory is NOT ${queryUnderstanding.requiredType}, score it 0.0 (completely irrelevant)
- DO NOT return documents of other types, even if they match keywords
` : ''}
${queryUnderstanding?.strictActionFilter && queryUnderstanding?.requiredAction ? `
⚠️ ACTION FILTER IS ACTIVE ⚠️
- User is searching for memories with action: ${queryUnderstanding.requiredAction}
- ONLY return memories with action="${queryUnderstanding.requiredAction}"
- If a memory's action is NOT ${queryUnderstanding.requiredAction}, score it 0.0 (completely irrelevant)
- DO NOT return memories with other actions, even if they match keywords
` : ''}
${requiresBlankContent ? `
⚠️ BLANK/EMPTY CONTENT FILTER IS ACTIVE ⚠️
- User is searching for documents/files with BLANK, EMPTY, or MINIMAL content
- Check the content length and summary length of each memory
- Score HIGH (0.7-1.0) if content is very short (< 100 chars) or missing
- Score MEDIUM (0.4-0.6) if content is minimal (< 200 chars) with short summary
- Score LOW (0.0-0.3) if content is substantial - these should NOT match
- For blank content queries, prioritize memories with:
  * Very short or missing content
  * Minimal summaries
  * Filenames/titles but little actual content
` : ''}

STRICT SCORING GUIDELINES - BE VERY PRECISE:
1. ${queryUnderstanding?.strictTypeFilter && queryUnderstanding?.requiredType ? `FIRST: Check if memory type matches "${queryUnderstanding.requiredType}". If NO → score 0.0` : 'FIRST: Check if memory is about the EXACT same topic as the query'}
2. Score 0.8-1.0 ONLY for EXACT matches where:
   - The Nemotron summary/explanation DIRECTLY addresses the query topic
   - The memory is about the SAME specific subject as the query
   - All key concepts from the query appear in the summary/explanation/content
3. Score 0.6-0.7 for STRONG matches where:
   - The memory is closely related but may be slightly broader/narrower
   - Most key concepts match
   - Nemotron summary clearly relates to query
4. Score 0.4-0.5 for MODERATE matches where:
   - The memory is related but not as specific
   - Some key concepts match
   - There's a clear connection but not exact
5. Score 0.0-0.3 for WEAK or IRRELEVANT matches:
   - Only tangentially related
   - Generic connection
   - Wrong topic/subject
   - Wrong type/action if filters are active

CRITICAL: Use the Nemotron summary and explanation as PRIMARY indicators of relevance. These were generated by AI analysis and represent what the document is actually about. Match the query against these, not just keywords.

${queryUnderstanding?.strictTypeFilter ? 'BE STRICT: Wrong type = 0.0 score, no exceptions!' : 'Be VERY STRICT: Only score 0.5+ if the memory is VERY CLOSELY related to the query topic.'}

Memories to analyze:
${batch.map((mem, idx) => {
  const contentLength = (mem.content || '').trim().length;
  const summaryLength = (mem.summary || '').trim().length;
  const nemotronSummary = mem.nemotronAnalysis?.summary || mem.summary || '';
  const nemotronExplanation = mem.nemotronAnalysis?.explanation || '';
  const predictedAction = mem.overrideAction || mem.predictedAction || mem.nemotronAnalysis?.action || 'keep';
  return `
Memory ${idx + 1} (Index: ${idx}):
- Title: ${mem.title || mem.filename || 'Untitled'}
- ⭐ Nemotron Summary (PRIMARY): ${nemotronSummary.substring(0, 400)}${nemotronSummary.length > 400 ? '...' : ''}
- ⭐ Nemotron Explanation (PRIMARY): ${nemotronExplanation.substring(0, 300)}${nemotronExplanation.length > 300 ? '...' : ''}
- Original Summary: ${(mem.summary || mem.content || '').substring(0, 300)}${(mem.summary || mem.content || '').length > 300 ? '...' : ''}
- Summary Length: ${summaryLength} characters
- Type: ${mem.type}
- Predicted Action: ${predictedAction}
- Content preview: ${(mem.content || '').substring(0, 300)}${(mem.content || '').length > 300 ? '...' : ''}
- Content Length: ${contentLength} characters${contentLength < 100 ? ' (VERY SHORT - possibly blank/empty)' : ''}
- Tags: ${(mem.tags || []).join(', ') || 'none'}
`;
}).join('\n')}

For each memory, provide:
- relevanceScore: 0.0 to 1.0 (BE STRICT - only score 0.5+ if VERY closely related)
- reason: A SPECIFIC, DETAILED explanation of why it matches. Include:
  * What specific topic/subject from the Nemotron summary/explanation matches the query
  * Which key concepts from the query appear in the Nemotron analysis
  * How closely the memory's topic relates to what the user is searching for
  * Reference the Nemotron summary/explanation as the primary source
  * Be concrete and specific - mention actual topics from Nemotron analysis, not generic statements
  * If the match is loose or tangential, explain why and score lower (0.3-0.4)

Example good reasons:
- "Memory contains content about college algorithms course (CS4349) which matches 'college projects' query"
- "This is a PDF document about resume and cover letter, matching 'resume' search"
- "Image file (.jpg) matches 'photos' query - this is a photo/image file"
${requiresBlankContent ? '- "Document has only 45 characters of content and minimal summary (12 chars), matching blank/empty document query"\n- "File has title but content is only 30 characters long, indicating a blank or empty document"' : ''}

Example bad reasons (too generic):
- "Matches query"
- "Related content"
- "Contains keywords"

Respond ONLY with valid JSON array (no markdown, no code blocks):
[
  {"memoryIndex": 0, "relevanceScore": 0.0-1.0, "reason": "specific detailed explanation with actual content"},
  {"memoryIndex": 1, "relevanceScore": 0.0-1.0, "reason": "specific detailed explanation with actual content"},
  ...
]`;

      try {
        const ragResponse = await nemotron.callNemotronAPI(ragPrompt);
        const ragContent = ragResponse.choices?.[0]?.message?.content || '';
        const ragJsonMatch = ragContent.match(/\[[\s\S]*\]/);
        
        if (ragJsonMatch) {
          try {
            const scores = JSON.parse(ragJsonMatch[0]);
            if (Array.isArray(scores)) {
              scores.forEach(({ memoryIndex, relevanceScore, reason }) => {
                if (memoryIndex !== undefined && memoryIndex !== null) {
                  const memory = batch[memoryIndex];
                  if (memory) {
                    const score = Math.max(0, Math.min(1, parseFloat(relevanceScore) || 0));
                    // Validate and improve reason - replace generic ones with specific ones
                    let finalReason = (reason || '').trim();
                    // Always check and replace if generic - be aggressive about it
                    if (!finalReason || finalReason === '' || isGenericReason(finalReason) || 
                        finalReason.toLowerCase().includes('matches search criteria') ||
                        finalReason.toLowerCase().includes('matches criteria')) {
                      // Generate specific reason from memory content
                      finalReason = generateSpecificReason(memory, query, queryWords, allSearchTerms, queryLower);
                    }
                    
                    semanticScores.set(memory.id, {
                      score: score,
                      reason: finalReason
                    });
                  }
                }
              });
            }
          } catch (parseError) {
            console.error('Error parsing RAG scores:', parseError);
            // Fallback scoring for this batch with better reasons
            batch.forEach((memory, idx) => {
              if (!semanticScores.has(memory.id)) {
                const title = (memory.title || memory.filename || '').toLowerCase();
                const summary = (memory.summary || '').toLowerCase();
                const content = (memory.content || '').substring(0, 200).toLowerCase();
                const searchText = [title, summary, content].join(' ');
                
                const matchedWords = queryWords.filter(w => searchText.includes(w));
                const matchedTerms = allSearchTerms.filter(t => searchText.includes(t.toLowerCase()));
                const score = Math.min(0.6, 0.2 + (matchedWords.length * 0.1));
                
                // Generate specific reason using helper function
                const reason = generateSpecificReason(memory, query, queryWords, allSearchTerms, queryLower);
                
                semanticScores.set(memory.id, { 
                  score: score, 
                  reason: reason
                });
              }
            });
          }
        } else {
          // No JSON found in response - use fallback with better reasons
          batch.forEach((memory, idx) => {
            if (!semanticScores.has(memory.id)) {
              const title = (memory.title || memory.filename || '').toLowerCase();
              const summary = (memory.summary || '').toLowerCase();
              const content = (memory.content || '').substring(0, 200).toLowerCase();
              const searchText = [title, summary, content].join(' ');
              
              const matchedWords = queryWords.filter(w => searchText.includes(w));
              const matchedTerms = allSearchTerms.filter(t => searchText.includes(t.toLowerCase()));
              const score = Math.min(0.6, 0.2 + (matchedWords.length * 0.1));
              
              // Generate specific reason using helper function
              const reason = generateSpecificReason(memory, query, queryWords, allSearchTerms, queryLower);
              
              semanticScores.set(memory.id, { 
                score: score, 
                reason: reason
              });
            }
          });
        }
      } catch (error) {
        console.error(`Error in RAG batch ${i / batchSize + 1}:`, error.message);
        // Fallback: assign scores based on keyword matching with detailed reasons
        batch.forEach((memory, idx) => {
          if (!semanticScores.has(memory.id)) {
            const title = (memory.title || memory.filename || '').toLowerCase();
            const summary = (memory.summary || '').toLowerCase();
            const content = (memory.content || '').substring(0, 200).toLowerCase();
            const searchText = [title, summary, content].join(' ');
            
            const matchedWords = queryWords.filter(w => searchText.includes(w));
            const matchedTerms = allSearchTerms.filter(t => searchText.includes(t.toLowerCase()));
            const score = Math.min(0.7, 0.3 + (matchedWords.length * 0.1) + (matchedTerms.length * 0.05));
            
            // Generate detailed reason using helper function
            const reason = generateSpecificReason(memory, query, queryWords, allSearchTerms, queryLower);
            
            semanticScores.set(memory.id, { 
              score: score, 
              reason: reason
            });
          }
        });
      }
      
      // Small delay between batches to avoid rate limiting
      if (i + batchSize < candidatesToAnalyze.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // Step 4: STRICT filtering and ranking
    // Apply type filter again as final check
    // MUCH HIGHER threshold for tighter results - require strong matches
    const threshold = queryUnderstanding?.strictTypeFilter ? 0.5 : 0.4; // Increased from 0.3/0.2
    
    // Only work with memories that passed semantic relevance check
    let results = semanticallyRelevantMemories
      .filter(memory => {
        // STRICT action check first (most important for user intent)
        // Check both AI detection and direct query detection
        const queryLower = query.toLowerCase();
        let requiredAction = queryUnderstanding?.requiredAction;
        
        // Direct query check (more reliable) - use same patterns as above
        if (!requiredAction) {
          const deletePatterns = ['delete', 'should delete', 'to delete', 'i should delete', 'should be deleted', 'want to delete', 'need to delete'];
          const lowRelevancePatterns = ['forget', 'should forget', 'to forget', 'i should forget', 'low relevance', 'low future relevance'];
          const compressPatterns = ['compress', 'should compress', 'to compress', 'i should compress'];
          const keepPatterns = ['should keep', 'to keep', 'i should keep'];
          
          if (deletePatterns.some(pattern => queryLower.includes(pattern))) {
            requiredAction = 'delete';
          } else if (lowRelevancePatterns.some(pattern => queryLower.includes(pattern))) {
            requiredAction = 'low_relevance';
          } else if (compressPatterns.some(pattern => queryLower.includes(pattern))) {
            requiredAction = 'compress';
          } else if (keepPatterns.some(pattern => queryLower.includes(pattern))) {
            requiredAction = 'keep';
          }
        }
        
        if (requiredAction) {
          const requiredActionLower = requiredAction.toLowerCase();
          const memoryAction = (memory.overrideAction || memory.predictedAction || memory.nemotronAnalysis?.action || 'keep').toLowerCase();
          
          if (memoryAction !== requiredActionLower) {
            console.log(`Final filter: Excluding memory ${memory.id} - action=${memoryAction}, required=${requiredActionLower}`);
            return false; // STRICT: exclude wrong action
          }
        }
        
        // STRICT type check
        if (queryUnderstanding?.strictTypeFilter && queryUnderstanding?.requiredType) {
          const requiredType = queryUnderstanding.requiredType.toLowerCase();
          const memoryType = (memory.type || '').toLowerCase();
          
          let typeMatches = false;
          if (requiredType === 'image' || requiredType === 'photo' || requiredType === 'picture') {
            typeMatches = memoryType === 'image' || memoryType === 'photo' || 
                         (memory.filename || '').toLowerCase().match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i) ||
                         (memory.metadata?.mimeType || '').toLowerCase().startsWith('image/');
          } else if (requiredType === 'document' || requiredType === 'pdf' || requiredType === 'file') {
            typeMatches = memoryType === 'document' || memoryType === 'pdf' ||
                         (memory.filename || '').toLowerCase().match(/\.(pdf|doc|docx|txt|rtf)$/i) ||
                         (memory.metadata?.mimeType || '').toLowerCase().includes('pdf') ||
                         (memory.metadata?.mimeType || '').toLowerCase().includes('document');
          } else if (requiredType === 'email' || requiredType === 'message') {
            typeMatches = memoryType === 'email' || memoryType === 'chat' || memoryType === 'message';
          } else {
            typeMatches = memoryType === requiredType;
          }
          
          if (!typeMatches) {
            return false; // STRICT: exclude wrong type
          }
        }
        
        const semantic = semanticScores.get(memory.id);
        if (!semantic) {
          // If not analyzed by RAG, do a quick keyword check - prioritize Nemotron analysis
          const nemotronText = ((memory.nemotronAnalysis?.summary || '') + ' ' + (memory.nemotronAnalysis?.explanation || '')).toLowerCase();
          const searchText = [
            memory.title || '',
            memory.filename || '',
            memory.summary || '',
            memory.content || ''
          ].join(' ').toLowerCase();
          
          // Check Nemotron analysis first (more reliable)
          const nemotronMatch = queryWords.some(w => nemotronText.includes(w)) ||
                               allSearchTerms.some(t => nemotronText.includes(t.toLowerCase()));
          const regularMatch = queryWords.some(w => searchText.includes(w)) ||
                              allSearchTerms.some(t => searchText.includes(t.toLowerCase()));
          
          const hasMatch = nemotronMatch || regularMatch;
          if (hasMatch) {
            // Only assign score if type matches (if strict filter is on)
            if (!queryUnderstanding?.strictTypeFilter || 
                (queryUnderstanding?.strictTypeFilter && 
                 (queryUnderstanding?.requiredType === null || 
                  (memory.type || '').toLowerCase() === (queryUnderstanding?.requiredType || '').toLowerCase()))) {
              
              // Generate specific reason using helper function
              const reason = generateSpecificReason(memory, query, queryWords, allSearchTerms, queryLower);
              
              // Lower score for non-RAG matches, but higher if Nemotron analysis matched
              const score = nemotronMatch ? 0.35 : 0.25;
              semanticScores.set(memory.id, { score: score, reason: reason });
              // Only include if score meets threshold (tighter filtering)
              return score >= threshold;
            }
          }
          return false;
        }
        // Require higher scores for tighter results
        return semantic.score >= threshold;
      })
      .map(memory => {
        const semantic = semanticScores.get(memory.id);
        // Final safety check - ensure reason is never generic
        let finalReason = semantic.reason;
        if (!finalReason || finalReason.trim() === '' || isGenericReason(finalReason) ||
            finalReason.toLowerCase().includes('matches search criteria') ||
            finalReason.toLowerCase().includes('matches criteria')) {
          finalReason = generateSpecificReason(memory, query, queryWords, allSearchTerms, queryLower);
        }
        
        return {
          ...memory,
          _semanticScore: semantic.score,
          matchReason: finalReason
        };
      })
      .sort((a, b) => {
        // Sort by semantic score (highest first)
        if (b._semanticScore !== a._semanticScore) {
          return b._semanticScore - a._semanticScore;
        }
        // If scores are equal, prioritize title matches
        const aTitle = (a.title || a.filename || '').toLowerCase();
        const bTitle = (b.title || b.filename || '').toLowerCase();
        const aHasQuery = queryWords.some(w => aTitle.includes(w));
        const bHasQuery = queryWords.some(w => bTitle.includes(w));
        if (aHasQuery && !bHasQuery) return -1;
        if (!aHasQuery && bHasQuery) return 1;
        return 0;
      })
      .slice(0, 20); // Reduced to 20 for tighter results

    // Remove the internal score from final results
    const finalResults = results.map(({ _semanticScore, ...rest }) => rest);

    res.json({
      results: finalResults,
      explanation: explanation || `Found ${finalResults.length} semantically relevant memories`,
      searchQuery: query // Include search query for RAG formatting in frontend
    });

  } catch (error) {
    console.error('RAG search error:', error);
    
    // Fallback to basic search if RAG fails
    try {
      const allMemories = await loadAllMemories();
      const queryLower = query.toLowerCase();
      const basicResults = allMemories.filter(memory => {
        const searchText = [
          memory.title || '',
          memory.filename || '',
          memory.summary || '',
          memory.content || '',
          (memory.tags || []).join(' ')
        ].join(' ').toLowerCase();
        return searchText.includes(queryLower);
      }).slice(0, 20);

      res.json({
        results: basicResults,
        explanation: `Found ${basicResults.length} memories (basic search fallback)`
      });
    } catch (fallbackError) {
      console.error('Fallback search also failed:', fallbackError);
      res.status(500).json({ 
        error: 'Search failed. Please try again.',
        results: [],
        explanation: 'Search service unavailable'
      });
    }
  }
});

module.exports = router;

