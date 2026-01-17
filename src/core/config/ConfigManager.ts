// Config Manager - Clang-Tidy Visualizer
import * as vscode from 'vscode';
import { ExtensionConfiguration } from '../../types';
import { FileUtils } from '../../utils/fileUtils';
import { logger } from '../../utils/logger';

export class ConfigManager {
  private config: ExtensionConfiguration;
  private static instance: ConfigManager | null = null;

  private constructor() {
    this.config = this.loadConfiguration();
    this.setupConfigurationWatcher();
  }

  /**
   * Get ConfigManager instance (Singleton)
   */
  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  /**
   * Load configuration from VSCode settings
   */
  private loadConfiguration(): ExtensionConfiguration {
    const vscodeConfig = vscode.workspace.getConfiguration('clangTidyVisualizer');
    
    logger.debug('Loading configuration from VSCode settings');
    
    return {
      // Clang-Tidy configuration
      clangTidyPath: vscodeConfig.get<string>('clangTidyPath', 'clang-tidy'),
      compileCommandsPath: vscodeConfig.get<string>('compileCommandsPath', ''),
      checks: vscodeConfig.get<string>('checks', '*'),
      headerFilter: vscodeConfig.get<string>('headerFilter', ''),
      fixOnSave: vscodeConfig.get<boolean>('fixOnSave', false),
      parallelJobs: vscodeConfig.get<number | 'auto'>('parallelJobs', 'auto'),
      
      // Report configuration
      report: {
        autoOpen: vscodeConfig.get<boolean>('report.autoOpen', true),
        style: vscodeConfig.get<'modern' | 'dark' | 'minimal'>('report.style', 'modern'),
        includeCharts: vscodeConfig.get<boolean>('report.includeCharts', true),
        outputDir: vscodeConfig.get<string>('report.outputDir', '${workspaceFolder}/.clang-tidy-reports')
      },
      
      // UI configuration
      ui: {
        statusBar: vscodeConfig.get<boolean>('ui.statusBar', true),
        inlineDecorations: vscodeConfig.get<boolean>('ui.inlineDecorations', true),
        problemsPanel: vscodeConfig.get<boolean>('ui.problemsPanel', true)
      },
      
      // Ignore configuration
      ignorePatterns: vscodeConfig.get<string[]>('ignorePatterns', ['third_party', 'node_modules', 'build', 'out']),
      excludeDirectories: vscodeConfig.get<string[]>('excludeDirectories', []),
      
      // Advanced configuration
      extraArgs: vscodeConfig.get<string[]>('extraArgs', []),
      timeout: vscodeConfig.get<number>('timeout', 300000), // 5 minutes
      logLevel: vscodeConfig.get<'error' | 'warn' | 'info' | 'debug'>('logLevel', 'info')
    };
  }

  /**
   * Setup configuration watcher
   */
  private setupConfigurationWatcher(): void {
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('clangTidyVisualizer')) {
        logger.debug('Configuration changed, reloading...');
        this.config = this.loadConfiguration();
      }
    });
  }

  /**
   * Get Clang-Tidy path
   */
  getClangTidyPath(): string {
    return this.config.clangTidyPath;
  }

  /**
   * Get Compile Commands path
   */
  getCompileCommandsPath(): string {
    if (this.config.compileCommandsPath) {
      const resolvedPath = this.resolvePath(this.config.compileCommandsPath);
      logger.debug(`Using configured compile commands path: ${resolvedPath}`);
      return resolvedPath;
    }
    
    // Try to find compile_commands.json in workspace
    const workspaceRoot = FileUtils.getWorkspaceRoot();
    if (workspaceRoot) {
      const compileCommandsPath = FileUtils.findCompileCommands(workspaceRoot);
      if (compileCommandsPath) {
        logger.debug(`Found compile commands path automatically: ${compileCommandsPath}`);
        return compileCommandsPath;
      }
      logger.debug(`No compile_commands.json found in workspace: ${workspaceRoot}`);
    }
    
    // Default path
    const defaultPath = this.resolvePath('${workspaceFolder}/compile_commands.json');
    logger.debug(`Using default compile commands path: ${defaultPath}`);
    return defaultPath;
  }

  /**
   * Get Checks
   */
  getChecks(): string {
    return this.config.checks;
  }

  /**
   * Get Header Filter
   */
  getHeaderFilter(): string {
    return this.config.headerFilter;
  }

  /**
   * Get Fix on Save setting
   */
  getFixOnSave(): boolean {
    return this.config.fixOnSave;
  }

  /**
   * Get Parallel Jobs
   */
  getParallelJobs(): number {
    let jobs: number;
    if (this.config.parallelJobs === 'auto') {
      // Use CPU cores count, but limit to max 8 jobs to prevent resource exhaustion
      jobs = Math.min(require('os').cpus().length, 8);
    } else {
      jobs = this.config.parallelJobs;
    }
    
    // Ensure at least 1 job and max 8 jobs
    return Math.max(1, Math.min(jobs, 8));
  }

  /**
   * Get Report Configuration
   */
  getReportConfig(): ExtensionConfiguration['report'] {
    return this.config.report;
  }

  /**
   * Get UI Configuration
   */
  getUIConfig(): ExtensionConfiguration['ui'] {
    return this.config.ui;
  }

  /**
   * Get Ignore Patterns
   */
  getIgnorePatterns(): string[] {
    return this.config.ignorePatterns;
  }

  /**
   * Get Exclude Directories
   */
  getExcludeDirectories(): string[] {
    return this.config.excludeDirectories;
  }

  /**
   * Get Extra Arguments
   */
  getExtraArgs(): string[] {
    return this.config.extraArgs;
  }

  /**
   * Get Timeout
   */
  getTimeout(): number {
    return this.config.timeout;
  }

  /**
   * Get Log Level
   */
  getLogLevel(): ExtensionConfiguration['logLevel'] {
    return this.config.logLevel;
  }

  /**
   * Resolve path with variables
   */
  resolvePath(path: string): string {
    return FileUtils.resolvePath(path);
  }

  /**
   * Get Full Configuration
   */
  getAll(): ExtensionConfiguration {
    return { ...this.config };
  }
}
