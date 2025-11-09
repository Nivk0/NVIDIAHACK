const natural = require('natural');

class SentimentAgent {
  constructor() {
    this.analyzer = new natural.SentimentAnalyzer(
      'English',
      natural.PorterStemmer,
      'afinn'
    );
    this.tokenizer = new natural.WordTokenizer();
  }

  async analyze(predictions) {
    return predictions.map(item => {
      // Use Nemotron sentiment if available, otherwise use local analysis
      let sentiment, attachment;
      
      if (item.nemotronAnalysis && item.nemotronAnalysis.nemotronAnalyzed) {
        sentiment = item.nemotronAnalysis.sentiment || this.analyzeSentiment(item.content || '');
        attachment = item.nemotronAnalysis.attachment || this.calculateAttachment(item, sentiment);
      } else {
        sentiment = this.analyzeSentiment(item.content || '');
        attachment = this.calculateAttachment(item, sentiment);
      }
      
      return {
        ...item,
        sentiment,
        attachment,
        summary: this.generateSummary(item.content || '', 100)
      };
    });
  }

  analyzeSentiment(text) {
    if (!text || text.length === 0) {
      return { score: 0, label: 'neutral' };
    }

    try {
      const tokens = this.tokenizer.tokenize(text.toLowerCase());
      const score = this.analyzer.getSentiment(tokens);
      
      let label = 'neutral';
      if (score > 0.1) label = 'positive';
      else if (score < -0.1) label = 'negative';
      
      return { score, label };
    } catch (error) {
      return { score: 0, label: 'neutral' };
    }
  }

  calculateAttachment(item, sentiment) {
    let attachment = 0.5; // Base attachment
    
    // Positive sentiment increases attachment
    if (sentiment.label === 'positive') attachment += 0.2;
    if (sentiment.label === 'negative') attachment -= 0.1;
    
    // Recent items have higher attachment
    const age = this.calculateAge(item.createdAt);
    if (age < 1) attachment += 0.2;
    else if (age < 6) attachment += 0.1;
    else if (age > 24) attachment -= 0.2;
    
    // Personal keywords increase attachment
    const personalKeywords = ['love', 'family', 'friend', 'important', 'remember', 'special'];
    const content = (item.content || '').toLowerCase();
    const keywordCount = personalKeywords.filter(kw => content.includes(kw)).length;
    attachment += keywordCount * 0.05;
    
    // Ensure attachment is between 0 and 1
    return Math.min(1, Math.max(0, attachment));
  }

  calculateAge(createdAt) {
    const now = new Date();
    const created = new Date(createdAt);
    const diffTime = Math.abs(now - created);
    return Math.floor(diffTime / (1000 * 60 * 60 * 24 * 30));
  }

  generateSummary(text, maxLength) {
    if (!text) return 'No content';
    if (text.length <= maxLength) return text;
    
    // Simple summary: first sentence + ellipsis
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length > 0) {
      return sentences[0].trim().substring(0, maxLength) + '...';
    }
    
    return text.substring(0, maxLength) + '...';
  }
}

module.exports = SentimentAgent;

