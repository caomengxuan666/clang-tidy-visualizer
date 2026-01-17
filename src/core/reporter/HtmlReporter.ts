// HTML Reporter - Generates HTML reports from Clang-Tidy results
import { ReportData, ReportOptions, ClangTidyDiagnostic } from '../../types';
import { ChartGenerator } from './ChartGenerator';
import { logger } from '../../utils/logger';
import { i18n } from '../../utils/i18nService';

// Handlebars-like template engine (simplified for this implementation)
export class HtmlReporter {
  private chartGenerator: ChartGenerator;

  constructor() {
    this.chartGenerator = new ChartGenerator();
  }

  /**
   * Generate HTML report from data
   */
  async generateReport(data: ReportData, options: ReportOptions = {}): Promise<string> {
    logger.info('Generating HTML report');
    
    // Prepare template data
    const templateData = this.prepareTemplateData(data, options);
    
    // Generate HTML content
    const html = this.renderTemplate(templateData);
    
    logger.info('HTML report generated');
    return html;
  }

  /**
   * Prepare data for template
   */
  private prepareTemplateData(data: ReportData, options: ReportOptions): any {
    // Check if dark theme is enabled
    const isDarkTheme = options.style === 'dark';
    
    // Generate charts with theme support
    const severityChart = this.chartGenerator.generateSeverityChart(data.diagnostics, isDarkTheme);
    const topChecksChart = this.chartGenerator.generateTopChecksChart(data.diagnostics, isDarkTheme);
    
    // Calculate statistics
    const summary = this.generateSummary(data);
    
    // Group diagnostics by file
    const filesWithWarnings = this.groupDiagnosticsByFile(data.diagnostics);
    
    // Sort top checkers
    const topCheckers = this.getTopCheckers(data.warningsByChecker, 10);
    
    return {
      title: `Clang-Tidy Report - ${new Date().toLocaleDateString()}`,
      timestamp: new Date().toISOString(),
      options,
      summary,
      stats: {
        totalFilesChecked: data.totalFilesChecked,
        filesWithWarnings: data.filesWithWarnings,
        totalWarnings: data.totalWarnings,
        checkerCount: Object.keys(data.warningsByChecker || {}).length
      },
      charts: {
        severityChart: JSON.stringify(severityChart),
        topChecksChart: JSON.stringify(topChecksChart)
      },
      filesWithWarnings,
      topCheckers,
      warningsByChecker: data.warningsByChecker,
      generateVscodeLink: this.generateVscodeLink
    };
  }

  /**
   * Generate summary statistics
   */
  private generateSummary(data: ReportData): any {
    const severityCounts = data.diagnostics.reduce((acc, diag) => {
      acc[diag.severity] = (acc[diag.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      severityCounts,
      totalCheckers: Object.keys(data.warningsByChecker || {}).length,
      averageWarningsPerFile: data.totalWarnings / data.totalFilesChecked || 0
    };
  }

  /**
   * Group diagnostics by file
   */
  private groupDiagnosticsByFile(diagnostics: ClangTidyDiagnostic[]): Record<string, ClangTidyDiagnostic[]> {
    const grouped: Record<string, ClangTidyDiagnostic[]> = {};
    
    for (const diag of diagnostics) {
      if (!grouped[diag.filePath]) {
        grouped[diag.filePath] = [];
      }
      grouped[diag.filePath].push(diag);
    }
    
    // Sort by number of warnings (descending)
    return Object.fromEntries(
      Object.entries(grouped)
        .sort(([, a], [, b]) => b.length - a.length)
    );
  }

  /**
   * Get top checkers by warning count
   */
  private getTopCheckers(checkers: Record<string, number>, limit: number): Record<string, number> {
    return Object.fromEntries(
      Object.entries(checkers)
        .sort(([, a], [, b]) => b - a)
        .slice(0, limit)
    );
  }

  /**
   * Generate VSCode link for file location
   */
  private generateVscodeLink(filePath: string, line: number): string {
    // Convert path to VSCode URI format
    const normalizedPath = filePath.replace(/\\/g, '/');
    return `vscode://file/${normalizedPath}:${line}`;
  }



  /**
   * Render template with data
   */
  private renderTemplate(data: any): string {
    // Render top checkers table
    let topCheckersHtml = '';
    Object.entries(data.topCheckers).forEach(([checker, count], index) => {
      topCheckersHtml += `
        <tr>
          <td>${index + 1}</td>
          <td>${checker.split('.').pop()}</td>
          <td>${count}</td>
        </tr>
      `;
    });
    
    // Render files with warnings
    let filesHtml = '';
    Object.entries(data.filesWithWarnings).forEach(([fileName, warnings]) => {
      let warningsHtml = '';
      const typedWarnings = warnings as ClangTidyDiagnostic[];
      typedWarnings.forEach((warn: ClangTidyDiagnostic) => {
        // Process caret line to extract content after separator
        let caretContent = '';
        if (warn.caretLine) {
            const separatorIndex = warn.caretLine.indexOf('|');
            if (separatorIndex !== -1) {
                // Extract caret content and ensure ^ is properly displayed
                caretContent = warn.caretLine.substring(separatorIndex + 1);
                // Add explicit styling for ^ characters to ensure visibility
                caretContent = caretContent.replace(/(\^+)/g, '<span class="caret-highlight">$1</span>');
            }
        }
        
        // Process fix suggestion to extract content after separator for each line
        let fixContent = '';
        if (warn.fixSuggestion) {
            const fixLines = warn.fixSuggestion.split('\n');
            fixContent = fixLines.map(line => {
                const separatorIndex = line.indexOf('|');
                if (separatorIndex !== -1) {
                    return line.substring(separatorIndex + 1);
                }
                return line;
            }).join('\n');
        }
        
        // Generate code block with original format preserved
        const codeBlock = warn.codeLineFull ? `<div class="code-fix-block"><div class="code-line"><span class="line-number">${warn.line}</span><span class="line-separator">|</span><span class="line-content">${warn.codeLineFull}</span></div>${caretContent ? `<div class="code-line"><span class="line-number"></span><span class="line-separator">|</span><span class="line-content">${caretContent}</span></div>` : ''}${fixContent ? `<div class="code-line"><span class="line-number"></span><span class="line-separator">|</span><span class="line-content fix-suggestion">${fixContent}</span></div>` : ''}</div>` : '';
        
        warningsHtml += `
          <div class="warning-item" data-file="${fileName}" data-severity="${warn.severity}" data-checker="${warn.checkName}">
            <div class="warning-header">
              ${i18n.t('report.rule')}: ${warn.checkName.split('.').pop()}
              <span class="warning-location">${warn.filePath}:${warn.line}:${warn.column}</span>
              <a href="vscode://file/${warn.filePath.replace(/\\/g, '/')}:${warn.line}" class="vscode-link">
                <span class="vscode-icon"> ></span> ${i18n.t('report.openInVSCode')}
              </a>
            </div>
            <div class="warning-message">${warn.message}</div>
            ${codeBlock}
          </div>
        `;
      });

      // Extract just the file name without path using path.basename
      const displayFileName = require('path').basename(fileName) || fileName;
      
      filesHtml += `
        <div class="file-item" data-file="${fileName}">
          <div class="file-name">${displayFileName} (${typedWarnings.length} ${i18n.t('report.warningsTotal')})</div>
          ${warningsHtml}
        </div>
      `;
    });

    // Complete HTML template
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.title}</title>
  <!-- Use CDN for Chart.js and Font Awesome (fallback for export) -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    }
    
    body {
      background-color: #f5f7fa;
      color: #333;
      line-height: 1.6;
      padding: 20px;
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background-color: #fff;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
      padding: 30px;
    }
    
    .report-header {
      text-align: center;
      margin-bottom: 30px;
      padding-bottom: 15px;
      border-bottom: 2px solid #3498db;
    }
    
    .report-header h1 {
      font-size: 28px;
      font-weight: 600;
      color: #2c3e50;
      margin-bottom: 10px;
    }
    
    .report-meta {
      color: #7f8c8d;
      font-size: 14px;
    }
    
    .report-meta span {
      margin: 0 10px;
    }
    
    .stats-section {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 40px;
    }
    
    .stat-card {
      background: linear-gradient(135deg, #f5f7fa 0%, #e4edf5 100%);
      border-radius: 10px;
      padding: 20px;
      text-align: center;
      border-left: 4px solid #3498db;
      transition: transform 0.3s ease, box-shadow 0.3s ease;
      cursor: default;
    }
    
    .stat-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 6px 15px rgba(0, 0, 0, 0.1);
    }
    
    .stat-value {
      font-size: 36px;
      font-weight: 700;
      color: #2c3e50;
      margin: 10px 0;
    }
    
    .stat-label {
      font-size: 15px;
      color: #7f8c8d;
      font-weight: 500;
    }
    
    .charts-section {
      margin-bottom: 40px;
      background: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
    }
    
    .section-title {
      font-size: 20px;
      font-weight: 600;
      color: #2c3e50;
      margin-bottom: 20px;
      padding-left: 10px;
      border-left: 3px solid #3498db;
    }
    
    .chart-container {
      margin-bottom: 30px;
      border-radius: 6px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      background-color: #fff;
      padding: 15px;
    }
    
    .chart-canvas {
      width: 100% !important;
      height: 400px !important;
    }
    
    .checker-ranking {
      margin-bottom: 40px;
      background: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
    }
    
    .ranking-table {
      width: 100%;
      border-collapse: collapse;
      background-color: #fff;
      border-radius: 6px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    }
    
    .ranking-table th {
      background: linear-gradient(to bottom, #3498db, #2980b9);
      color: #fff;
      padding: 12px 15px;
      text-align: left;
      font-weight: 600;
    }
    
    .ranking-table td {
      padding: 12px 15px;
      border-bottom: 1px solid #eee;
    }
    
    .ranking-table tr:hover {
      background-color: #e3f2fd;
    }
    
    .ranking-table tr:nth-child(even) {
      background-color: #fafafa;
    }
    
    .file-details {
      margin-top: 40px;
    }
    
    .file-item {
      margin-bottom: 15px;
      padding: 15px;
      background-color: #f8f9fa;
      border-radius: 6px;
      border: 1px solid #eee;
    }
    
    .file-name {
      font-weight: 600;
      color: #2c3e50;
      margin-bottom: 10px;
      font-size: 16px;
    }
    
    .warning-item {
      margin-bottom: 15px;
      color: #e67e22;
      border-left: 3px solid #e67e22;
      background-color: #fff8f0;
      padding: 15px;
      border-radius: 4px;
      border: 1px solid #ffeaa7;
    }
    
    .warning-header {
      font-weight: 600;
      margin-bottom: 5px;
      display: flex;
      align-items: center;
    }
    
    .warning-location {
      font-size: 12px;
      color: #7f8c8d;
      margin-left: 10px;
    }
    
    .warning-message {
      font-size: 14px;
      margin-top: 5px;
      color: #333;
    }
    
    .code-fix-block {
      background-color: #f0f0f0;
      padding: 4px;
      border-radius: 4px;
      font-family: Consolas, "Courier New", monospace;
      white-space: pre;
      overflow-x: auto;
      line-height: 1.0;
      font-size: 12px;
      margin-top: 4px;
      min-height: 18px;
    }
    
    .code-line {
      display: flex;
      align-items: flex-start;
      min-height: 14px;
    }
    
    .line-number {
      display: inline-block;
      width: 25px;
      text-align: right;
      color: #888;
      margin-right: 4px;
      user-select: none;
      font-size: 11px;
    }
    
    .line-separator {
      display: inline-block;
      color: #888;
      margin-right: 4px;
      user-select: none;
      font-size: 11px;
    }
    
    .line-content {
      display: inline-block;
      flex: 1;
      position: relative;
    }
    
    .fix-suggestion {
      padding-left: 0;
      color: #2ecc71;
      font-style: italic;
    }
    
    .caret-highlight {
      color: #e74c3c;
      font-weight: bold;
    }
    
    .fix-suggestion {
      color: #2ecc71;
      font-style: italic;
    }
    
    .vscode-link {
      display: inline-block;
      background-color: #444;
      color: white;
      padding: 6px 12px;
      border-radius: 4px;
      text-decoration: none;
      font-size: 12px;
      margin-left: 10px;
      transition: background-color 0.3s;
    }
    
    .vscode-link:hover {
      background-color: #222;
    }
    
    .footer {
      text-align: center;
      margin-top: 40px;
      color: #7f8c8d;
      font-size: 14px;
    }

    /* Dark Theme Styles */
    body.dark {
      background-color: #1e1e1e;
      color: #d4d4d4;
    }

    body.dark .container {
      background-color: #252526;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
    }

    body.dark .report-header {
      border-bottom-color: #0e639c;
    }

    body.dark .report-header h1 {
      color: #cccccc;
    }

    body.dark .report-meta {
      color: #858585;
    }

    body.dark .stat-card {
      background: linear-gradient(135deg, #2d2d2d 0%, #3c3c3c 100%);
      border-left-color: #0e639c;
    }

    body.dark .stat-card:hover {
      box-shadow: 0 6px 15px rgba(0, 0, 0, 0.5);
    }

    body.dark .stat-value {
      color: #cccccc;
    }

    body.dark .stat-label {
      color: #858585;
    }

    body.dark .charts-section {
      background: #2d2d2d;
    }

    body.dark .section-title {
      color: #cccccc;
      border-left-color: #0e639c;
    }

    body.dark .chart-container {
      background-color: #3c3c3c;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    }

    body.dark .checker-ranking {
      background: #2d2d2d;
    }

    body.dark .ranking-table {
      background-color: #3c3c3c;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    }

    body.dark .ranking-table th {
      background: linear-gradient(to bottom, #0e639c, #1177bb);
      color: #ffffff;
    }

    body.dark .ranking-table td {
      border-bottom-color: #4a4a4a;
    }

    body.dark .file-details {
      background: #2d2d2d;
    }

    body.dark .file-item {
      background-color: #3c3c3c;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    }

    body.dark .file-name {
      background-color: #0e639c;
      color: #ffffff;
    }

    body.dark .warning-item {
      border-left-color: #f48771;
    }

    body.dark .warning-header {
      background-color: #3c3c3c;
      border-bottom-color: #4a4a4a;
    }

    body.dark .warning-message {
      color: #d4d4d4;
    }

    body.dark .code-fix-block {
      background-color: #2d2d2d;
      color: #d4d4d4;
    }

    body.dark .line-number {
      color: #858585;
    }

    body.dark .line-separator {
      color: #858585;
    }

    body.dark .fix-suggestion {
      color: #6a9955;
    }

    body.dark .caret-highlight {
      color: #f48771;
    }

    body.dark .vscode-link {
      background-color: #0e639c;
      color: white;
    }

    body.dark .vscode-link:hover {
      background-color: #1177bb;
    }

    body.dark .footer {
      color: #858585;
    }

    /* Filter Controls Styles */
    .filter-section {
      margin-bottom: 40px;
      background: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
    }

    .filter-controls {
      display: flex;
      flex-wrap: wrap;
      gap: 20px;
      align-items: flex-end;
    }

    .filter-group {
      flex: 1;
      min-width: 200px;
    }

    .filter-group label {
      display: block;
      margin-bottom: 5px;
      font-weight: 500;
      color: #2c3e50;
    }

    .filter-group select,
    .filter-group input {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
      background-color: #fff;
    }

    /* Multi-select dropdown styles */
    .filter-group select[multiple] {
      height: auto;
      min-height: 80px;
      resize: vertical;
    }

    .filter-group select {
      height: auto;
      min-height: 36px;
    }

    .filter-actions {
      display: flex;
      gap: 10px;
    }

    .filter-btn {
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      background-color: #3498db;
      color: white;
      font-size: 14px;
      cursor: pointer;
      transition: background-color 0.3s;
    }

    .filter-btn:hover {
      background-color: #2980b9;
    }

    /* Header Styles */
    .report-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      flex-wrap: wrap;
      gap: 20px;
    }

    .header-left {
      flex: 1;
      min-width: 200px;
    }

    .header-right {
      display: flex;
      align-items: center;
    }

    /* Export Button Styles */
    .export-btn {
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      background-color: #27ae60;
      color: white;
      font-size: 14px;
      cursor: pointer;
      transition: background-color 0.3s;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .export-btn:hover {
      background-color: #229954;
    }

    /* Modal Styles */
    .modal {
      display: none;
      position: fixed;
      z-index: 1000;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      overflow: auto;
      background-color: rgba(0, 0, 0, 0.5);
    }

    .modal-content {
      background-color: #fefefe;
      margin: 15% auto;
      padding: 0;
      border: 1px solid #888;
      border-radius: 8px;
      width: 400px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      animation: modalSlideIn 0.3s ease-out;
    }

    @keyframes modalSlideIn {
      from { opacity: 0; transform: translateY(-50px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .modal-header {
      padding: 15px 20px;
      background-color: #f5f5f5;
      border-bottom: 1px solid #ddd;
      border-radius: 8px 8px 0 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .modal-header h2 {
      margin: 0;
      font-size: 18px;
      color: #2c3e50;
    }

    .close-btn {
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      color: #777;
      padding: 0;
      line-height: 1;
    }

    .close-btn:hover {
      color: #333;
    }

    .modal-body {
      padding: 20px;
    }

    .export-options {
      display: flex;
      flex-direction: column;
      gap: 15px;
    }

    .export-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .export-group label {
      font-weight: 500;
      color: #2c3e50;
    }

    .export-group select {
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
    }

    .modal-footer {
      padding: 15px 20px;
      background-color: #f5f5f5;
      border-top: 1px solid #ddd;
      border-radius: 0 0 8px 8px;
      display: flex;
      justify-content: flex-end;
      gap: 10px;
    }

    .cancel-btn {
      padding: 8px 16px;
      border: 1px solid #ddd;
      border-radius: 4px;
      background-color: #fff;
      color: #333;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.3s;
    }

    .cancel-btn:hover {
      background-color: #f5f5f5;
      border-color: #ccc;
    }

    /* Filter Controls Styles */
    .filter-section {
      margin-bottom: 20px;
    }

    .filter-toggle {
      cursor: pointer;
      user-select: none;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .filter-toggle i {
      transition: transform 0.3s ease;
      font-size: 12px;
    }

    .filter-toggle.collapsed i {
      transform: rotate(-90deg);
    }

    .filter-controls-container {
      margin-top: 15px;
    }

    /* Dark Theme Filter Controls */
    body.dark .filter-section {
      background: #2d2d2d;
    }

    body.dark .export-controls select {
      background-color: #3c3c3c;
      border-color: #555;
      color: #cccccc;
    }

    body.dark .filter-group label {
      color: #cccccc;
    }

    body.dark .filter-group select,
    body.dark .filter-group input {
      background-color: #3c3c3c;
      border-color: #555;
      color: #cccccc;
    }

    body.dark .filter-btn {
      background-color: #0e639c;
    }

    body.dark .filter-btn:hover {
      background-color: #1177bb;
    }
  </style>
</head>
<body class="${data.options.style === 'dark' ? 'dark' : ''}">
  <div class="container">
    <header class="report-header">
      <div class="header-left">
        <h1><i class="fas fa-chart-bar"></i> ${data.title}</h1>
        <div class="report-meta">
          <span><i class="fas fa-calendar"></i> ${data.timestamp}</span>
          <span><i class="fas fa-cog"></i> ${data.options.checks || '*'}</span>
        </div>
      </div>
      <div class="header-right">
        <button id="export-btn" class="export-btn" onclick="openExportModal()">
          <i class="fas fa-download"></i> ${i18n.t('report.exportReport')}
        </button>
      </div>
    </header>
    
    <!-- Filter Controls -->
    <section class="filter-section">
      <h2 class="section-title filter-toggle collapsed" onclick="toggleFilterSection()">
        <i class="fas fa-chevron-down"></i> ${i18n.t('report.filterIssues')}
      </h2>
      <div id="filter-controls-container" class="filter-controls-container" style="display: none;">
        <div class="filter-controls">
        <div class="filter-group">
          <label for="file-filter">${i18n.t('report.filterByFile')}:</label>
          <select id="file-filter" multiple="multiple">
            <option value="">${i18n.t('report.allFiles')}</option>
            ${Object.keys(data.filesWithWarnings).map(file => `<option value="${file}">${require('path').basename(file)}</option>`).join('')}
          </select>
        </div>
        
        <div class="filter-group">
          <label for="severity-filter">${i18n.t('report.filterBySeverity')}:</label>
          <select id="severity-filter" multiple="multiple">
            <option value="">${i18n.t('report.allSeverities')}</option>
            <option value="error">${i18n.t('report.severityError')}</option>
            <option value="warning">${i18n.t('report.severityWarning')}</option>
            <option value="note">${i18n.t('report.severityNote')}</option>
            <option value="fatal">${i18n.t('report.severityFatal')}</option>
          </select>
        </div>
        
        <div class="filter-group">
          <label for="checker-filter">${i18n.t('report.filterByRule')}:</label>
          <select id="checker-filter" multiple="multiple">
            <option value="">${i18n.t('report.allRules')}</option>
            ${Object.keys(data.warningsByChecker || {}).sort().map(rule => `<option value="${rule}">${rule}</option>`).join('')}
          </select>
        </div>
        
        <div class="filter-actions">
          <button onclick="applyFilters()" class="filter-btn">${i18n.t('report.applyFilter')}</button>
          <button onclick="clearFilters()" class="filter-btn">${i18n.t('report.clearFilter')}</button>
        </div>
        
        </div>
      </div>
    </section>
    
    <section class="stats-section">
      <div class="stat-card">
        <div class="stat-label">${i18n.t('report.totalFilesChecked')}</div>
        <div class="stat-value">${data.stats.totalFilesChecked}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">${i18n.t('report.filesWithWarnings')}</div>
        <div class="stat-value">${data.stats.filesWithWarnings}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">${i18n.t('report.totalWarnings')}</div>
        <div class="stat-value">${data.stats.totalWarnings}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">${i18n.t('report.violatedRulesCount')}</div>
        <div class="stat-value">${data.stats.checkerCount}</div>
      </div>
    </section>
    
    <section class="charts-section">
      <h2 class="section-title">${i18n.t('report.violatedRulesDistribution')}</h2>
      <div class="chart-container">
        <canvas id="severityChart" class="chart-canvas"></canvas>
      </div>
      
      <h2 class="section-title">${i18n.t('report.fileViolationsRankings')}</h2>
      <div class="chart-container">
        <canvas id="topChecksChart" class="chart-canvas"></canvas>
      </div>
    </section>
    
    <section class="checker-ranking">
      <h2 class="section-title">${i18n.t('report.violatedRulesRankings')}</h2>
      <table class="ranking-table">
        <tr>
          <th>${i18n.t('report.rank')}</th>
          <th>${i18n.t('report.ruleName')}</th>
          <th>${i18n.t('report.violationCount')}</th>
        </tr>
        ${topCheckersHtml}
      </table>
    </section>
    
    <section class="file-details">
      <h2 class="section-title">${i18n.t('report.fileViolationDetails')}</h2>
      ${filesHtml}
    </section>
    
    <footer class="footer">
      <p>Generated by Clang-Tidy Visualizer</p>
    </footer>
  </div>
  
  <!-- Export Modal -->
  <div id="export-modal" class="modal">
    <div class="modal-content">
      <div class="modal-header">
        <h2>${i18n.t('report.exportReport')}</h2>
        <button class="close-btn" onclick="closeExportModal()">&times;</button>
      </div>
      <div class="modal-body">
        <div class="export-options">
          <div class="export-group">
            <label for="export-format">${i18n.t('report.exportAs')}:</label>
            <select id="export-format">
              <option value="html">${i18n.t('report.formatHTML')}</option>
              <option value="json">${i18n.t('report.formatJSON')}</option>
            </select>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="cancel-btn" onclick="closeExportModal()">${i18n.t('report.cancel')}</button>
        <button id="export-report-btn" class="export-btn" onclick="exportReport()">${i18n.t('report.exportReport')}</button>
      </div>
    </div>
  </div>
  
  <script>
    // Chart configurations
    const severityChartConfig = ${data.charts.severityChart};
    const topChecksChartConfig = ${data.charts.topChecksChart};
    
    // Filter functionality
    function initializeFilters() {
      // Apply filters on load
      applyFilters();
    }
    

    

    

    
    // Initialize charts and filters
    document.addEventListener('DOMContentLoaded', function() {
      try {
        const severityCtx = document.getElementById('severityChart');
        const topChecksCtx = document.getElementById('topChecksChart');
        
        if (severityCtx && topChecksCtx) {
          const severityChart = new Chart(severityCtx.getContext('2d'), severityChartConfig);
          const topChecksChart = new Chart(topChecksCtx.getContext('2d'), topChecksChartConfig);
        }
      } catch (error) {
        console.error('Chart initialization error:', error);
      }
      
      // Initialize filter functionality
      initializeFilters();
    });
    
    // Toggle filter section visibility
    function toggleFilterSection() {
      const toggle = document.querySelector('.filter-toggle');
      const container = document.getElementById('filter-controls-container');
      
      if (toggle && container) {
        toggle.classList.toggle('collapsed');
        
        if (toggle.classList.contains('collapsed')) {
          container.style.display = 'none';
        } else {
          container.style.display = 'block';
        }
      }
    }
    
    // Modal functionality
    function openExportModal() {
      const modal = document.getElementById('export-modal');
      if (modal) {
        modal.style.display = 'block';
      }
    }

    function closeExportModal() {
      const modal = document.getElementById('export-modal');
      if (modal) {
        modal.style.display = 'none';
      }
    }

    // Close modal when clicking outside
    window.onclick = function(event) {
      const modal = document.getElementById('export-modal');
      if (event.target === modal) {
        closeExportModal();
      }
    }

    // Export functionality
    function exportReport() {
      const exportFormat = document.getElementById('export-format').value;
      
      // Send export request to VS Code extension
      if (typeof acquireVsCodeApi !== 'undefined') {
        const vscode = acquireVsCodeApi();
        vscode.postMessage({
          command: 'exportReport',
          format: exportFormat
        });
      } else {
        // Fallback for standalone HTML export
        if (exportFormat === 'html') {
          exportHtmlReport();
        } else if (exportFormat === 'json') {
          exportJsonReport();
        }
      }
      
      // Close modal after export
      closeExportModal();
    }
    
    // Export HTML report (fallback)
    function exportHtmlReport() {
      const htmlContent = document.documentElement.outerHTML;
      downloadFile('clang-tidy-report.html', htmlContent, 'text/html');
    }
    
    // Export JSON report (fallback)
    function exportJsonReport() {
      // This would need actual JSON data, which we don't have in standalone mode
      // For now, just show a message
      alert('JSON export requires the VS Code extension');
    }
    
    // Helper to download files
    function downloadFile(filename, content, mimeType) {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
    
    function applyFilters() {
      // Get selected filters
      const fileFilter = document.getElementById('file-filter');
      const severityFilter = document.getElementById('severity-filter');
      const checkerFilter = document.getElementById('checker-filter');
      
      // Get selected files
      const selectedFiles = Array.from(fileFilter.selectedOptions).map(option => option.value);
      const allFiles = selectedFiles.includes('') || selectedFiles.length === 0;
      
      // Get selected severities
      const selectedSeverities = Array.from(severityFilter.selectedOptions).map(option => option.value);
      const allSeverities = selectedSeverities.includes('') || selectedSeverities.length === 0;
      
      // Get selected checkers
      const selectedCheckers = Array.from(checkerFilter.selectedOptions).map(option => option.value);
      const allCheckers = selectedCheckers.includes('') || selectedCheckers.length === 0;
      
      // Debug info
      console.log('Applying filters:', {
        selectedFiles,
        allFiles,
        selectedSeverities,
        allSeverities,
        selectedCheckers,
        allCheckers
      });
      
      // Filter warning items
      const warningItems = document.querySelectorAll('.warning-item');
      console.log('Found', warningItems.length, 'warning items');
      
      let visibleWarnings = 0;
      
      warningItems.forEach(item => {
        const warningFile = item.dataset.file;
        const warningSeverity = item.dataset.severity;
        const warningChecker = item.dataset.checker;
        
        // Debug info
        console.log('Checking warning:', {
          warningFile,
          warningSeverity,
          warningChecker
        });
        
        // Check file filter
        const fileMatch = allFiles || selectedFiles.includes(warningFile);
        
        // Check severity filter
        const severityMatch = allSeverities || selectedSeverities.includes(warningSeverity);
        
        // Check checker filter
        const checkerMatch = allCheckers || selectedCheckers.includes(warningChecker);
        
        // Debug info
        console.log('Filter matches:', {
          fileMatch,
          severityMatch,
          checkerMatch
        });
        
        // Show or hide item
        if (fileMatch && severityMatch && checkerMatch) {
          item.style.display = 'block';
          visibleWarnings++;
        } else {
          item.style.display = 'none';
        }
      });
      
      // Update file items
      const fileItems = document.querySelectorAll('.file-item');
      console.log('Found', fileItems.length, 'file items');
      
      let visibleFiles = 0;
      
      fileItems.forEach(item => {
        const file = item.dataset.file;
        const warningItemsInFile = item.querySelectorAll('.warning-item');
        const hasVisibleWarnings = Array.from(warningItemsInFile).some(warning => warning.style.display !== 'none');
        
        if (hasVisibleWarnings) {
          item.style.display = 'block';
          visibleFiles++;
        } else {
          item.style.display = 'none';
        }
      });
      
      // Update filter status
      updateFilterStatus(visibleFiles, visibleWarnings);
    }
    
    function clearFilters() {
      // Clear file filter
      const fileFilter = document.getElementById('file-filter');
      Array.from(fileFilter.options).forEach(option => {
        option.selected = option.value === '';
      });
      
      // Clear severity filter
      const severityFilter = document.getElementById('severity-filter');
      Array.from(severityFilter.options).forEach(option => {
        option.selected = option.value === '';
      });
      
      // Clear checker filter
      const checkerFilter = document.getElementById('checker-filter');
      checkerFilter.value = '';
      
      // Apply cleared filters
      applyFilters();
    }
    
    function updateFilterStatus(visibleFiles, visibleWarnings) {
      // Create or update filter status element
      let statusElement = document.getElementById('filter-status');
      if (!statusElement) {
        statusElement = document.createElement('div');
        statusElement.id = 'filter-status';
        statusElement.className = 'filter-status';
        document.querySelector('.filter-section').appendChild(statusElement);
      }
      
      statusElement.innerHTML = visibleWarnings + ' issues in ' + visibleFiles + ' files shown';
    }
  </script>
</body>
</html>`;
  }
}
