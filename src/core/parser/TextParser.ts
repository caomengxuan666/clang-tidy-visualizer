// Text Parser - Parses Clang-Tidy text output
import { ClangTidyDiagnostic } from '../../types';
import { logger } from '../../utils/logger';
import * as fs from 'fs';
import * as path from 'path';

export class TextParser {
  /**
   * Parse Clang-Tidy text output
   */
  parseClangTidyText(text: string): ClangTidyDiagnostic[] {
    logger.info('Parsing Clang-Tidy text output');
    
    try {
      return this.transformTextToDiagnostics(text);
    } catch (error) {
      logger.error('Failed to parse Clang-Tidy text output', error as Error);
      return [];
    }
  }

  /**
   * Transform text output to ClangTidyDiagnostic array
   */
  private transformTextToDiagnostics(text: string): ClangTidyDiagnostic[] {
    const diagnostics: ClangTidyDiagnostic[] = [];

    // Split text into lines for easier processing
    const lines = text.split("\n");

    // Regular expression to match Clang-Tidy warning lines
    // Supports both Windows (C:\path\to\file.cpp) and Linux (/path/to/file.cpp) paths
    // Supports both lines with and without check names (like notes)
    // Improved to handle edge cases like spaces in paths and special characters
    const warningRegex =
      /^((?:[a-zA-Z]:)?[\/\\][^:\n]+):(\d+):(\d+):\s+([a-zA-Z]+):\s+([^\n]+?)(?:\s+\[([^\]]+)\])?$/;

    // Parse all warnings first
    logger.debug(`Total lines to parse: ${lines.length}`);
    let matchedWarnings = 0;
    let invalidSeverities = 0;
    let currentDiagnostic: ClangTidyDiagnostic | null = null;

    for (const line of lines) {
      if (!line.trim()) {
        currentDiagnostic = null;
        continue;
      }

      // Check if this line is a warning line
      const warningMatch = line.match(warningRegex);
      if (warningMatch) {
        matchedWarnings++;
        const [
          ,
          filePath,
          lineStr,
          columnStr,
          severityStr,
          message,
          checkName = "",
        ] = warningMatch;
        const severity = this.validateSeverity(severityStr.toLowerCase());

        if (!severity) {
          invalidSeverities++;
          logger.warn(
            `Unknown severity: ${severityStr}, defaulting to warning`
          );
          currentDiagnostic = null;
          continue;
        }

        const diagnostic: ClangTidyDiagnostic = {
          filePath,
          line: parseInt(lineStr, 10),
          column: parseInt(columnStr, 10),
          severity,
          message: message.trim(),
          checkName,
        };

        diagnostics.push(diagnostic);
        currentDiagnostic = diagnostic;
      } else if (currentDiagnostic) {
        // Check if this line is part of the current diagnostic's output
        // Clang-Tidy output structure:
        // 1. Warning line
        // 2. Code line (starts with line number, then "|")
        // 3. Caret line (starts with 6 spaces, then "|", then "^")
        // 4. Fix suggestion (starts with 6 spaces, then "|", then fix)
        
        // Check if this is a code line (starts with 3 spaces, line number, then "|")
        const isCodeLine = /^\s{3}\d+\s+\|/.test(line);
        
        // Check if this is a caret or fix suggestion line (starts with some spaces, then "|")
        const isDiagnosticDetailLine = /^\s+\|/.test(line);
        
        if (isCodeLine || isDiagnosticDetailLine) {
          // This line is part of the current diagnostic's output
          
          if (isCodeLine) {
            // This is the code line
            const codePart = line.split('|').pop()?.trim() || line;
            currentDiagnostic.codeLineFull = codePart;
          } else {
              // This is either a caret line or a fix suggestion line
              if (line.trim().includes('^')) {
                // This is a caret line - save the original line
                currentDiagnostic.caretLine = line;
              } else {
                // This is a fix suggestion line - save the original line
                if (currentDiagnostic.fixSuggestion) {
                  currentDiagnostic.fixSuggestion += '\n' + line;
                } else {
                  currentDiagnostic.fixSuggestion = line;
                }
              }
            }
        } else {
          // This line is not part of the current diagnostic's output, reset
          currentDiagnostic = null;
        }
      }
    }

    logger.info(
      `Parsed ${matchedWarnings} potential warning lines, created ${diagnostics.length} diagnostics, skipped ${invalidSeverities} with invalid severity`
    );

    // Read source code from files and add to diagnostics
    this.enrichDiagnosticsWithSourceCode(diagnostics);

    return diagnostics;
  }
  
  /**
   * Enrich diagnostics with source code from files
   */
  private enrichDiagnosticsWithSourceCode(diagnostics: ClangTidyDiagnostic[]): void {
    // Group diagnostics by file path for efficient reading
    const diagnosticsByFile = new Map<string, ClangTidyDiagnostic[]>();
    
    for (const diagnostic of diagnostics) {
      if (!diagnosticsByFile.has(diagnostic.filePath)) {
        diagnosticsByFile.set(diagnostic.filePath, []);
      }
      diagnosticsByFile.get(diagnostic.filePath)!.push(diagnostic);
    }
    
    // Read each file once and extract relevant lines
    for (const [filePath, fileDiagnostics] of diagnosticsByFile) {
      try {
        // Read file content
        const content = fs.readFileSync(filePath, 'utf8');
        const fileLines = content.split('\n');
        
        // Add source code to each diagnostic
        for (const diagnostic of fileDiagnostics) {
          const lineIndex = diagnostic.line - 1;
          
          // Check if line exists
            if (lineIndex >= 0 && lineIndex < fileLines.length) {
              const codeLine = fileLines[lineIndex];
              
              // Only set codeLineFull if it wasn't already set from Clang-Tidy output
              if (!diagnostic.codeLineFull) {
                diagnostic.codeLineFull = codeLine;
              }
              
              // Only create caret line if it wasn't already parsed from Clang-Tidy output
              if (!diagnostic.caretLine) {
                // Create position indicator (caret line)
                // Adjust for tabs and other whitespace
                const position = Math.max(0, diagnostic.column - 1);
                
                // Create the position indicator with proper spacing
                const whitespace = ' '.repeat(position);
                diagnostic.caretLine = whitespace + '^';
              }
            }
        }
      } catch (error) {
        logger.warn(`Failed to read file ${filePath} for source code extraction: ${error instanceof Error ? error.message : String(error)}`);
        continue;
      }
    }
  }

  /**
   * Validate and map severity string
   */
  private validateSeverity(severity: string): 'error' | 'warning' | 'note' | 'fatal' | null {
    const validSeverities = ['error', 'warning', 'note', 'fatal'];
    return validSeverities.includes(severity) ? (severity as any) : null;
  }
}