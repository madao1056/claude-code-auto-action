/**
 * @module settingsLoader
 * @description Utility module for loading and managing Claude settings
 */

const fs = require('fs');
const path = require('path');

/**
 * Load settings from both default and local settings files
 * @param {string} basePath - Base path for settings files (defaults to project root)
 * @returns {Object} Merged settings object
 */
function loadSettings(basePath = path.join(__dirname, '..')) {
  try {
    const settingsPath = path.join(basePath, '.claude', 'settings.json');
    const localSettingsPath = path.join(basePath, '.claude', 'settings.local.json');
    
    let settings = {};
    
    // Load default settings
    if (fs.existsSync(settingsPath)) {
      settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    }
    
    // Load and merge local settings
    if (fs.existsSync(localSettingsPath)) {
      const localSettings = JSON.parse(fs.readFileSync(localSettingsPath, 'utf8'));
      settings = deepMerge(settings, localSettings);
    }
    
    return settings;
  } catch (error) {
    console.error('Failed to load settings:', error.message);
    return {};
  }
}

/**
 * Load settings from user's home directory
 * @returns {Object} User settings object
 */
function loadUserSettings() {
  try {
    const claudeSettingsPath = path.join(
      process.env.HOME || process.env.USERPROFILE || '',
      '.claude',
      'settings.json'
    );
    
    if (fs.existsSync(claudeSettingsPath)) {
      return JSON.parse(fs.readFileSync(claudeSettingsPath, 'utf8'));
    }
  } catch (error) {
    console.warn('Could not load Claude user settings:', error.message);
  }
  return {};
}

/**
 * Deep merge two objects
 * @param {Object} target - Target object
 * @param {Object} source - Source object to merge from
 * @returns {Object} Merged object
 */
function deepMerge(target, source) {
  const output = Object.assign({}, target);
  
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          Object.assign(output, { [key]: source[key] });
        } else {
          output[key] = deepMerge(target[key], source[key]);
        }
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    });
  }
  
  return output;
}

/**
 * Check if value is a plain object
 * @param {*} item - Item to check
 * @returns {boolean} True if item is a plain object
 */
function isObject(item) {
  return item && typeof item === 'object' && !Array.isArray(item);
}

module.exports = {
  loadSettings,
  loadUserSettings,
  deepMerge
};