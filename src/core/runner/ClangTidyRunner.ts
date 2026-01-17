// Clang-Tidy Runner - Executes Clang-Tidy commands
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { RunOptions, RunResult, ParallelResult, ClangTidyDiagnostic } from '../../types';
import { ProcessUtils } from '../../utils/processUtils';
import { ConfigManager } from '../config/ConfigManager';
import { logger } from '../../utils/logger';
import { FileUtils } from '../../utils/fileUtils';

export class ClangTidyRunner {
  private configManager: ConfigManager;
  private clangTidyPath: string;
  private compileCommandsPath: string;

  constructor(configManager: ConfigManager) {
    this.configManager = configManager;
    this.clangTidyPath = configManager.getClangTidyPath();
    this.compileCommandsPath = configManager.getCompileCommandsPath();
  }

  /**
   * Run Clang-Tidy analysis on multiple files
   */
  async runAnalysis(files: string[], options: RunOptions = {}): Promise<RunResult> {
    logger.info('Running Clang-Tidy analysis on ' + files.length + ' files');
    
    // Build command arguments
    const args = this.buildArguments(files, options);
    logger.debug('Clang-Tidy command: ' + this.clangTidyPath + ' ' + args.join(' '));
    
    const startTime = Date.now();
    
    try {
      // Execute command from workspace root directory
      // This ensures Clang-Tidy can find .clang-tidy file in the workspace
      const options = {
        cwd: vscode.workspace.workspaceFolders?.[0].uri.fsPath || process.cwd()
      };
      const result = await ProcessUtils.executeCommand(this.clangTidyPath, args, options);
      
      // Clang-Tidy outputs diagnostics to stdout
      return {
        rawOutput: result.stdout,
        errorOutput: result.stderr,
        exitCode: result.exitCode,
        duration: Date.now() - startTime
      };
    } catch (error) {
      logger.error('Failed to execute Clang-Tidy', error as Error);
      return {
        rawOutput: '',
        errorOutput: error instanceof Error ? error.message : String(error),
        exitCode: 1,
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Run Clang-Tidy in parallel on multiple batches of files
   */
  async runParallel(files: string[], options: RunOptions = {}, onProgress?: (completed: number, total: number) => void): Promise<ParallelResult[]> {
    logger.info('Running Clang-Tidy analysis in parallel on ' + files.length + ' files');
    
    const maxJobs = this.configManager.getParallelJobs();
    const batchSize = Math.ceil(files.length / maxJobs);
    const batches = ProcessUtils.splitArray(files, batchSize);
    
    logger.debug('Using ' + maxJobs + ' parallel jobs, batch size: ' + batchSize);
    
    // Create tasks for each batch
    // Set cwd to workspace root to ensure .clang-tidy file is found
    const cwd = vscode.workspace.workspaceFolders?.[0].uri.fsPath || process.cwd();
    const tasks = batches.map((batch) => {
      return {
        command: this.clangTidyPath,
        args: this.buildArguments(batch, options),
        options: { cwd }
      };
    });
    
    // Execute tasks in parallel
    const results = await ProcessUtils.executeParallel(tasks, maxJobs, onProgress);
    
    // Map results to ParallelResult
    // Clang-Tidy outputs diagnostics to stdout
    return results.map((result, index) => ({
      rawOutput: result.stdout,
      errorOutput: result.stderr,
      exitCode: result.exitCode,
      duration: result.duration,
      files: batches[index]
    }));
  }

  /**
   * Build Clang-Tidy command arguments
   */
  private buildArguments(files: string[], options: RunOptions): string[] {
    const args: string[] = [];
    
    // Check if .clang-tidy file exists in workspace root
    let clangTidyConfigPath: string | null = null;
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
    if (workspaceRoot) {
      clangTidyConfigPath = path.join(workspaceRoot, '.clang-tidy');
      if (fs.existsSync(clangTidyConfigPath)) {
        logger.debug('Found .clang-tidy file at: ' + clangTidyConfigPath);
        args.push('--config-file=' + clangTidyConfigPath);
      } else {
        logger.debug('No .clang-tidy file found at workspace root: ' + workspaceRoot);
        clangTidyConfigPath = null;
        
        // Only add checks parameter if no .clang-tidy file exists
        const checks = options.checks || this.configManager.getChecks();
        const finalChecks = checks || '*';
        args.push('-checks=' + finalChecks);
      }
    } else {
      // No workspace root, add checks parameter if configured
      const checks = options.checks || this.configManager.getChecks();
      const finalChecks = checks || '*';
      args.push('-checks=' + finalChecks);
    }
    
    // Header Filter - respect .clang-tidy's HeaderFilterRegex if it exists
    const headerFilter = options.headerFilter || this.configManager.getHeaderFilter();
    if (headerFilter) {
      // Only add header-filter if explicitly configured by user
      args.push('-header-filter=' + headerFilter);
    } else if (!clangTidyConfigPath && workspaceRoot) {
      // Only add default header-filter if no .clang-tidy file exists
      args.push('-header-filter=' + workspaceRoot);
    }
    // If .clang-tidy file exists and has HeaderFilterRegex, respect that instead
    if (clangTidyConfigPath) {
      logger.debug('Using HeaderFilterRegex from .clang-tidy file');
    }
    
    // Fix
    if (options.fix) {
      args.push('-fix');
    }
    
    // Compile Commands - Always add compile_commands.json path
    // This ensures Clang-Tidy can find compilation database
    const compileCommandsPath = this.configManager.getCompileCommandsPath();
    if (compileCommandsPath) {
      args.push('-p=' + compileCommandsPath);
      logger.debug('Added compile commands path: ' + compileCommandsPath);
    } else {
      logger.warn('No compile commands path found - this might cause issues');
    }
    
    // Extra Arguments
    const extraArgs = options.extraArgs || this.configManager.getExtraArgs();
    if (extraArgs && extraArgs.length > 0) {
      extraArgs.forEach(arg => args.push(arg));
    }
    
    // Files - only include C++ files
    const cppFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.cpp', '.hpp', '.cc', '.hh', '.cxx', '.hxx', '.c', '.h'].includes(ext);
    });
    args.push(...cppFiles);
    
    return args;
  }

  /**
   * Check if Clang-Tidy is available
   */
  async checkClangTidyAvailable(): Promise<boolean> {
    logger.info('Checking if Clang-Tidy is available');
    
    try {
      const result = await ProcessUtils.executeCommand(this.clangTidyPath, ['--version']);
      const isAvailable = result.exitCode === 0 && result.stdout.includes('LLVM');
      
      if (isAvailable) {
        logger.info('Clang-Tidy found: ' + result.stdout.trim());
      } else {
        logger.warn('Clang-Tidy not found or incompatible: ' + result.stdout + ' ' + result.stderr);
      }
      
      return isAvailable;
    } catch (error) {
      logger.error('Failed to check Clang-Tidy availability', error as Error);
      return false;
    }
  }

  /**
   * List available checks
   */
  async listAvailableChecks(): Promise<string[]> {
    logger.info('Listing available Clang-Tidy checks');
    
    try {
      const args = ['-list-checks'];
      if (this.compileCommandsPath) {
        args.push('-p=' + this.compileCommandsPath);
      }
      args.push('-');
      
      const result = await ProcessUtils.executeCommand(this.clangTidyPath, args);
      
      if (result.exitCode !== 0) {
        logger.error('Failed to list checks: ' + result.stderr);
        return [];
      }
      
      // Parse checks from output
      const checks = this.parseChecksList(result.stdout);
      logger.debug('Found ' + checks.length + ' available checks');
      
      return checks;
    } catch (error) {
      logger.error('Failed to list checks', error as Error);
      return [];
    }
  }

  /**
   * Parse checks list from Clang-Tidy output
   */
  private parseChecksList(output: string): string[] {
    const checks: string[] = [];
    const lines = output.split('\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('-') && !trimmedLine.startsWith('Checks')) {
        checks.push(trimmedLine);
      }
    }
    
    return checks;
  }

  /**
   * Refresh configuration
   */
  refreshConfiguration(): void {
    this.clangTidyPath = this.configManager.getClangTidyPath();
    this.compileCommandsPath = this.configManager.getCompileCommandsPath();
    logger.info('Clang-Tidy Runner configuration refreshed');
  }
}