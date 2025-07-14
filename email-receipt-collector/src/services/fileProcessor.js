const pdf = require('pdf-parse');
const Tesseract = require('tesseract.js');
const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

class FileProcessor {
  constructor() {
    this.tempDir = path.join(__dirname, '../../temp');
    this.ensureTempDir();
  }

  async ensureTempDir() {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      logger.error('Error creating temp directory:', error);
    }
  }

  async processAttachment(attachment) {
    const { filename, data, mimeType } = attachment;
    const fileExtension = path.extname(filename).toLowerCase().slice(1);

    logger.info(`Processing attachment: ${filename} (${mimeType})`);

    try {
      if (mimeType.includes('pdf') || fileExtension === 'pdf') {
        return await this.processPDF(data, filename);
      } else if (mimeType.includes('image') || this.isImageFile(fileExtension)) {
        return await this.processImage(data, filename);
      } else {
        logger.warn(`Unsupported file type: ${filename}`);
        return null;
      }
    } catch (error) {
      logger.error(`Error processing ${filename}:`, error);
      return null;
    }
  }

  async processPDF(base64Data, filename) {
    try {
      const buffer = Buffer.from(base64Data, 'base64');
      const data = await pdf(buffer);

      return {
        type: 'pdf',
        filename: filename,
        text: data.text,
        numPages: data.numpages,
        info: data.info,
        metadata: data.metadata,
        processedAt: new Date().toISOString(),
      };
    } catch (error) {
      logger.error(`Error processing PDF ${filename}:`, error);
      throw error;
    }
  }

  async processImage(base64Data, filename) {
    const tempFilePath = path.join(this.tempDir, `temp_${Date.now()}_${filename}`);

    try {
      // Save image temporarily
      const buffer = Buffer.from(base64Data, 'base64');
      await fs.writeFile(tempFilePath, buffer);

      // Preprocess image for better OCR results
      const processedPath = await this.preprocessImage(tempFilePath);

      // Perform OCR
      const result = await Tesseract.recognize(
        processedPath,
        process.env.OCR_LANGUAGES || 'eng+jpn',
        {
          logger: (m) => logger.debug(m),
        }
      );

      // Clean up temp files
      await this.cleanupTempFiles([tempFilePath, processedPath]);

      return {
        type: 'image',
        filename: filename,
        text: result.data.text,
        confidence: result.data.confidence,
        processedAt: new Date().toISOString(),
      };
    } catch (error) {
      logger.error(`Error processing image ${filename}:`, error);
      await this.cleanupTempFiles([tempFilePath]);
      throw error;
    }
  }

  async preprocessImage(imagePath) {
    const processedPath = imagePath.replace(/\.[^.]+$/, '_processed.png');

    try {
      await sharp(imagePath)
        .greyscale()
        .normalize()
        .sharpen()
        .resize(2000, null, {
          withoutEnlargement: true,
          fit: 'inside',
        })
        .toFile(processedPath);

      return processedPath;
    } catch (error) {
      logger.error('Error preprocessing image:', error);
      return imagePath; // Return original if preprocessing fails
    }
  }

  async cleanupTempFiles(filePaths) {
    for (const filePath of filePaths) {
      try {
        await fs.unlink(filePath);
      } catch (error) {
        logger.warn(`Failed to delete temp file ${filePath}:`, error.message);
      }
    }
  }

  isImageFile(extension) {
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'tif', 'webp'];
    return imageExtensions.includes(extension.toLowerCase());
  }

  async extractTextFromFiles(attachments) {
    const results = [];

    for (const attachment of attachments) {
      const result = await this.processAttachment(attachment);
      if (result) {
        results.push(result);
      }
    }

    return results;
  }

  combineExtractedText(processedFiles) {
    let combinedText = '';

    for (const file of processedFiles) {
      if (file.text) {
        combinedText += `\n--- ${file.filename} ---\n`;
        combinedText += file.text;
        combinedText += '\n--- End ---\n';
      }
    }

    return combinedText;
  }
}

module.exports = new FileProcessor();
