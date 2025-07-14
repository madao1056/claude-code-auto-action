const { google } = require('googleapis');
const logger = require('../utils/logger');
const { simpleParser } = require('mailparser');

class GmailService {
  constructor(auth) {
    this.gmail = google.gmail({ version: 'v1', auth });
  }

  async searchEmails(query, maxResults = 50) {
    try {
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults: maxResults,
      });

      if (!response.data.messages) {
        logger.info('No messages found');
        return [];
      }

      logger.info(`Found ${response.data.messages.length} messages`);
      return response.data.messages;
    } catch (error) {
      logger.error('Error searching emails:', error);
      throw error;
    }
  }

  async getEmail(messageId) {
    try {
      const response = await this.gmail.users.messages.get({
        userId: 'me',
        id: messageId,
      });

      return response.data;
    } catch (error) {
      logger.error(`Error getting email ${messageId}:`, error);
      throw error;
    }
  }

  async getAttachments(messageId, email) {
    const attachments = [];

    const parts = this.getMessageParts(email.payload);

    for (const part of parts) {
      if (part.filename && part.body.attachmentId) {
        try {
          const attachment = await this.gmail.users.messages.attachments.get({
            userId: 'me',
            messageId: messageId,
            id: part.body.attachmentId,
          });

          attachments.push({
            filename: part.filename,
            mimeType: part.mimeType,
            data: attachment.data.data,
            size: attachment.data.size,
          });

          logger.info(`Retrieved attachment: ${part.filename}`);
        } catch (error) {
          logger.error(`Error getting attachment ${part.filename}:`, error);
        }
      }
    }

    return attachments;
  }

  getMessageParts(payload, parts = []) {
    if (payload.parts) {
      for (const part of payload.parts) {
        this.getMessageParts(part, parts);
      }
    } else {
      parts.push(payload);
    }
    return parts;
  }

  async getEmailContent(email) {
    const parts = this.getMessageParts(email.payload);
    let htmlContent = '';
    let textContent = '';

    for (const part of parts) {
      if (part.mimeType === 'text/html' && part.body.data) {
        htmlContent = Buffer.from(part.body.data, 'base64').toString('utf-8');
      } else if (part.mimeType === 'text/plain' && part.body.data) {
        textContent = Buffer.from(part.body.data, 'base64').toString('utf-8');
      }
    }

    return {
      html: htmlContent,
      text: textContent,
      headers: this.extractHeaders(email.payload.headers),
    };
  }

  extractHeaders(headers) {
    const result = {};
    const importantHeaders = ['Subject', 'From', 'To', 'Date'];

    headers.forEach((header) => {
      if (importantHeaders.includes(header.name)) {
        result[header.name.toLowerCase()] = header.value;
      }
    });

    return result;
  }

  async processEmails(query, maxResults) {
    const messages = await this.searchEmails(query, maxResults);
    const emails = [];

    for (const message of messages) {
      try {
        const email = await this.getEmail(message.id);
        const content = await this.getEmailContent(email);
        const attachments = await this.getAttachments(message.id, email);

        emails.push({
          id: message.id,
          threadId: message.threadId,
          content,
          attachments,
        });
      } catch (error) {
        logger.error(`Error processing email ${message.id}:`, error);
      }
    }

    return emails;
  }
}

module.exports = GmailService;
