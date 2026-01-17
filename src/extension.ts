// Clang-Tidy Visualizer - Extension Main Entry
import * as vscode from 'vscode';
import * as path from 'path';
import { ExtensionContext } from 'vscode';
import { ConfigManager } from './core/config/ConfigManager';
import { ClangTidyRunner } from './core/runner/ClangTidyRunner';
import { JsonParser } from './core/parser/JsonParser';
import { TextParser } from './core/parser/TextParser';
import { HtmlReporter } from './core/reporter/HtmlReporter';
import { ReportWebview } from './ui/webview/ReportWebview';
import { logger } from './utils/logger';
import { FileUtils } from './utils/fileUtils';
import { i18n } from './utils/i18nService';
import { RunOptions, ReportData, ClangTidyDiagnostic } from './types';

export function activate(context: ExtensionContext) {
    // Initialize logger with configured log level
    const config = vscode.workspace.getConfiguration('clangTidyVisualizer');
    const logLevel = config.get<'error' | 'warn' | 'info' | 'debug'>('logLevel', 'info');
    logger.initialize(context, logLevel);
    logger.info('Clang-Tidy Visualizer extension activated');

    // Initialize components
    const configManager = ConfigManager.getInstance();
    const runner = new ClangTidyRunner(configManager);
    const jsonParser = new JsonParser();
    const textParser = new TextParser();
    const webview = new ReportWebview(context);

    // Register commands
    const runAnalysisCommand = vscode.commands.registerCommand('clangTidyVisualizer.run', async () => {
        await runClangTidyAnalysis(configManager, runner, jsonParser, textParser, webview);
    });

    const showLastReportCommand = vscode.commands.registerCommand('clangTidyVisualizer.showReport', () => {
        vscode.window.showInformationMessage(i18n.t('command.showLastReportNotImplemented'));
    });

    // Add commands to context subscriptions
    context.subscriptions.push(runAnalysisCommand);
    context.subscriptions.push(showLastReportCommand);

    logger.info('Extension commands registered');
}

/**
 * Run Clang-Tidy analysis and show report
 */
async function runClangTidyAnalysis(
    configManager: ConfigManager,
    runner: ClangTidyRunner,
    jsonParser: JsonParser,
    textParser: TextParser,
    webview: ReportWebview
): Promise<void> {
    try {
        // Show progress bar
        await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: 'Clang-Tidy Visualizer',
                cancellable: true
            },
            async (progress, token) => {
                progress.report({ message: 'Initializing...' });

                // Check if Clang-Tidy is available
                if (!(await runner.checkClangTidyAvailable())) {
                    vscode.window.showErrorMessage(i18n.t('error.clangTidyNotFound'));
                    return;
                }

                // Get current workspace folder
                const workspaceFolder = FileUtils.getWorkspaceRoot();
                if (!workspaceFolder) {
                    vscode.window.showErrorMessage(i18n.t('error.noWorkspaceFolder'));
                    return;
                }

                // Check if compile_commands.json exists
                const compileCommandsPath = configManager.getCompileCommandsPath();
                logger.debug(`Checking if compile_commands.json exists at: ${compileCommandsPath}`);
                
                if (!FileUtils.exists(compileCommandsPath)) {
                    logger.error(`Compile database not found at: ${compileCommandsPath}`);
                    vscode.window.showErrorMessage(i18n.t('error.compileDatabaseNotFound', `Compile database not found at: ${compileCommandsPath}`, compileCommandsPath));
                    vscode.window.showInformationMessage(i18n.t('info.generateCompileCommands'));
                    return;
                }
                
                logger.debug(`Found compile_commands.json at: ${compileCommandsPath}`);

                // Get selected files or all C/C++ files in workspace
                let files: string[] = [];
                const activeEditor = vscode.window.activeTextEditor;
                
                if (activeEditor && (activeEditor.document.languageId === 'cpp' || activeEditor.document.languageId === 'c')) {
                    // Analyze only the active file
                    files = [activeEditor.document.uri.fsPath];
                    progress.report({ message: `Analyzing current file...` });
                    logger.debug(`Analyzing single file: ${files[0]}`);
                } else {
                    // Analyze all C/C++ files in workspace
                const filePatterns = [
                    '**/*.cpp', '**/*.c', '**/*.hpp', '**/*.h',
                    '**/*.cxx', '**/*.cc', '**/*.hh', '**/*.hxx'
                ];
                
                logger.debug(`Searching for files with patterns: ${filePatterns.join(', ')}`);
                
                // Enhanced ignore pattern - similar to Python script
                const ignorePattern = '**/{node_modules,build,out,third_party}/**';
                const allFiles = await Promise.all(filePatterns.map(pattern => 
                    vscode.workspace.findFiles(pattern, ignorePattern)
                ));
                
                files = allFiles.flat().map(uri => uri.fsPath);
                
                // Additional filtering - ensure we only analyze source files from compile_commands.json
                // This helps avoid analyzing files that aren't part of the build system
                const compileCommandsPath = configManager.getCompileCommandsPath();
                if (FileUtils.exists(compileCommandsPath)) {
                    try {
                        const compileCommands = JSON.parse(FileUtils.readFile(compileCommandsPath));
                        const buildFiles = new Set<string>();
                        
                        for (const entry of compileCommands) {
                            const file = entry['file'];
                            const directory = entry['directory'];
                            const absFile = path.isAbsolute(file) ? file : path.join(directory, file);
                            buildFiles.add(absFile);
                        }
                        
                        // Filter files to only include those in compile_commands.json
                        const filteredFiles = files.filter(file => buildFiles.has(file));
                        
                        logger.debug(`Filtered files using compile_commands.json: ${filteredFiles.length} out of ${files.length} files`);
                        files = filteredFiles;
                    } catch (error) {
                        logger.error('Failed to filter files using compile_commands.json:', error as Error);
                        // Continue with all found files if compile_commands.json parsing fails
                    }
                }
                    
                    logger.debug(`Found ${files.length} files after filtering: ${files.slice(0, 5).join(', ')}${files.length > 5 ? '...' : ''}`);
                    
                    if (files.length === 0) {
                        vscode.window.showErrorMessage(i18n.t('error.noCppFilesFound'));
                        logger.warn('No C/C++ files found in workspace');
                        return;
                    }
                    
                    progress.report({ message: `Found ${files.length} files to analyze...` });
                }

                // Prepare run options
                const options: RunOptions = {
                    checks: configManager.getChecks(),
                    headerFilter: configManager.getHeaderFilter(),
                    parallel: true,
                    outputFormat: 'text',
                    extraArgs: configManager.getExtraArgs()
                };

                // Run analysis
                progress.report({ message: 'Running Clang-Tidy analysis...' });
                
                // Create a single result object compatible with textParser
                let result;
                
                // Use parallel processing if multiple files
                if (files.length > 1) {
                    const parallelResults = await runner.runParallel(files, options, (completed, total) => {
                        const percentage = Math.round((completed / total) * 100);
                        progress.report({
                            message: `Analyzing files... ${percentage}% (${completed}/${total} batches)`,
                            increment: Math.round(100 / total)
                        });
                    });
                    
                    // Combine results from all batches
                    const rawOutput = parallelResults.map(r => r.rawOutput).join('\n');
                    const errorOutput = parallelResults.map(r => r.errorOutput).join('\n');
                    const exitCode = parallelResults.some(r => r.exitCode !== 0) ? 1 : 0;
                    
                    result = {
                        rawOutput,
                        errorOutput,
                        exitCode
                    };
                } else {
                    // Use single file processing for better performance with small number of files
                    result = await runner.runAnalysis(files, options);
                }

                if (result.exitCode !== 0 && !result.rawOutput) {
                    vscode.window.showErrorMessage(i18n.t('error.analysisFailed', `Clang-Tidy analysis failed: ${result.errorOutput}`, result.errorOutput));
                    return;
                }

                // Parse results - use text format only
                progress.report({ message: 'Parsing results...' });
                logger.info('Using text format for parsing results');
                const diagnostics = textParser.parseClangTidyText(result.rawOutput);

                if (diagnostics.length === 0) {
                    vscode.window.showInformationMessage(i18n.t('info.noIssuesFound'));
                    return;
                }

                // Prepare report data
                progress.report({ message: 'Generating report...' });
                const reportData = prepareReportData(diagnostics, files.length);

                // Show report in Webview
                progress.report({ message: 'Opening report...' });
                await webview.showReport(reportData, {
                    checks: options.checks,
                    includeCharts: configManager.getReportConfig().includeCharts,
                    style: configManager.getReportConfig().style
                });

                // Show summary notification
                vscode.window.showInformationMessage(
                    `Clang-Tidy analysis completed: ${reportData.totalWarnings} issues found in ${reportData.filesWithWarnings} files`
                );

                logger.info(i18n.t('status.analysisCompleted', `Analysis completed: ${reportData.totalWarnings} issues in ${reportData.filesWithWarnings} files`, reportData.totalWarnings, reportData.filesWithWarnings));
            }
        );
    } catch (error) {
        logger.error('Error during Clang-Tidy analysis', error as Error);
        vscode.window.showErrorMessage(i18n.t('error.generic', `Error: ${error instanceof Error ? error.message : String(error)}`, error instanceof Error ? error.message : String(error)));
    }
}

/**
 * Prepare report data from diagnostics
 */
function prepareReportData(diagnostics: any[], totalFiles: number): ReportData {
    // Count warnings by checker
    const warningsByChecker: Record<string, number> = {};
    diagnostics.forEach(diag => {
        // Only count warnings with a valid check name
        if (diag.checkName) {
            warningsByChecker[diag.checkName] = (warningsByChecker[diag.checkName] || 0) + 1;
        }
    });

    // Group diagnostics by file
    const files: Record<string, any[]> = {};
    diagnostics.forEach(diag => {
        if (!files[diag.filePath]) {
            files[diag.filePath] = [];
        }
        files[diag.filePath].push(diag);
    });

    return {
        diagnostics,
        totalFilesChecked: totalFiles,
        filesWithWarnings: Object.keys(files).length,
        totalWarnings: diagnostics.length,
        warningsByChecker,
        files
    };
}

export function deactivate() {
    logger.info('Clang-Tidy Visualizer extension deactivated');
}
