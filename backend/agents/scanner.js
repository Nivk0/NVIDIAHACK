const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const imageSize = require('image-size');

class DataScanner {
  async scan(files, textData, clientMetadata = []) {
    const scannedItems = [];


    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      const clientMeta = clientMetadata[index] || {};
      try {
        const stats = await fs.stat(file.path);
        const storedFilename = path.basename(file.path);
        const publicUrl = `/uploads/${storedFilename}`;
        const baseMetadata = {
          extension: path.extname(file.originalname).toLowerCase(),
          mimeType: file.mimetype,
          size: stats.size,
          storedFilename,
          originalFilename: file.originalname
        };

        const extracted = await this.extractFileData(file, stats, baseMetadata, clientMeta, publicUrl);
        const createdAt = this.getCreatedAt(stats, clientMeta, extracted.metadata);

        const record = {
          id: uuidv4(),
          type: extracted.type,
          filename: file.originalname,
          title: extracted.title,
          summary: extracted.summary,
          content: extracted.content,
          size: stats.size,
          createdAt,
          metadata: extracted.metadata,
          fileUrl: extracted.fileUrl
        };

        if (extracted.type === 'image' && extracted.fileUrl) {
          record.imageUrl = extracted.fileUrl;
        }

        scannedItems.push(record);
      } catch (error) {
        console.error(`Error scanning file ${file.originalname}:`, error);
      }
    }


    for (const item of textData) {
      const rawText = item.content || item.text || '';
      const textContent = this.sanitizeText(rawText);
      const summary = this.createSummaryFromText(textContent, item.title || 'Note');

      scannedItems.push({
        id: uuidv4(),
        type: item.type || 'text',
        title: item.title || 'Untitled Note',
        summary,
        content: textContent,
        size: textContent.length,
        createdAt: item.createdAt || new Date().toISOString(),
        metadata: item.metadata || {}
      });
    }

    return scannedItems;
  }

  detectType(filename) {
    const ext = path.extname(filename).toLowerCase();
    const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tif', '.tiff'];
    const docExts = ['.pdf', '.doc', '.docx', '.ppt', '.pptx'];
    const textExts = ['.txt', '.md', '.markdown', '.log'];
    const csvExts = ['.csv', '.tsv'];
    const emailExts = ['.eml', '.msg'];

    if (imageExts.includes(ext)) return 'image';
    if (docExts.includes(ext)) return 'document';
    if (csvExts.includes(ext)) return 'csv';
    if (textExts.includes(ext)) return 'text';
    if (emailExts.includes(ext)) return 'email';
    return 'unknown';
  }

  async extractFileData(file, stats, baseMetadata, clientMeta = {}, publicUrl) {
    const filePath = file.path;
    const detectedType = this.detectType(file.originalname);
    const title = this.deriveTitle(file.originalname);

    switch (detectedType) {
      case 'image':
        return await this.processImage(filePath, title, detectedType, baseMetadata, clientMeta, publicUrl);
      case 'document':
        return await this.processDocument(filePath, title, detectedType, baseMetadata, clientMeta, publicUrl);
      case 'csv':
        return await this.processCsv(filePath, title, baseMetadata, publicUrl, clientMeta);
      case 'text':
        return await this.processTextFile(filePath, title, baseMetadata, publicUrl, clientMeta);
      case 'email':
        return await this.processEmailFile(filePath, title, baseMetadata, publicUrl, clientMeta);
      default:
        return this.processUnknownFile(file, title, stats, detectedType, baseMetadata, clientMeta, publicUrl);
    }
  }

  deriveTitle(filename) {
    return path.basename(filename, path.extname(filename))
      .replace(/[_\-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase())
      || 'Untitled File';
  }

  async processDocument(filePath, title, type, metadata, clientMeta = {}, publicUrl) {
    const ext = metadata.extension;
    let text = '';
    const extraMeta = {};

    try {
      if (ext === '.pdf') {
        const dataBuffer = await fs.readFile(filePath);
        const parsed = await pdfParse(dataBuffer);
        text = (parsed.text || '').trim();
        extraMeta.pageCount = parsed.numpages;
        if (parsed.info?.Author) extraMeta.author = parsed.info.Author;
        if (parsed.info?.Title) extraMeta.documentTitle = parsed.info.Title;
      } else if (ext === '.docx') {
        const result = await mammoth.extractRawText({ path: filePath });
        text = (result.value || '').trim();
      } else {
        const raw = await fs.readFile(filePath, 'utf8');
        text = raw.trim();
      }
    } catch (error) {
      console.warn(`Document extraction failed for ${filePath}:`, error.message);
    }

    const paragraphList = (text || '')
      .split(/\r?\n+/)
      .map(line => this.sanitizeText(line))
      .filter(line => line.length > 3);

    const summarySource = paragraphList.slice(0, 3).join(' ');
    const summary = summarySource.length > 500
      ? `${summarySource.substring(0, 500)}...`
      : summarySource || `${title} (no summary available)`;

    const sanitized = this.sanitizeText(text);
    const content = this.limitText(sanitized, 4000);

    const combinedMeta = this.mergeClientMetadata({
      ...metadata,
      ...extraMeta,
      category: this.detectDocumentCategory(content),
      originalModifiedAt: clientMeta.lastModified ? new Date(clientMeta.lastModified).toISOString() : undefined
    }, clientMeta);

    return {
      type: type,
      title,
      summary,
      content,
      metadata: combinedMeta,
      fileUrl: publicUrl
    };
  }

  async processCsv(filePath, title, metadata, publicUrl, clientMeta = {}) {
    let content = '';
    let header = [];
    let rows = 0;

    try {
      const raw = await fs.readFile(filePath, 'utf8');
      const lines = raw.split(/\r?\n/).filter(Boolean);
      rows = lines.length;
      if (lines.length > 0) {
        header = lines[0].split(',').map(col => col.trim());
      }
      const previewLines = lines.slice(0, 10).join('\n');
      content = previewLines;
    } catch (error) {
      console.warn(`CSV extraction failed for ${filePath}:`, error.message);
    }

    const cleanHeader = header
      .map(col => this.sanitizeText(col))
      .filter(Boolean);
    const summary = cleanHeader.length
      ? `CSV columns: ${cleanHeader.join(', ')}`
      : `CSV file (${rows} rows previewed)`;

    const combinedMeta = this.mergeClientMetadata({
      ...metadata,
      columns: cleanHeader.length,
      rows
    }, {});

    return {
      type: 'document',
      title,
      summary: this.sanitizeText(summary),
      content: this.limitText(content, 4000),
      metadata: this.mergeClientMetadata({
        ...metadata,
        columns: cleanHeader.length,
        rows
      }, clientMeta),
      fileUrl: publicUrl
    };
  }

  async processTextFile(filePath, title, metadata, publicUrl, clientMeta = {}) {
    let content = '';
    try {
      content = await fs.readFile(filePath, 'utf8');
    } catch (error) {
      console.warn(`Text file read failed for ${filePath}:`, error.message);
    }

    const cleanContent = this.sanitizeText(content);
    const summary = this.createSummaryFromText(cleanContent, title);

    return {
      type: 'text',
      title,
      summary,
      content: this.limitText(cleanContent, 4000),
      metadata: this.mergeClientMetadata(metadata, clientMeta),
      fileUrl: publicUrl
    };
  }

  async processEmailFile(filePath, title, metadata, publicUrl, clientMeta = {}) {
    let content = '';
    let summary = `${title} (email)`;
    const emailMeta = { ...metadata };

    try {
      const raw = await fs.readFile(filePath, 'utf8');
      content = raw;
      const headerMatch = raw.match(/Subject:\s*(.*)/i);
      if (headerMatch) {
        emailMeta.subject = headerMatch[1].trim();
        summary = `Email: ${headerMatch[1].trim()}`;
      }
      const fromMatch = raw.match(/From:\s*(.*)/i);
      if (fromMatch) emailMeta.from = fromMatch[1].trim();
      const toMatch = raw.match(/To:\s*(.*)/i);
      if (toMatch) emailMeta.to = toMatch[1].trim();
    } catch (error) {
      console.warn(`Email extraction failed for ${filePath}:`, error.message);
    }

    return {
      type: 'email',
      title,
      summary: this.sanitizeText(summary),
      content: this.limitText(content, 4000),
      metadata: this.mergeClientMetadata(emailMeta, clientMeta),
      fileUrl: publicUrl
    };
  }

  async processImage(filePath, title, type, metadata, clientMeta = {}, publicUrl) {
    let width;
    let height;

    try {
      const buffer = fsSync.readFileSync(filePath);
      const dimensions = imageSize(buffer);
      width = dimensions.width;
      height = dimensions.height;
    } catch (error) {
      console.warn(`Image metadata extraction failed for ${filePath}:`, error.message);
    }

    const descriptiveSummary = width && height
      ? `${title} (${width}x${height})`
      : `${title} (image)`;

    const imageMetadata = this.mergeClientMetadata({
      ...metadata,
      width,
      height,
      originalModifiedAt: clientMeta.lastModified ? new Date(clientMeta.lastModified).toISOString() : undefined
    }, clientMeta);

    return {
      type,
      title,
      summary: descriptiveSummary,
      content: descriptiveSummary,
      metadata: imageMetadata,
      fileUrl: publicUrl
    };
  }

  processUnknownFile(file, title, stats, detectedType, metadata, clientMeta = {}, publicUrl) {
    const summary = `File ${file.originalname} (${metadata.extension || 'unknown type'})`;

    return {
      type: detectedType,
      title,
      summary,
      content: summary,
      metadata: this.mergeClientMetadata({
        ...metadata,
        note: 'Binary file – limited metadata available',
        originalModifiedAt: clientMeta.lastModified ? new Date(clientMeta.lastModified).toISOString() : undefined
      }, clientMeta),
      fileUrl: publicUrl
    };
  }

  createSummaryFromText(text, fallbackTitle) {
    if (!text || text.trim().length === 0) {
      return `${fallbackTitle} (no textual preview available)`;
    }

    const paragraphs = text
      .split(/\r?\n+/)
      .map(line => line.trim())
      .filter(line => line.length > 0);

    if (paragraphs.length > 0) {
      const joined = paragraphs.slice(0, 3).join(' ');
      if (joined.length <= 300) {
        return joined;
      }
      return `${joined.substring(0, 300).trim()}...`;
    }

    const clean = text.replace(/\s+/g, ' ').trim();
    if (clean.length <= 300) return clean;

    const sentences = clean.split(/(?<=[.!?])\s+/);
    if (sentences.length > 1) {
      const candidate = sentences[0] + (sentences[1] ? ` ${sentences[1]}` : '');
      return candidate.substring(0, 300).trim();
    }

    return clean.substring(0, 300).trim() + '...';
  }

  limitText(text, maxLength) {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) : text;
  }

  detectDocumentCategory(content) {
    if (!content) return undefined;
    const lowerContent = content.toLowerCase();
    if (lowerContent.includes('meeting') && lowerContent.includes('notes')) return 'meeting-notes';
    if (lowerContent.includes('research') || lowerContent.includes('study')) return 'research';
    if (lowerContent.includes('invoice') || lowerContent.includes('receipt')) return 'finance';
    return undefined;
  }

  getCreatedAt(stats, clientMeta, metadata) {
    if (clientMeta?.lastModified) {
      return new Date(clientMeta.lastModified).toISOString();
    }
    if (metadata?.originalModifiedAt) {
      return metadata.originalModifiedAt;
    }
    return stats.birthtime?.toISOString?.() || new Date().toISOString();
  }

  sanitizeText(text) {
    if (!text) return '';
    return text
      .replace(/\u0000/g, '')
      .replace(/�/g, '')
      .replace(/[\u2022\u2023\u25CF\u25A0\*-]+/g, ' ')
      .replace(/^[^A-Za-z0-9]+/, '')
      .replace(/[^\S\r\n]+/g, ' ')
      .trim();
  }

  mergeClientMetadata(metadata, clientMeta = {}) {
    if (!clientMeta) return metadata;
    const result = { ...metadata };
    const { relativePath, rootFolder, lastModified } = clientMeta;

    if (relativePath) {
      result.relativePath = relativePath;
      const segments = relativePath.split(/[\\/]/).filter(Boolean);
      if (segments.length > 1) {
        result.parentFolder = segments.slice(0, -1).join('/');
        result.rootFolder = result.rootFolder || segments[0];
      } else if (segments.length === 1 && !result.parentFolder) {
        result.parentFolder = null;
      }
    }

    if (rootFolder && !result.rootFolder) {
      result.rootFolder = rootFolder;
    }

    if (lastModified) {
      const iso = new Date(lastModified).toISOString();
      if (!result.originalModifiedAt) {
        result.originalModifiedAt = iso;
      }
    }

    return result;
  }
}

module.exports = DataScanner;

