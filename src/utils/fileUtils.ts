// File System Utilities
import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'glob';
import * as vscode from 'vscode';
import { logger } from './logger';

export class FileUtils {
  /**
   * Check if a file exists
   */
  static exists(filePath: string): boolean {
    return fs.existsSync(filePath);
  }

  /**
   * Read file content
   */
  static readFile(filePath: string, encoding: BufferEncoding = 'utf8'): string {
    return fs.readFileSync(filePath, encoding);
  }

  /**
   * Write file content
   */
  static writeFile(filePath: string, content: string, encoding: BufferEncoding = 'utf8'): void {
    // Ensure directory exists
    const dirPath = path.dirname(filePath);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    fs.writeFileSync(filePath, content, encoding);
  }

  /**
   * Parse JSON file
   */
  static readJson<T>(filePath: string): T {
    const content = this.readFile(filePath);
    return JSON.parse(content) as T;
  }

  /**
   * Write JSON file
   */
  static writeJson(filePath: string, data: any, pretty: boolean = true): void {
    const content = pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
    this.writeFile(filePath, content);
  }

  /**
   * Find compile database file
   */
  static findCompileCommands(directory: string): string | null {
    const compileCommandsFile = 'compile_commands.json';
    const commonBuildDirs = [
      'build',
      'cmake-build-debug',
      'cmake-build-release',
      'cmake-build-*',
      'out/debug',
      'out/release'
    ];
    
    logger.debug(`Searching for compile_commands.json in: ${directory}`);
    
    // 1. First, check specific locations in order of priority
    //    This ensures we find the right compile_commands.json
    const priorityLocations = [
      // Check build directory first (most common)
      path.join(directory, 'build', compileCommandsFile),
      // Check cmake build directories
      path.join(directory, 'cmake-build-debug', compileCommandsFile),
      path.join(directory, 'cmake-build-release', compileCommandsFile),
      // Check .vscode directory as last resort
      path.join(directory, '.vscode', compileCommandsFile)
    ];
    
    for (const location of priorityLocations) {
      if (fs.existsSync(location)) {
        logger.debug(`Found compile_commands.json at priority location: ${location}`);
        return location;
      }
      logger.debug(`Not found at priority location: ${location}`);
    }
    
    // 2. Check wildcard build directories
    for (const buildDir of commonBuildDirs) {
      if (buildDir.includes('*')) {
        const globPath = path.join(directory, buildDir, compileCommandsFile);
        const matches = glob.sync(globPath);
        if (matches.length > 0) {
          logger.debug(`Found compile_commands.json with wildcard pattern ${buildDir}: ${matches[0]}`);
          return matches[0];
        }
      }
    }
    
    // 3. Search recursively in all subdirectories except certain ones
    const filesInCurrentDir = this.findFiles(directory, compileCommandsFile);
    if (filesInCurrentDir.length > 0) {
      // Sort files by priority (prefer build directories)
      const sortedFiles = filesInCurrentDir.sort((a, b) => {
        // Give higher priority to files in build directories
        const aIsInBuild = a.includes('\\build\\') || a.includes('/build/');
        const bIsInBuild = b.includes('\\build\\') || b.includes('/build/');
        if (aIsInBuild && !bIsInBuild) return -1;
        if (!aIsInBuild && bIsInBuild) return 1;
        return 0;
      });
      logger.debug(`Found compile_commands.json via recursive search: ${sortedFiles[0]}`);
      return sortedFiles[0];
    }
    
    // 4. Search upwards until root directory
    let currentDir = directory;
    while (true) {
      // Search common build subdirectories in current directory
      for (const buildDir of commonBuildDirs) {
        const filePath = path.join(currentDir, buildDir, compileCommandsFile);
        if (fs.existsSync(filePath)) {
          logger.debug(`Found compile_commands.json in parent directory: ${filePath}`);
          return filePath;
        }
        
        // Handle wildcard directories (cmake-build-*)
        if (buildDir.includes('*')) {
          const globPath = path.join(currentDir, buildDir, compileCommandsFile);
          const matches = glob.sync(globPath);
          if (matches.length > 0) {
            logger.debug(`Found compile_commands.json with wildcard in parent: ${matches[0]}`);
            return matches[0];
          }
        }
      }
      
      // Check if current directory has compile_commands.json
      const filePath = path.join(currentDir, compileCommandsFile);
      if (fs.existsSync(filePath)) {
        logger.debug(`Found compile_commands.json in parent directory root: ${filePath}`);
        return filePath;
      }
      
      // Continue searching upwards
      const parentDir = path.dirname(currentDir);
      if (parentDir === currentDir) {
        // Reached root directory
        logger.debug(`No compile_commands.json found after exhaustive search`);
        return null;
      }
      currentDir = parentDir;
    }
  }
  
  /**
   * Recursively find files in directory
   */
  private static findFiles(directory: string, filename: string): string[] {
    const files: string[] = [];
    
    try {
      const entries = fs.readdirSync(directory, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(directory, entry.name);
        
        if (entry.isDirectory()) {
          // Skip certain directories for performance
          if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'third_party') {
            continue;
          }
          
          // Recursively search subdirectories
          const subFiles = this.findFiles(fullPath, filename);
          files.push(...subFiles);
        } else if (entry.isFile() && entry.name === filename) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Ignore inaccessible directories
    }
    
    return files;
  }

  /**
   * Convert path to absolute path
   */
  static makeAbsolute(filePath: string, baseDir: string): string {
    if (path.isAbsolute(filePath)) {
      return filePath;
    }
    return path.normalize(path.join(baseDir, filePath));
  }

  /**
   * Filter file paths (ignore third-party libraries, etc.)
   */
  static filterFiles(files: string[], ignorePatterns: string[] = []): string[] {
    return files.filter(file => {
      const lowerFile = file.toLowerCase();
      return !ignorePatterns.some(pattern => lowerFile.includes(pattern.toLowerCase()));
    });
  }

  /**
   * Parse file content line offset
   */
  static offsetToLine(content: string, offset: number): number {
    const lines = content.substring(0, offset).split('\n');
    return lines.length;
  }

  /**
   * Get workspace root directory
   */
  static getWorkspaceRoot(): string | null {
    if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
      return vscode.workspace.workspaceFolders[0].uri.fsPath;
    }
    return null;
  }

  /**
   * Parse variables in configuration paths
   */
  static resolvePath(path: string): string {
    const workspaceRoot = this.getWorkspaceRoot();
    return path
      .replace(/\${workspaceFolder}/g, workspaceRoot || '')
      .replace(/\${userHome}/g, process.env.USERPROFILE || '');
  }
}
