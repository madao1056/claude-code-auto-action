const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');
const { google } = require('googleapis');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (prompt) => {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
};

async function setup() {
  console.log('=== Email Receipt Collector Setup ===\n');

  try {
    // Check if .env exists
    const envPath = path.join(__dirname, '../.env');
    const envExamplePath = path.join(__dirname, '../.env.example');
    
    try {
      await fs.access(envPath);
      console.log('✓ .env file already exists');
    } catch {
      console.log('Creating .env file from .env.example...');
      const envContent = await fs.readFile(envExamplePath, 'utf8');
      await fs.writeFile(envPath, envContent);
      console.log('✓ .env file created');
    }

    // Create necessary directories
    const dirs = ['config', 'logs', 'temp'];
    for (const dir of dirs) {
      const dirPath = path.join(__dirname, '..', dir);
      await fs.mkdir(dirPath, { recursive: true });
      console.log(`✓ Created ${dir} directory`);
    }

    console.log('\n=== Google API Setup ===');
    console.log('\nTo use this tool, you need to:');
    console.log('1. Go to https://console.cloud.google.com/');
    console.log('2. Create a new project or select an existing one');
    console.log('3. Enable Gmail API and Google Drive API');
    console.log('4. Create credentials (OAuth 2.0 Client ID)');
    console.log('5. Download the credentials JSON file');
    console.log('6. Set the redirect URI to: http://localhost:3000/oauth2callback\n');

    const hasCredentials = await question('Do you have the credentials JSON file? (y/n): ');
    
    if (hasCredentials.toLowerCase() === 'y') {
      const credentialsPath = await question('Enter the path to your credentials JSON file: ');
      
      try {
        const credentialsContent = await fs.readFile(credentialsPath.trim(), 'utf8');
        const credentials = JSON.parse(credentialsContent);
        
        // Save credentials
        const configPath = path.join(__dirname, '../config/credentials.json');
        await fs.writeFile(configPath, JSON.stringify(credentials, null, 2));
        console.log('✓ Credentials saved successfully');

        // Get Google Drive folder ID
        console.log('\n=== Google Drive Setup ===');
        console.log('You need a Google Drive folder ID where receipts will be stored.');
        console.log('To get the folder ID:');
        console.log('1. Open Google Drive and navigate to or create the folder');
        console.log('2. The folder ID is in the URL: drive.google.com/drive/folders/[FOLDER_ID]\n');
        
        const folderId = await question('Enter your Google Drive folder ID: ');
        
        // Update .env file
        let envContent = await fs.readFile(envPath, 'utf8');
        envContent = envContent.replace('your_google_drive_folder_id', folderId.trim());
        await fs.writeFile(envPath, envContent);
        console.log('✓ Google Drive folder ID saved');

        console.log('\n=== Setup Complete! ===');
        console.log('\nNext steps:');
        console.log('1. Edit .env file to customize search queries and settings');
        console.log('2. Run "npm install" to install dependencies');
        console.log('3. Run "npm start" to authorize and start collecting receipts');
        console.log('\nThe first run will ask you to authorize the app in your browser.');
        
      } catch (error) {
        console.error('Error reading credentials file:', error.message);
        console.log('Please make sure the file path is correct and the file is valid JSON.');
      }
    } else {
      console.log('\nPlease follow the instructions above to create credentials.');
      console.log('Then run this setup again.');
    }

  } catch (error) {
    console.error('Setup error:', error);
  } finally {
    rl.close();
  }
}

// Run setup
setup().catch(console.error);