/**
 * @module notification
 * @description Utility module for handling notifications and sounds
 */

const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

/**
 * Play a system sound
 * @param {string} soundName - Name of the system sound (e.g., 'Pop', 'Glass', 'Ping')
 * @returns {Promise<void>}
 */
async function playSound(soundName = 'Pop') {
  try {
    const command = `afplay "/System/Library/Sounds/${soundName}.aiff" 2>/dev/null &`;
    await execAsync(command);
  } catch (error) {
    // Silently fail - sound is not critical
    console.debug('Sound playback failed:', error.message);
  }
}

/**
 * Show a desktop notification
 * @param {Object} options - Notification options
 * @param {string} options.title - Notification title
 * @param {string} options.message - Notification message
 * @param {string} [options.sound] - Sound name to play with notification
 * @returns {Promise<void>}
 */
async function showNotification({ title, message, sound }) {
  try {
    let command = `osascript -e 'display notification "${message}" with title "${title}"`;
    if (sound) {
      command += ` sound name "${sound}"`;
    }
    command += `' 2>/dev/null &`;
    
    await execAsync(command);
  } catch (error) {
    console.debug('Desktop notification failed:', error.message);
  }
}

/**
 * Handle task completion notification
 * @param {Object} taskInfo - Task information
 * @param {string} taskInfo.status - Task status (completed, failed, warning)
 * @param {string} taskInfo.name - Task name
 * @param {number} [taskInfo.count] - Number of tasks completed
 * @param {Object} settings - Notification settings
 * @returns {Promise<void>}
 */
async function notifyTaskCompletion(taskInfo, settings = {}) {
  // Check if notifications are enabled
  if (settings.notifications?.enabled === false) {
    return;
  }
  
  const { status, name, count } = taskInfo;
  const sounds = settings.notifications?.sounds || {
    success: 'Glass',
    error: 'Basso',
    warning: 'Pop',
    info: 'Pop'
  };
  
  let sound, title, message;
  
  switch (status) {
    case 'completed':
      sound = sounds.success;
      title = 'Task Completed';
      message = count > 1 ? `${count} tasks completed` : `${name} completed`;
      break;
    case 'failed':
      sound = sounds.error;
      title = 'Task Failed';
      message = `${name} failed`;
      break;
    case 'warning':
      sound = sounds.warning;
      title = 'Warning';
      message = name;
      break;
    default:
      sound = sounds.info;
      title = 'Task Update';
      message = name;
  }
  
  // Play sound
  await playSound(sound);
  
  // Show desktop notification if enabled
  if (settings.notifications?.desktop !== false) {
    await showNotification({ title, message, sound });
  }
}

/**
 * Handle confirmation prompt notification
 * @param {Object} settings - Notification settings
 * @returns {Promise<void>}
 */
async function notifyConfirmationPrompt(settings = {}) {
  if (settings.notifications?.enabled === false) {
    return;
  }
  
  const sound = settings.notifications?.sounds?.info || 'Pop';
  await playSound(sound);
  
  if (settings.notifications?.desktop) {
    await showNotification({
      title: 'Claude Code',
      message: 'Confirmation required',
      sound
    });
  }
}

module.exports = {
  playSound,
  showNotification,
  notifyTaskCompletion,
  notifyConfirmationPrompt
};