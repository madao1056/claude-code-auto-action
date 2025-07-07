/**
 * @module utils
 * @description Main entry point for utility modules
 */

// Settings management
const settingsLoader = require('./settingsLoader');

// Notification handling
const notification = require('./notification');

// Command building
const commandBuilder = require('./commandBuilder');

// Process management
const processManager = require('./processManager');

module.exports = {
  // Settings
  loadSettings: settingsLoader.loadSettings,
  loadUserSettings: settingsLoader.loadUserSettings,
  deepMerge: settingsLoader.deepMerge,
  
  // Notifications
  playSound: notification.playSound,
  showNotification: notification.showNotification,
  notifyTaskCompletion: notification.notifyTaskCompletion,
  notifyConfirmationPrompt: notification.notifyConfirmationPrompt,
  
  // Command building
  buildCommand: commandBuilder.buildCommand,
  escapeShellArg: commandBuilder.escapeShellArg,
  buildEnvironment: commandBuilder.buildEnvironment,
  
  // Process management
  spawnProcess: processManager.spawnProcess,
  waitForProcessReady: processManager.waitForProcessReady,
  gracefulShutdown: processManager.gracefulShutdown,
  createProcessMonitor: processManager.createProcessMonitor
};