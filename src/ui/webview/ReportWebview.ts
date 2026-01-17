// Report Webview - Displays Clang-Tidy reports in VSCode
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ReportData, ReportOptions } from '../../types';
import { HtmlReporter } from '../../core/reporter/HtmlReporter';
import { logger } from '../../utils/logger';

export class ReportWebview {
  private panel: vscode.WebviewPanel | null = null;
  private context: vscode.ExtensionContext;
  private currentReportData: ReportData | null = null;
  private currentOptions: ReportOptions | null = null;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  /**
   * Show report in Webview
   */
  async showReport(reportData: ReportData, options: ReportOptions = {}): Promise<void> {
    logger.info('Showing Clang-Tidy report in Webview');
    
    // Detect VS Code theme and set report style
    if (!options.style) {
      const vscodeTheme = vscode.workspace.getConfiguration('workbench').get<string>('colorTheme', '');
      options.style = vscodeTheme.toLowerCase().includes('dark') ? 'dark' : 'modern';
      logger.info(`Detected VS Code theme: ${vscodeTheme}, setting report style to: ${options.style}`);
    }
    
    // Create or show existing panel
    if (this.panel) {
      this.panel.reveal(vscode.ViewColumn.Beside);
    } else {
      this.panel = vscode.window.createWebviewPanel(
        'clangTidyReport',
        'Clang-Tidy Analysis Report',
        vscode.ViewColumn.Beside,
        {
          enableScripts: true,
          retainContextWhenHidden: true,
          localResourceRoots: [
            vscode.Uri.joinPath(this.context.extensionUri, 'media')
          ]
        }
      );
      
      // Handle panel disposal
      this.panel.onDidDispose(() => {
        this.panel = null;
        logger.info('Report Webview panel disposed');
      });
      
      // Handle messages from Webview
      this.panel.webview.onDidReceiveMessage(
        (message) => this.handleMessage(message),
        undefined,
        this.context.subscriptions
      );
    }
    
    // Store current report data for export functionality
    this.currentReportData = reportData;
    this.currentOptions = options;
    
    // Generate HTML content
    const html = await this.getWebviewContent(reportData, options);
    this.panel.webview.html = html;
  }

  /**
   * Generate HTML content for Webview
   */
  private async getWebviewContent(reportData: ReportData, options: ReportOptions): Promise<string> {
    try {
      const reporter = new HtmlReporter();
      return await reporter.generateReport(reportData, options);
    } catch (error) {
      logger.error('Failed to generate Webview content', error as Error);
      return this.getErrorHtml('Failed to generate report content');
    }
  }

  /**
   * Handle messages from Webview
   */
  private handleMessage(message: any): void {
    switch (message.command) {
      case 'openFile':
        this.openFileInEditor(message.filePath, message.line);
        break;
      case 'applyFix':
        this.applyFix(message.fixData);
        break;
      case 'filterIssues':
        this.filterIssues(message.filter);
        break;
      case 'exportReport':
        this.exportReport(message.format).catch(error => {
          logger.error(`Failed to export report: ${error}`);
        });
        break;
      default:
        logger.warn(`Unknown message command: ${message.command}`);
    }
  }

  /**
   * Open file in editor at specific line
   */
  private openFileInEditor(filePath: string, line: number): void {
    logger.info(`Opening file in editor: ${filePath}:${line}`);
    
    const uri = vscode.Uri.file(filePath);
    vscode.window.showTextDocument(uri).then(editor => {
      // Navigate to specific line
      const position = new vscode.Position(line - 1, 0);
      editor.selection = new vscode.Selection(position, position);
      editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
    });
  }

  /**
   * Apply fix to file
   */
  private applyFix(fixData: any): void {
    logger.info('Applying fix to file');
    // Implementation pending
  }

  /**
   * Filter issues in report
   */
  private filterIssues(filter: any): void {
    logger.info('Filtering issues in report');
    // Implementation pending
  }

  /**
   * Export report to file
   */
  private async exportReport(format: string): Promise<void> {
    logger.info(`Exporting report in ${format} format`);
    
    if (!this.currentReportData || !this.currentOptions) {
      logger.error('No report data available for export');
      vscode.window.showErrorMessage('No report data available for export');
      return;
    }
    
    // Show save dialog
    const saveDialogOptions: vscode.SaveDialogOptions = {
      filters: {
        'HTML Files': ['html'],
        'JSON Files': ['json'],
        'All Files': ['*']
      },
      defaultUri: vscode.Uri.file(path.join(vscode.workspace.rootPath || '', `clang-tidy-report.${format}`))
    };
    
    const uri = await vscode.window.showSaveDialog(saveDialogOptions);
    if (!uri) {
      logger.info('Export canceled by user');
      return;
    }
    
    try {
      if (format === 'html') {
        // Generate HTML report
        const reporter = new HtmlReporter();
        const htmlContent = await reporter.generateReport(this.currentReportData, this.currentOptions);
        await fs.promises.writeFile(uri.fsPath, htmlContent, 'utf-8');
      } else if (format === 'json') {
        // Export as JSON
        const jsonContent = JSON.stringify(this.currentReportData, null, 2);
        await fs.promises.writeFile(uri.fsPath, jsonContent, 'utf-8');
      }
      
      logger.info(`Report exported successfully to ${uri.fsPath}`);
      vscode.window.showInformationMessage(`Report exported successfully to ${uri.fsPath}`);
    } catch (error) {
      logger.error(`Failed to export report: ${error}`);
      vscode.window.showErrorMessage(`Failed to export report: ${error}`);
    }
  }

  /**
   * Get HTML for error display
   */
  private getErrorHtml(message: string): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Error</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            padding: 20px;
            background-color: #f5f5f5;
            color: #333;
          }
          .error-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #fff;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            padding: 30px;
          }
          .error-title {
            color: #e74c3c;
            font-size: 24px;
            margin-bottom: 15px;
          }
          .error-message {
            font-size: 16px;
            line-height: 1.6;
          }
        </style>
      </head>
      <body>
        <div class="error-container">
          <h1 class="error-title">Error</h1>
          <div class="error-message">${message}</div>
        </div>
      </body>
      </html>
    `;
  }
}
