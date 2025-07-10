/**
 * Central configuration constants for Claude Code Auto Action
 */

// Agent Communication
export const AGENT_CONFIG = {
  COMMUNICATION_PORT: 8765,
  TASK_TIMEOUT: 30000, // 30 seconds
  OVERALL_TIMEOUT: 60000, // 60 seconds
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000
} as const;

// Code Analysis Thresholds
export const CODE_ANALYSIS = {
  DUPLICATE_THRESHOLD: 30, // lines
  MAX_METHOD_LINES: 50,
  MAX_COMPLEXITY: 10,
  MIN_TEST_COVERAGE: 80 // percentage
} as const;

// Thinking Mode Tokens
export const THINKING_TOKENS = {
  think: 4000,
  think_hard: 10000,
  think_harder: 20000,
  ultrathink: 31999
} as const;

// File Patterns
export const FILE_PATTERNS = {
  SOURCE_EXTENSIONS: ['.ts', '.tsx', '.js', '.jsx'],
  TEST_EXTENSIONS: ['.test.ts', '.test.tsx', '.test.js', '.spec.ts', '.spec.tsx', '.spec.js'],
  CONFIG_FILES: ['package.json', 'tsconfig.json', '.eslintrc', '.prettierrc'],
  IGNORE_DIRS: ['node_modules', '.git', 'dist', 'build', 'coverage', '.next', '.cache']
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  BUILD_FAILED: '❌ ビルドに失敗しました',
  TEST_FAILED: '❌ テストに失敗しました',
  FIX_FAILED: '❌ 修正に失敗しました',
  DEPENDENCY_ERROR: '❌ 依存関係エラー',
  GENERIC_ERROR: '❌ エラーが発生しました'
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  BUILD_SUCCESS: '✅ ビルドが成功しました',
  TEST_SUCCESS: '✅ テストが成功しました',
  FIX_SUCCESS: '✅ 修正が完了しました',
  DEPENDENCY_INSTALLED: '✅ 依存関係をインストールしました'
} as const;

// API Configuration
export const API_CONFIG = {
  DEFAULT_MODEL: 'claude-3-opus-20240229',
  MAX_TOKENS: 4096,
  TEMPERATURE: 0.7,
  TIMEOUT: 30000
} as const;

// Monitoring Thresholds
export const MONITORING_THRESHOLDS = {
  CPU_WARNING: 80, // percentage
  MEMORY_WARNING: 512 * 1024 * 1024, // 512MB in bytes
  DISK_WARNING: 90, // percentage
  RESPONSE_TIME_WARNING: 3000, // milliseconds
  BUNDLE_SIZE_INCREASE_WARNING: 10, // percentage
  PERFORMANCE_REGRESSION_WARNING: 20 // percentage
} as const;