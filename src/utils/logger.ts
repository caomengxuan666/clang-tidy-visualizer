// Logging Utility

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ExtensionContext } from 'vscode';

// Log Levels
export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

// Logger Class
export class Logger {
  private static instance: Logger | null = null;
  private outputChannel: vscode.OutputChannel;
  private logLevel: LogLevel = 'info';
  private logFile: string | null = null;

  private constructor() {
    this.outputChannel = vscode.window.createOutputChannel('Clang-Tidy Visualizer');
  }

  /**
   * Get Logger instance (Singleton)
   */
  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  /**
   * Initialize Logger
   */
  initialize(context: ExtensionContext, logLevel: LogLevel = 'info'): void {
    this.logLevel = logLevel;
    
    // Create log file in extension storage
    const logDir = context.storageUri ? path.join(context.storageUri.fsPath, 'logs') : null;
    if (logDir) {
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      
      const date = new Date().toISOString().replace(/[:.]/g, '-');
      this.logFile = path.join(logDir, `clang-tidy-visualizer-${date}.log`);
    }
    
    this.info('Logger initialized');
  }

  /**
   * Set Log Level
   */
  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
    this.info(`Log level set to ${level}`);
  }

  /**
   * Log Error
   */
  error(message: string, error?: Error): void {
    this.log('error', message, error);
  }

  /**
   * Log Warning
   */
  warn(message: string): void {
    if (this.shouldLog('warn')) {
      this.log('warn', message);
    }
  }

  /**
   * Log Info
   */
  info(message: string): void {
    if (this.shouldLog('info')) {
      this.log('info', message);
    }
  }

  /**
   * Log Debug
   */
  debug(message: string): void {
    if (this.shouldLog('debug')) {
      this.log('debug', message);
    }
  }

  /**
   * Show Output Channel
   */
  showOutput(): void {
    this.outputChannel.show(true);
  }

  /**
   * Hide Output Channel
   */
  hideOutput(): void {
    this.outputChannel.hide();
  }

  /**
   * Clear Output
   */
  clear(): void {
    this.outputChannel.clear();
  }

  /**
   * Check if should log at given level
   */
  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['error', 'warn', 'info', 'debug'];
    return levels.indexOf(level) <= levels.indexOf(this.logLevel);
  }

  /**
   * Actual logging implementation
   */
  private log(level: LogLevel, message: string, error?: Error): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    
    // Add error stack if present
    const fullMessage = error ? `${logMessage}\n${error.stack}` : logMessage;
    
    // Log to output channel
    this.outputChannel.appendLine(fullMessage);
    
    // Log to file if enabled
    if (this.logFile) {
      try {
        fs.appendFileSync(this.logFile, fullMessage + '\n', 'utf8');
      } catch (err) {
        // Ignore file write errors
      }
    }
    
    // Show error messages to user
    if (level === 'error') {
      vscode.window.showErrorMessage(`Clang-Tidy Visualizer: ${message}`);
    }
  }
}

// Export singleton instance
export const logger = Logger.getInstance();
