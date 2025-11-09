const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class DataScanner {
  async scan(files, textData) {
    const scannedItems = [];

    // Process uploaded files
    for (const file of files) {
      try {
        const stats = await fs.stat(file.path);
        let content = '';
        
        // Try to read as text, but handle binary files gracefully
        try {
          const fileContent = await fs.readFile(file.path, 'utf8');
          content = fileContent.substring(0, 10000); // Limit content size
        } catch (readError) {
          // If it's a binary file, just note it
          content = `[Binary file: ${file.originalname}]`;
        }
        
        scannedItems.push({
          id: uuidv4(),
          type: this.detectType(file.originalname),
          filename: file.originalname,
          content: content,
          size: stats.size,
          createdAt: stats.birthtime.toISOString(),
          metadata: {
            extension: path.extname(file.originalname),
            mimeType: file.mimetype
          }
        });
      } catch (error) {
        console.error(`Error scanning file ${file.originalname}:`, error);
      }
    }

    // Process text data (notes, chats, etc.)
    for (const item of textData) {
      scannedItems.push({
        id: uuidv4(),
        type: item.type || 'text',
        content: item.content || item.text || '',
        size: (item.content || item.text || '').length,
        createdAt: item.createdAt || new Date().toISOString(),
        metadata: item.metadata || {}
      });
    }

    return scannedItems;
  }

  detectType(filename) {
    const ext = path.extname(filename).toLowerCase();
    const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
    const docExts = ['.pdf', '.doc', '.docx', '.txt', '.md'];
    const emailExts = ['.eml', '.msg'];
    
    if (imageExts.includes(ext)) return 'image';
    if (docExts.includes(ext)) return 'document';
    if (emailExts.includes(ext)) return 'email';
    return 'unknown';
  }
}

module.exports = DataScanner;

