import * as fs from 'fs';
import * as path from 'path';

export interface FileScanOptions {
  extensions?: string[];
  excludeDirs?: string[];
  excludePatterns?: RegExp[];
  includeHidden?: boolean;
  maxDepth?: number;
}

export class FileScanner {
  private static readonly DEFAULT_EXCLUDE_DIRS = [
    'node_modules',
    '.git',
    'dist',
    'build',
    'coverage',
    '.next',
    '.cache'
  ];

  /**
   * Recursively scan directory for files matching criteria
   */
  static async scanFiles(
    directory: string,
    options: FileScanOptions = {}
  ): Promise<string[]> {
    const {
      extensions = [],
      excludeDirs = this.DEFAULT_EXCLUDE_DIRS,
      excludePatterns = [],
      includeHidden = false,
      maxDepth = 10
    } = options;

    const files: string[] = [];
    
    const scan = async (dir: string, depth: number = 0): Promise<void> => {
      if (depth > maxDepth) return;
      
      try {
        const entries = await fs.promises.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          
          // Skip hidden files/dirs unless explicitly included
          if (!includeHidden && entry.name.startsWith('.')) {
            continue;
          }
          
          if (entry.isDirectory()) {
            // Skip excluded directories
            if (excludeDirs.includes(entry.name)) {
              continue;
            }
            
            // Recursively scan subdirectory
            await scan(fullPath, depth + 1);
          } else if (entry.isFile()) {
            // Check if file matches extension filter
            if (extensions.length > 0) {
              const ext = path.extname(entry.name);
              if (!extensions.includes(ext)) {
                continue;
              }
            }
            
            // Check exclude patterns
            const shouldExclude = excludePatterns.some(pattern => 
              pattern.test(fullPath)
            );
            
            if (!shouldExclude) {
              files.push(fullPath);
            }
          }
        }
      } catch (error) {
        console.warn(`Failed to scan directory ${dir}:`, error);
      }
    };
    
    await scan(directory);
    return files;
  }

  /**
   * Find files by glob pattern
   */
  static async findFilesByPattern(
    directory: string,
    pattern: RegExp,
    options: FileScanOptions = {}
  ): Promise<string[]> {
    const allFiles = await this.scanFiles(directory, options);
    return allFiles.filter(file => pattern.test(file));
  }

  /**
   * Get file stats with error handling
   */
  static async getFileStats(filePath: string): Promise<fs.Stats | null> {
    try {
      return await fs.promises.stat(filePath);
    } catch {
      return null;
    }
  }

  /**
   * Read file content safely
   */
  static async readFileSafe(filePath: string): Promise<string | null> {
    try {
      return await fs.promises.readFile(filePath, 'utf-8');
    } catch {
      return null;
    }
  }
}