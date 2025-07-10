/**
 * Common type definitions for Claude Code Auto Action
 */

// Package.json structure
export interface PackageJson {
  name: string;
  version: string;
  description?: string;
  main?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  engines?: Record<string, string>;
  [key: string]: any;
}

// Project analysis result
export interface ProjectAnalysis {
  projectType: 'node' | 'react' | 'vue' | 'angular' | 'python' | 'ruby' | 'go' | 'unknown';
  framework?: string;
  language: string;
  dependencies: string[];
  devDependencies: string[];
  hasTests: boolean;
  hasDocker: boolean;
  hasCI: boolean;
  entryPoints: string[];
  structure: ProjectStructure;
}

export interface ProjectStructure {
  directories: string[];
  mainFiles: string[];
  testFiles: string[];
  configFiles: string[];
  totalFiles: number;
}

// Agent message payload types
export interface TaskAssignment {
  taskId: string;
  description: string;
  requirements: string[];
  dependencies?: string[];
  priority: 'low' | 'medium' | 'high';
}

export interface TaskUpdate {
  taskId: string;
  status: 'in-progress' | 'completed' | 'failed';
  progress?: number;
  message?: string;
}

export interface TaskResult {
  taskId: string;
  success: boolean;
  output?: any;
  error?: string;
  artifacts?: Artifact[];
}

export interface Artifact {
  type: 'file' | 'code' | 'documentation' | 'test';
  path: string;
  content: string;
}

// Error fix types
export interface ErrorInfo {
  type: 'typescript' | 'eslint' | 'test' | 'build' | 'runtime';
  file: string;
  line?: number;
  column?: number;
  message: string;
  code?: string;
  severity: 'error' | 'warning' | 'info';
}

export interface FixResult {
  file: string;
  original: string;
  fixed: string;
  changes: number;
  success: boolean;
  error?: string;
}

// Dependency analysis types
export interface DependencyAnalysis {
  missing: string[];
  unused: string[];
  outdated: OutdatedPackage[];
  vulnerabilities: Vulnerability[];
  suggestions: DependencySuggestion[];
}

export interface OutdatedPackage {
  name: string;
  current: string;
  wanted: string;
  latest: string;
  type: 'dependencies' | 'devDependencies';
}

export interface Vulnerability {
  name: string;
  severity: 'info' | 'low' | 'moderate' | 'high' | 'critical';
  vulnerable_versions: string;
  patched_versions: string;
  recommendation: string;
}

export interface DependencySuggestion {
  package: string;
  reason: string;
  alternative?: string;
}

// Test generation types
export interface TestCase {
  name: string;
  type: 'unit' | 'integration' | 'e2e';
  code: string;
  assertions: number;
}

export interface CoverageReport {
  statements: CoverageMetric;
  branches: CoverageMetric;
  functions: CoverageMetric;
  lines: CoverageMetric;
}

export interface CoverageMetric {
  total: number;
  covered: number;
  skipped: number;
  percentage: number;
}

// Code quality types
export interface CodeSmell {
  type: 'duplicate' | 'long-method' | 'complex-condition' | 'dead-code';
  file: string;
  startLine: number;
  endLine: number;
  description: string;
  severity: 'low' | 'medium' | 'high';
  suggestion?: string;
}

export interface RefactoringAction {
  type: 'extract-method' | 'extract-variable' | 'simplify-condition' | 'remove-duplicate';
  file: string;
  startLine: number;
  endLine: number;
  description: string;
  preview?: string;
}