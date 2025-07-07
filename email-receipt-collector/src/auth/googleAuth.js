const { google } = require('googleapis');
const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');
const logger = require('../utils/logger');

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/drive.file'
];

const TOKEN_PATH = path.join(__dirname, '../../config/token.json');
const CREDENTIALS_PATH = path.join(__dirname, '../../config/credentials.json');

class GoogleAuth {
  constructor() {
    this.oAuth2Client = null;
  }

  async authorize() {
    try {
      const credentials = await this.loadCredentials();
      const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
      this.oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

      try {
        const token = await fs.readFile(TOKEN_PATH, 'utf8');
        this.oAuth2Client.setCredentials(JSON.parse(token));
        logger.info('Successfully loaded existing token');
      } catch (err) {
        logger.info('No token found, getting new token');
        await this.getNewToken();
      }

      return this.oAuth2Client;
    } catch (error) {
      logger.error('Authorization error:', error);
      throw error;
    }
  }

  async loadCredentials() {
    try {
      const content = await fs.readFile(CREDENTIALS_PATH, 'utf8');
      return JSON.parse(content);
    } catch (err) {
      throw new Error('Error loading client secret file. Please run setup first.');
    }
  }

  async getNewToken() {
    const authUrl = this.oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
    });

    console.log('Authorize this app by visiting this url:', authUrl);
    
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    return new Promise((resolve, reject) => {
      rl.question('Enter the code from that page here: ', async (code) => {
        rl.close();
        try {
          const { tokens } = await this.oAuth2Client.getToken(code);
          this.oAuth2Client.setCredentials(tokens);
          await this.storeToken(tokens);
          logger.info('Token stored successfully');
          resolve();
        } catch (err) {
          reject(err);
        }
      });
    });
  }

  async storeToken(tokens) {
    await fs.mkdir(path.dirname(TOKEN_PATH), { recursive: true });
    await fs.writeFile(TOKEN_PATH, JSON.stringify(tokens));
  }

  getAuth() {
    if (!this.oAuth2Client) {
      throw new Error('Not authorized. Please run authorize() first.');
    }
    return this.oAuth2Client;
  }
}

module.exports = new GoogleAuth();