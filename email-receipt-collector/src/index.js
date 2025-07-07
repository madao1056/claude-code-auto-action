require('dotenv').config();
const cron = require('node-cron');
const googleAuth = require('./auth/googleAuth');
const GmailService = require('./services/gmailService');
const DriveService = require('./services/driveService');
const receiptDetector = require('./services/receiptDetector');
const fileProcessor = require('./services/fileProcessor');
const logger = require('./utils/logger');

class EmailReceiptCollector {
  constructor() {
    this.auth = null;
    this.gmailService = null;
    this.driveService = null;
    this.isRunning = false;
  }

  async initialize() {
    try {
      logger.info('Initializing Email Receipt Collector...');
      
      // Authenticate
      this.auth = await googleAuth.authorize();
      
      // Initialize services
      this.gmailService = new GmailService(this.auth);
      this.driveService = new DriveService(this.auth);
      
      logger.info('Initialization complete');
      return true;
    } catch (error) {
      logger.error('Initialization failed:', error);
      return false;
    }
  }

  async processEmails() {
    if (this.isRunning) {
      logger.warn('Process already running, skipping...');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();
    const stats = {
      emailsProcessed: 0,
      receiptsFound: 0,
      receiptsUploaded: 0,
      errors: []
    };

    try {
      logger.info('Starting email processing...');
      
      // Get search query from environment
      const searchQuery = process.env.EMAIL_SEARCH_QUERY || 
        'subject:(receipt OR invoice OR 領収書 OR 請求書) has:attachment';
      const maxResults = parseInt(process.env.MAX_RESULTS) || 50;
      
      // Search and process emails
      const emails = await this.gmailService.processEmails(searchQuery, maxResults);
      stats.emailsProcessed = emails.length;
      
      logger.info(`Found ${emails.length} emails to process`);

      for (const email of emails) {
        try {
          await this.processEmail(email, stats);
        } catch (error) {
          logger.error(`Error processing email ${email.id}:`, error);
          stats.errors.push({ emailId: email.id, error: error.message });
        }
      }

      const duration = (Date.now() - startTime) / 1000;
      logger.info(`Processing complete in ${duration}s`, stats);
      
      return stats;
    } catch (error) {
      logger.error('Error during email processing:', error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  async processEmail(email, stats) {
    logger.info(`Processing email: ${email.content.headers.subject}`);

    // Check if this email contains receipts
    const detection = await receiptDetector.isReceipt(email.content, email.attachments);
    
    if (!detection.isReceipt) {
      logger.info(`No receipt detected in email ${email.id}`);
      return;
    }

    stats.receiptsFound++;
    logger.info(`Receipt detected with ${detection.confidence} confidence`);

    // Process each attachment
    for (const attachment of email.attachments) {
      try {
        // Check if attachment is likely a receipt
        const attachmentAnalysis = detection.attachmentAnalysis.find(
          a => a.filename === attachment.filename
        );
        
        if (!attachmentAnalysis || !attachmentAnalysis.isReceipt) {
          logger.info(`Skipping non-receipt attachment: ${attachment.filename}`);
          continue;
        }

        // Process the file (PDF/Image with OCR)
        const processedFile = await fileProcessor.processAttachment(attachment);
        
        if (processedFile && processedFile.text) {
          // Extract receipt data from processed text
          const fullText = email.content.text + '\n' + processedFile.text;
          const receiptData = receiptDetector.extractReceiptData(
            { text: fullText, headers: email.content.headers },
            [attachment]
          );

          // Upload to Google Drive
          const uploadResult = await this.driveService.uploadReceipt(
            attachment,
            email,
            receiptData
          );

          if (uploadResult.success) {
            stats.receiptsUploaded++;
            logger.info(`Successfully uploaded ${attachment.filename} to Google Drive`);
            logger.info(`File URL: ${uploadResult.file.webViewLink}`);
          }
        }
      } catch (error) {
        logger.error(`Error processing attachment ${attachment.filename}:`, error);
        stats.errors.push({ 
          emailId: email.id, 
          attachment: attachment.filename, 
          error: error.message 
        });
      }
    }
  }

  async run() {
    if (!await this.initialize()) {
      logger.error('Failed to initialize, exiting...');
      process.exit(1);
    }

    // Run immediately
    await this.processEmails();

    // Schedule if cron is enabled
    const cronSchedule = process.env.CRON_SCHEDULE;
    if (cronSchedule && cronSchedule !== 'disabled') {
      logger.info(`Scheduling automatic collection: ${cronSchedule}`);
      
      cron.schedule(cronSchedule, async () => {
        logger.info('Running scheduled email collection...');
        await this.processEmails();
      });

      logger.info('Scheduler started. Press Ctrl+C to stop.');
      
      // Keep the process running
      process.stdin.resume();
    }
  }

  async runOnce() {
    if (!await this.initialize()) {
      logger.error('Failed to initialize, exiting...');
      process.exit(1);
    }

    const stats = await this.processEmails();
    
    console.log('\n=== Processing Summary ===');
    console.log(`Emails processed: ${stats.emailsProcessed}`);
    console.log(`Receipts found: ${stats.receiptsFound}`);
    console.log(`Receipts uploaded: ${stats.receiptsUploaded}`);
    
    if (stats.errors.length > 0) {
      console.log(`\nErrors encountered: ${stats.errors.length}`);
      stats.errors.forEach(err => {
        console.log(`- Email ${err.emailId}: ${err.error}`);
      });
    }
  }
}

// Main execution
if (require.main === module) {
  const collector = new EmailReceiptCollector();
  
  // Check command line arguments
  const args = process.argv.slice(2);
  
  if (args.includes('--once')) {
    // Run once and exit
    collector.runOnce().catch(error => {
      logger.error('Fatal error:', error);
      process.exit(1);
    });
  } else {
    // Run with scheduler
    collector.run().catch(error => {
      logger.error('Fatal error:', error);
      process.exit(1);
    });
  }
}

module.exports = EmailReceiptCollector;