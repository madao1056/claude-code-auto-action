const fs = require('fs');
const path = require('path');

class ConfigLoader {
  constructor() {
    this.cache = new Map();
    this.configPaths = [
      path.join(process.env.HOME, '.claude', 'settings.json'),
      path.join(process.cwd(), '.claude', 'settings.json'),
      path.join(__dirname, '..', '.claude', 'settings.json'),
    ];
  }

  loadSettings(forceReload = false) {
    const cacheKey = 'settings';

    if (!forceReload && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    for (const configPath of this.configPaths) {
      try {
        if (fs.existsSync(configPath)) {
          const content = fs.readFileSync(configPath, 'utf8');
          const settings = JSON.parse(content);
          this.cache.set(cacheKey, settings);
          return settings;
        }
      } catch (error) {
        console.error(`Error loading config from ${configPath}:`, error.message);
      }
    }

    // Return default settings if no config file found
    const defaultSettings = this.getDefaultSettings();
    this.cache.set(cacheKey, defaultSettings);
    return defaultSettings;
  }

  getDefaultSettings() {
    return {
      automation: {
        enabled: false,
        docker: {
          enabled: false,
          skip_confirmation: false,
          patterns: [],
        },
      },
      notifications: {
        enabled: true,
        sound: true,
      },
      permissions: {
        allow: ['*'],
        deny: [],
      },
    };
  }

  getSetting(path, defaultValue = null) {
    const settings = this.loadSettings();
    const parts = path.split('.');
    let current = settings;

    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return defaultValue;
      }
    }

    return current;
  }

  clearCache() {
    this.cache.clear();
  }
}

module.exports = new ConfigLoader();
