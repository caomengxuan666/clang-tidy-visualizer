// JSON Parser - Parses Clang-Tidy JSON output
import { ClangTidyDiagnostic } from '../../types';
import { logger } from '../../utils/logger';

export class JsonParser {
  /**
   * Parse Clang-Tidy JSON output
   */
  parseClangTidyJson(jsonString: string): ClangTidyDiagnostic[] {
    logger.info('Parsing Clang-Tidy JSON output');
    
    try {
      const data = JSON.parse(jsonString);
      return this.transformJsonToDiagnostics(data);
    } catch (error) {
      logger.error('Failed to parse Clang-Tidy JSON output', error as Error);
      return [];
    }
  }

  /**
   * Transform JSON data to ClangTidyDiagnostic array
   */
  private transformJsonToDiagnostics(data: any[]): ClangTidyDiagnostic[] {
    if (!Array.isArray(data)) {
      logger.error('Invalid JSON format: expected array');
      return [];
    }

    const diagnostics: ClangTidyDiagnostic[] = [];
    
    for (const item of data) {
      try {
        // Handle different JSON formats
        let message;
        let level;
        let checkName;
        let replacements;

        if (item.Diagnostics && Array.isArray(item.Diagnostics)) {
          // Format with Diagnostics array (from -export-fixes)
          for (const diag of item.Diagnostics) {
            const parsedDiag = this.parseSingleDiagnostic(diag);
            if (parsedDiag) {
              diagnostics.push(parsedDiag);
            }
          }
        } else {
          // Format with direct diagnostic data
          const parsedDiag = this.parseSingleDiagnostic(item);
          if (parsedDiag) {
            diagnostics.push(parsedDiag);
          }
        }
      } catch (error) {
        logger.error('Failed to parse diagnostic item', error as Error);
        continue;
      }
    }

    logger.info(`Parsed ${diagnostics.length} diagnostics`);
    return diagnostics;
  }

  /**
   * Parse a single diagnostic item
   */
  private parseSingleDiagnostic(item: any): ClangTidyDiagnostic | null {
    try {
      // Extract diagnostic message data
      const message = item.DiagnosticMessage || item;
      
      // Check required fields
      if (!message || !message.FilePath || !message.Message) {
        logger.warn('Invalid diagnostic item: missing required fields');
        return null;
      }

      // Extract severity
      const severity = this.mapSeverity(item.Level || 'warning');
      
      // Extract line and column from file offset (if needed)
      // Note: Clang-Tidy might provide Line and Column directly in newer versions
      const line = message.Line || 1;
      const column = message.Column || 1;

      // Create diagnostic object
      const diagnostic: ClangTidyDiagnostic = {
        filePath: message.FilePath,
        line,
        column,
        severity,
        message: message.Message.trim(),
        checkName: item.DiagnosticName || 'unknown',
        fix: message.Replacements ? {
          replacements: message.Replacements
        } : undefined
      };

      return diagnostic;
    } catch (error) {
      logger.error('Failed to parse single diagnostic', error as Error);
      return null;
    }
  }

  /**
   * Map Clang-Tidy severity levels to our enum
   */
  private mapSeverity(level: string): 'error' | 'warning' | 'note' | 'fatal' {
    const lowerLevel = level.toLowerCase();
    
    switch (lowerLevel) {
      case 'error':
      case 'fatal error':
        return 'error';
      case 'warning':
        return 'warning';
      case 'note':
        return 'note';
      case 'fatal':
        return 'fatal';
      default:
        logger.warn(`Unknown severity level: ${level}, defaulting to warning`);
        return 'warning';
    }
  }

  /**
   * Parse text output for additional context (code lines, fix suggestions)
   */
  enrichDiagnosticsWithTextOutput(
    diagnostics: ClangTidyDiagnostic[],
    textOutput: string
  ): ClangTidyDiagnostic[] {
    logger.info('Enriching diagnostics with text output');
    
    // Split text output into lines
    const lines = textOutput.split('\n');
    
    // Pattern for warning header line
    const warningHeaderPattern = /^([a-zA-Z]:[\\/].*?|\/.*?):(\d+):(\d+):\s+(error|warning|note|fatal):\s+(.*?)\s+\[([^\]]+)\]\s*$/;
    
    // Patterns for code context
    const codeLinePattern = /^\s*\d+\s*\|\s.*$/;
    const caretLinePattern = /^\s*\|\s*\^+~*.*$/;
    const fixLinePattern = /^\s*\|\s*\S+.*$/;
    
    let currentDiagnostic: ClangTidyDiagnostic | null = null;
    let foundCodeLine = false;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Skip empty lines and irrelevant information
      if (!trimmedLine || 
          trimmedLine.includes('warnings generated') || 
          trimmedLine.startsWith('Suppressed ') || 
          trimmedLine.startsWith('Use -header-filter')) {
        continue;
      }

      // Check if this line is a warning header
      const match = warningHeaderPattern.exec(line);
      if (match) {
        // Find existing diagnostic or create new one
        const filePath = match[1];
        const lineNum = parseInt(match[2]);
        const colNum = parseInt(match[3]);
        const checkName = match[6];
        
        // Find matching diagnostic in array
        currentDiagnostic = diagnostics.find(diag => 
          diag.filePath === filePath && 
          diag.line === lineNum && 
          diag.column === colNum && 
          diag.checkName === checkName
        ) || null;
        
        foundCodeLine = false;
      } 
      // Check if this line is code context
      else if (currentDiagnostic && codeLinePattern.test(line)) {
        currentDiagnostic.codeLineFull = line;
        foundCodeLine = true;
      } 
      // Check if this line is caret line (^~~~)
      else if (currentDiagnostic && foundCodeLine && caretLinePattern.test(line)) {
        currentDiagnostic.caretLine = line;
      } 
      // Check if this line is fix suggestion
      else if (currentDiagnostic && foundCodeLine && fixLinePattern.test(line)) {
        currentDiagnostic.fixSuggestion = line;
      }
    }

    logger.info('Enriched diagnostics with text output');
    return diagnostics;
  }

  /**
   * Parse report data from diagnostics
   */
  parseReportData(diagnostics: ClangTidyDiagnostic[]) {
    logger.info('Parsing report data from diagnostics');
    
    const files = new Map<string, ClangTidyDiagnostic[]>();
    const warningsByChecker: Record<string, number> = {};
    
    // Group diagnostics by file and check
    for (const diagnostic of diagnostics) {
      // Group by file
      if (!files.has(diagnostic.filePath)) {
        files.set(diagnostic.filePath, []);
      }
      files.get(diagnostic.filePath)!.push(diagnostic);
      
      // Count by checker
      warningsByChecker[diagnostic.checkName] = 
        (warningsByChecker[diagnostic.checkName] || 0) + 1;
    }
    
    // Convert Map to Record
    const filesRecord: Record<string, ClangTidyDiagnostic[]> = {};
    for (const [filePath, fileDiagnostics] of files.entries()) {
      filesRecord[filePath] = fileDiagnostics;
    }
    
    return {
      diagnostics,
      totalFilesChecked: files.size,
      filesWithWarnings: files.size,
      totalWarnings: diagnostics.length,
      warningsByChecker,
      files: filesRecord
    };
  }
}
