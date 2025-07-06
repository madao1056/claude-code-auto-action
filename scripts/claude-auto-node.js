#!/usr/bin/env node

const { spawn } = require('child_process');
const readline = require('readline');

// Auto-response patterns
const responsePatterns = [
  { pattern: /Do you want to proceed\?/i, response: 'yes' },
  { pattern: /Do you want to make this edit/i, response: 'yes' },
  { pattern: /Save file to continue/i, response: '' },
  { pattern: /Opened changes in Cursor/i, response: '' },
  { pattern: /Bash command.*Do you want to proceed/i, response: 'yes' },
  { pattern: /Are you sure/i, response: 'yes' },
  { pattern: /Continue\?/i, response: 'yes' },
  { pattern: /Confirm/i, response: 'yes' },
  { pattern: /Overwrite/i, response: 'yes' },
  { pattern: /\(Y\/n\)/i, response: 'Y' },
  { pattern: /\(y\/N\)/i, response: 'y' },
  { pattern: /yes\/no/i, response: 'yes' },
  { pattern: /Press.*to continue/i, response: '' },
  { pattern: /Enter to continue/i, response: '' },
  { pattern: /Would you like to/i, response: 'yes' },
  { pattern: /Create.*\?/i, response: 'yes' },
  { pattern: /Install.*\?/i, response: 'yes' },
  { pattern: /Execute.*\?/i, response: 'yes' },
  { pattern: /Run.*\?/i, response: 'yes' },
  { pattern: /Apply.*\?/i, response: 'yes' },
  { pattern: /Update.*\?/i, response: 'yes' },
  { pattern: /Delete.*\?/i, response: 'yes' },
  { pattern: /Remove.*\?/i, response: 'yes' },
];

// Set environment variables
process.env.CLAUDE_AUTO_APPROVE = 'true';
process.env.CLAUDE_SKIP_CONFIRMATION = 'true';
process.env.CLAUDE_NON_INTERACTIVE = 'true';
process.env.CLAUDE_PERMISSIONS_MODE = 'bypassPermissions';

// Get command line arguments
const args = process.argv.slice(2);

// Spawn Claude process
const claude = spawn('claude', [
  '--dangerously-skip-permissions',
  '--non-interactive',
  '--auto-approve',
  ...args
], {
  stdio: ['pipe', 'pipe', 'pipe']
});

// Create readline interface for stdout
const rlOut = readline.createInterface({
  input: claude.stdout,
  terminal: false
});

// Create readline interface for stderr
const rlErr = readline.createInterface({
  input: claude.stderr,
  terminal: false
});

// Buffer for collecting output
let outputBuffer = '';

// Function to check and respond to prompts
function checkAndRespond(line) {
  outputBuffer += line + '\n';
  console.log(line);
  
  // Check if line matches any pattern
  for (const { pattern, response } of responsePatterns) {
    if (pattern.test(outputBuffer)) {
      // Send response
      claude.stdin.write(response + '\n');
      outputBuffer = ''; // Clear buffer after responding
      break;
    }
  }
  
  // Clear buffer if it gets too large
  if (outputBuffer.length > 1000) {
    outputBuffer = outputBuffer.slice(-500);
  }
}

// Handle stdout
rlOut.on('line', checkAndRespond);

// Handle stderr
rlErr.on('line', (line) => {
  console.error(line);
  checkAndRespond(line);
});

// Handle process exit
claude.on('exit', (code) => {
  process.exit(code);
});

// Handle errors
claude.on('error', (err) => {
  console.error('Failed to start Claude:', err);
  process.exit(1);
});

// Handle Ctrl+C
process.on('SIGINT', () => {
  claude.kill('SIGINT');
  process.exit(130);
});