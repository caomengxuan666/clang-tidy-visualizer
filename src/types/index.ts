// Clang-Tidy Visualizer - Type Definitions

// Run Options
export interface RunOptions {
  checks?: string;
  headerFilter?: string;
  fix?: boolean;
  parallel?: boolean;
  outputFormat?: 'json' | 'text' | 'yaml';
  extraArgs?: string[];
}

// Run Result
export interface RunResult {
  rawOutput: string;
  errorOutput: string;
  exitCode: number;
  duration: number;
}

// Diagnostic
export interface ClangTidyDiagnostic {
  filePath: string;
  line: number;
  column: number;
  severity: 'error' | 'warning' | 'note' | 'fatal';
  message: string;
  checkName: string;
  fix?: {
    replacements: Array<{
      FilePath: string;
      Offset: number;
      Length: number;
      ReplacementText: string;
    }>;
  };
  codeLineFull?: string;
  caretLine?: string;
  fixSuggestion?: string;
}

// Parallel Result
export interface ParallelResult extends RunResult {
  files: string[];
}

// Report Data
export interface ReportData {
  diagnostics: ClangTidyDiagnostic[];
  totalFilesChecked: number;
  filesWithWarnings: number;
  totalWarnings: number;
  warningsByChecker: Record<string, number>;
  files: Record<string, ClangTidyDiagnostic[]>;
}

// Report Options
export interface ReportOptions {
  style?: 'modern' | 'dark' | 'minimal';
  interactive?: boolean;
  includeCharts?: boolean;
  checks?: string;
}

// Chart Config
export interface ChartConfig {
  type: string;
  data: {
    labels: string[];
    datasets: Array<{
      label?: string;
      data: number[];
      backgroundColor?: string | string[];
      borderColor?: string | string[];
      borderWidth?: number;
    }>;
  };
  options: Record<string, any>;
}

// Extension Configuration
export interface ExtensionConfiguration {
  // Clang-Tidy configuration
  clangTidyPath: string;
  compileCommandsPath: string;
  checks: string;
  headerFilter: string;
  fixOnSave: boolean;
  parallelJobs: number | 'auto';
  
  // Report configuration
  report: {
    autoOpen: boolean;
    style: 'modern' | 'dark' | 'minimal';
    includeCharts: boolean;
    outputDir: string;
  };
  
  // UI configuration
  ui: {
    statusBar: boolean;
    inlineDecorations: boolean;
    problemsPanel: boolean;
  };
  
  // Ignore configuration
  ignorePatterns: string[];
  excludeDirectories: string[];
  
  // Advanced configuration
  extraArgs: string[];
  timeout: number;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
}
