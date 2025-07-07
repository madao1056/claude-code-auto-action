const cheerio = require('cheerio');
const logger = require('../utils/logger');

class ReceiptDetector {
  constructor() {
    this.receiptKeywords = this.loadKeywords();
    this.receiptPatterns = this.loadPatterns();
  }

  loadKeywords() {
    const defaultKeywords = [
      // English
      'receipt', 'invoice', 'bill', 'payment', 'total', 'amount', 'subtotal',
      'tax', 'order', 'transaction', 'purchase', 'confirmation', 'statement',
      'charge', 'billing', 'due', 'paid', 'balance', 'summary',
      
      // Japanese
      '領収書', '請求書', '合計', '金額', '支払', '明細', '購入', '注文',
      '取引', '確認', '税込', '税抜', '消費税', '小計', '決済', '振込',
      '購入明細', '支払明細', 'レシート', '納品書'
    ];

    const envKeywords = process.env.RECEIPT_KEYWORDS ? 
      process.env.RECEIPT_KEYWORDS.split(',').map(k => k.trim()) : [];

    return [...new Set([...defaultKeywords, ...envKeywords])];
  }

  loadPatterns() {
    return {
      // Price patterns
      price: [
        /\$[\d,]+\.?\d*/g,  // $123.45
        /¥[\d,]+/g,         // ¥1,234
        /[\d,]+円/g,        // 1,234円
        /USD\s*[\d,]+\.?\d*/gi,
        /JPY\s*[\d,]+/gi,
        /total[:\s]+[\$¥]?[\d,]+\.?\d*/gi,
        /合計[:\s]*[\d,]+円?/g,
        /請求額[:\s]*[\d,]+円?/g
      ],
      
      // Date patterns
      date: [
        /\d{4}[-\/]\d{1,2}[-\/]\d{1,2}/g,  // 2024-01-01
        /\d{1,2}[-\/]\d{1,2}[-\/]\d{4}/g,  // 01/01/2024
        /\d{4}年\d{1,2}月\d{1,2}日/g,      // 2024年1月1日
      ],
      
      // Order/Transaction ID patterns
      transactionId: [
        /order\s*#?\s*[\w-]+/gi,
        /invoice\s*#?\s*[\w-]+/gi,
        /transaction\s*#?\s*[\w-]+/gi,
        /注文番号[:\s]*[\w-]+/g,
        /取引番号[:\s]*[\w-]+/g
      ]
    };
  }

  async isReceipt(content, attachments = []) {
    let score = 0;
    const maxScore = 100;
    const analysis = {
      score: 0,
      isReceipt: false,
      confidence: 'low',
      detectedKeywords: [],
      detectedPatterns: {
        prices: [],
        dates: [],
        transactionIds: []
      },
      attachmentAnalysis: []
    };

    // Analyze text content
    if (content.text || content.html) {
      const textToAnalyze = content.text || this.extractTextFromHtml(content.html);
      const textAnalysis = this.analyzeText(textToAnalyze);
      score += textAnalysis.score;
      analysis.detectedKeywords = textAnalysis.keywords;
      analysis.detectedPatterns = textAnalysis.patterns;
    }

    // Analyze attachments
    for (const attachment of attachments) {
      const attachmentScore = this.analyzeAttachment(attachment);
      score += attachmentScore.score;
      analysis.attachmentAnalysis.push({
        filename: attachment.filename,
        score: attachmentScore.score,
        isReceipt: attachmentScore.isReceipt
      });
    }

    // Determine confidence level
    analysis.score = Math.min(score, maxScore);
    if (analysis.score >= 70) {
      analysis.confidence = 'high';
      analysis.isReceipt = true;
    } else if (analysis.score >= 40) {
      analysis.confidence = 'medium';
      analysis.isReceipt = true;
    } else if (analysis.score >= 20) {
      analysis.confidence = 'low';
      analysis.isReceipt = true;
    }

    logger.info(`Receipt detection analysis: ${JSON.stringify(analysis)}`);
    return analysis;
  }

  extractTextFromHtml(html) {
    const $ = cheerio.load(html);
    $('script, style').remove();
    return $.text().toLowerCase();
  }

  analyzeText(text) {
    const lowerText = text.toLowerCase();
    const analysis = {
      score: 0,
      keywords: [],
      patterns: {
        prices: [],
        dates: [],
        transactionIds: []
      }
    };

    // Check for keywords
    for (const keyword of this.receiptKeywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        analysis.keywords.push(keyword);
        analysis.score += 5;
      }
    }

    // Check for price patterns
    for (const pattern of this.receiptPatterns.price) {
      const matches = text.match(pattern);
      if (matches) {
        analysis.patterns.prices.push(...matches);
        analysis.score += matches.length * 10;
      }
    }

    // Check for date patterns
    for (const pattern of this.receiptPatterns.date) {
      const matches = text.match(pattern);
      if (matches) {
        analysis.patterns.dates.push(...matches);
        analysis.score += matches.length * 3;
      }
    }

    // Check for transaction ID patterns
    for (const pattern of this.receiptPatterns.transactionId) {
      const matches = text.match(pattern);
      if (matches) {
        analysis.patterns.transactionIds.push(...matches);
        analysis.score += matches.length * 5;
      }
    }

    return analysis;
  }

  analyzeAttachment(attachment) {
    const analysis = {
      score: 0,
      isReceipt: false
    };

    const filename = attachment.filename.toLowerCase();
    const receiptFilenameKeywords = [
      'receipt', 'invoice', 'bill', 'payment', 'order',
      '領収書', '請求書', '明細', 'レシート'
    ];

    // Check filename
    for (const keyword of receiptFilenameKeywords) {
      if (filename.includes(keyword)) {
        analysis.score += 20;
        analysis.isReceipt = true;
        break;
      }
    }

    // Check file type
    const extension = filename.split('.').pop();
    const receiptFileTypes = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff'];
    
    if (receiptFileTypes.includes(extension)) {
      analysis.score += 10;
    }

    // Check MIME type
    if (attachment.mimeType) {
      if (attachment.mimeType.includes('pdf') || attachment.mimeType.includes('image')) {
        analysis.score += 5;
      }
    }

    return analysis;
  }

  extractReceiptData(content, attachments) {
    const data = {
      extractedAt: new Date().toISOString(),
      prices: [],
      dates: [],
      transactionIds: [],
      vendor: null,
      items: [],
      total: null,
      currency: null
    };

    // Extract from text content
    if (content.text || content.html) {
      const text = content.text || this.extractTextFromHtml(content.html);
      
      // Extract prices
      for (const pattern of this.receiptPatterns.price) {
        const matches = text.match(pattern);
        if (matches) {
          data.prices.push(...matches);
        }
      }

      // Try to identify total amount
      const totalPattern = /total[:\s]+[\$¥]?([\d,]+\.?\d*)/gi;
      const totalMatch = text.match(totalPattern);
      if (totalMatch && totalMatch.length > 0) {
        data.total = totalMatch[totalMatch.length - 1];
      }

      // Extract dates
      for (const pattern of this.receiptPatterns.date) {
        const matches = text.match(pattern);
        if (matches) {
          data.dates.push(...matches);
        }
      }

      // Extract transaction IDs
      for (const pattern of this.receiptPatterns.transactionId) {
        const matches = text.match(pattern);
        if (matches) {
          data.transactionIds.push(...matches);
        }
      }

      // Try to extract vendor from subject or sender
      if (content.headers) {
        data.vendor = this.extractVendor(content.headers);
      }
    }

    return data;
  }

  extractVendor(headers) {
    if (headers.from) {
      // Extract company name from email
      const fromMatch = headers.from.match(/"?([^"<]+)"?\s*<(.+)>/);
      if (fromMatch) {
        return fromMatch[1].trim();
      }
      
      // Extract domain as vendor
      const domainMatch = headers.from.match(/@([^.]+)\./);
      if (domainMatch) {
        return domainMatch[1].charAt(0).toUpperCase() + domainMatch[1].slice(1);
      }
    }
    
    return null;
  }
}

module.exports = new ReceiptDetector();