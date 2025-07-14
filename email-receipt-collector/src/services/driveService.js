const { google } = require('googleapis');
const logger = require('../utils/logger');
const fs = require('fs').promises;
const path = require('path');

class DriveService {
  constructor(auth) {
    this.drive = google.drive({ version: 'v3', auth });
    this.folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  }

  async createFolder(folderName, parentId = null) {
    try {
      const fileMetadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: parentId ? [parentId] : this.folderId ? [this.folderId] : [],
      };

      const response = await this.drive.files.create({
        resource: fileMetadata,
        fields: 'id, name',
      });

      logger.info(`Created folder: ${folderName} with ID: ${response.data.id}`);
      return response.data;
    } catch (error) {
      logger.error('Error creating folder:', error);
      throw error;
    }
  }

  async uploadFile(fileData, metadata) {
    try {
      const { filename, mimeType, folderId } = metadata;

      const fileMetadata = {
        name: filename,
        parents: folderId ? [folderId] : this.folderId ? [this.folderId] : [],
      };

      const media = {
        mimeType: mimeType || 'application/octet-stream',
        body: Buffer.from(fileData, 'base64'),
      };

      const response = await this.drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id, name, webViewLink',
      });

      logger.info(`Uploaded file: ${filename} with ID: ${response.data.id}`);
      return response.data;
    } catch (error) {
      logger.error('Error uploading file:', error);
      throw error;
    }
  }

  async uploadReceipt(attachment, emailData, receiptData) {
    try {
      // Create a folder structure: Year/Month/Vendor (if available)
      const date = new Date(emailData.content.headers.date || Date.now());
      const year = date.getFullYear().toString();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const vendor = receiptData.vendor || 'Unknown';

      // Create year folder
      const yearFolder = await this.findOrCreateFolder(year, this.folderId);

      // Create month folder
      const monthFolder = await this.findOrCreateFolder(`${year}-${month}`, yearFolder.id);

      // Create vendor folder
      const vendorFolder = await this.findOrCreateFolder(vendor, monthFolder.id);

      // Generate filename with metadata
      const timestamp = date.toISOString().split('T')[0];
      const originalName = path.parse(attachment.filename).name;
      const extension = path.extname(attachment.filename);
      const newFilename = `${timestamp}_${vendor}_${originalName}${extension}`;

      // Upload the file
      const uploadedFile = await this.uploadFile(attachment.data, {
        filename: newFilename,
        mimeType: attachment.mimeType,
        folderId: vendorFolder.id,
      });

      // Create and upload metadata file
      const metadataContent = JSON.stringify(
        {
          originalEmail: {
            id: emailData.id,
            subject: emailData.content.headers.subject,
            from: emailData.content.headers.from,
            date: emailData.content.headers.date,
          },
          receiptData: receiptData,
          uploadedAt: new Date().toISOString(),
          fileInfo: {
            originalFilename: attachment.filename,
            uploadedFilename: newFilename,
            driveFileId: uploadedFile.id,
            webViewLink: uploadedFile.webViewLink,
          },
        },
        null,
        2
      );

      await this.uploadFile(Buffer.from(metadataContent).toString('base64'), {
        filename: `${timestamp}_${vendor}_metadata.json`,
        mimeType: 'application/json',
        folderId: vendorFolder.id,
      });

      return {
        success: true,
        file: uploadedFile,
        folder: vendorFolder,
        metadata: {
          year,
          month,
          vendor,
          timestamp,
        },
      };
    } catch (error) {
      logger.error('Error uploading receipt:', error);
      throw error;
    }
  }

  async findOrCreateFolder(folderName, parentId = null) {
    try {
      // Search for existing folder
      let query = `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
      if (parentId) {
        query += ` and '${parentId}' in parents`;
      }

      const response = await this.drive.files.list({
        q: query,
        fields: 'files(id, name)',
        spaces: 'drive',
      });

      if (response.data.files && response.data.files.length > 0) {
        logger.info(`Found existing folder: ${folderName}`);
        return response.data.files[0];
      }

      // Create new folder if not found
      return await this.createFolder(folderName, parentId);
    } catch (error) {
      logger.error('Error in findOrCreateFolder:', error);
      throw error;
    }
  }

  async listFiles(folderId = null) {
    try {
      const query = folderId ? `'${folderId}' in parents and trashed=false` : 'trashed=false';

      const response = await this.drive.files.list({
        q: query,
        fields: 'files(id, name, mimeType, webViewLink, createdTime)',
        orderBy: 'createdTime desc',
        pageSize: 100,
      });

      return response.data.files;
    } catch (error) {
      logger.error('Error listing files:', error);
      throw error;
    }
  }

  async getFileMetadata(fileId) {
    try {
      const response = await this.drive.files.get({
        fileId: fileId,
        fields: 'id, name, mimeType, size, createdTime, modifiedTime, webViewLink, parents',
      });

      return response.data;
    } catch (error) {
      logger.error('Error getting file metadata:', error);
      throw error;
    }
  }
}

module.exports = DriveService;
