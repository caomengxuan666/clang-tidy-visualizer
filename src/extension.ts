// Clang-Tidy Visualizer - Extension Main Entry
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as child_process from 'child_process';
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

// Global storage for WSL distribution name (auto-detected, no hardcoding)
let wslDistroName = '';

// Export function to get WSL distro name
export function getWslDistroName(): string {
    return wslDistroName;
}

export function activate(context: ExtensionContext) {
    // Initialize logger with configured log level
    const config = vscode.workspace.getConfiguration('clangTidyVisualizer');
    const logLevel = config.get<'error' | 'warn' | 'info' | 'debug'>('logLevel', 'info');
    logger.setLogLevel(logLevel);
    logger.info('Clang-Tidy Visualizer activated');

    // Auto-detect WSL distribution name if running in WSL remote environment
    if (vscode.env.remoteName === 'wsl') {
        try {
            // Try to get root path and extract distro name using wslpath command
            const rootPath = child_process.execSync('wslpath -w /', { encoding: 'utf8' }).trim();
            logger.debug(`WSL root path: ${rootPath}`);
            
            // Extract distribution name from root path (compatible with both old and new WSL formats)
            // Fix: Correct regex pattern to match both old and new WSL path formats
            const distroMatch = rootPath.match(/\\(?:wsl\.localhost|wsl\$)\\([^\\]+)\\?/);
            if (distroMatch) {
                wslDistroName = distroMatch[1];
                logger.info(`Auto-detected WSL distribution: ${wslDistroName}`);
            } else {
                throw new Error('Failed to extract distribution name from root path');
            }
        } catch (error) {
            logger.warn(`Failed to detect WSL distribution using wslpath: ${error}`);
            
            // Fallback: Try to get distribution name from /etc/os-release
            try {
                const osRelease = child_process.execSync('cat /etc/os-release | grep PRETTY_NAME', { encoding: 'utf8' });
                const distroName = osRelease.split('=')[1].replace(/"/g, '').replace(' ', '-');
                wslDistroName = distroName;
                logger.info(`Fallback detected WSL distribution: ${wslDistroName}`);
            } catch (e) {
                // Last resort: Use Ubuntu as default
                wslDistroName = 'Ubuntu';
                logger.warn(`Failed to detect WSL distribution, using default: ${wslDistroName}`);
            }
        }
        
        // Store WSL distro name in global state for future use
        context.globalState.update('wslDistroName', wslDistroName);
        logger.info(`WSL distribution name stored in global state: ${wslDistroName}`);
    }

    // Initialize components
    const configManager = ConfigManager.getInstance();
    const runner = new ClangTidyRunner(configManager);
    const jsonParser = new JsonParser();
    const textParser = new TextParser();
    const webview = new ReportWebview(context);

    // Register commands
    const runAnalysisCommand = vscode.commands.registerCommand('clangTidyVisualizer.run', async () => {
        // New command: show analysis scope selection first
        await showAnalysisScopeSelection(configManager, runner, jsonParser, textParser, webview);
    });
    
    // Backward compatibility: direct run command (will be deprecated)
    const runDirectCommand = vscode.commands.registerCommand('clangTidyVisualizer.runDirect', async () => {
        await runClangTidyAnalysis(configManager, runner, jsonParser, textParser, webview, null);
    });

    const showLastReportCommand = vscode.commands.registerCommand('clangTidyVisualizer.showReport', () => {
        vscode.window.showInformationMessage(i18n.t('command.showLastReportNotImplemented'));
    });

    // Add commands to context subscriptions
    context.subscriptions.push(runAnalysisCommand);
    context.subscriptions.push(runDirectCommand);
    context.subscriptions.push(showLastReportCommand);

    logger.info('Extension commands registered');
}

/**
 * Show analysis scope selection QuickPick
 */
async function showAnalysisScopeSelection(
    configManager: ConfigManager,
    runner: ClangTidyRunner,
    jsonParser: JsonParser,
    textParser: TextParser,
    webview: ReportWebview
): Promise<void> {
    // Define analysis scope options
    const scopeOptions = [
        { label: 'Current File', description: 'Analyze only the currently active file', scope: 'currentFile' },
        { label: 'Open Files', description: 'Analyze all currently open C/C++ files', scope: 'openFiles' },
        { label: 'Selected Folder', description: 'Analyze all C/C++ files in selected folder', scope: 'selectedFolder' },
        { label: 'Compile Database', description: 'Analyze files listed in compile_commands.json', scope: 'compileDatabase' },
        { label: 'Whole Workspace', description: 'Analyze all C/C++ files in workspace', scope: 'wholeWorkspace' }
    ];
    
    // Show QuickPick for scope selection
    const selectedOption = await vscode.window.showQuickPick(scopeOptions, {
        placeHolder: 'Select analysis scope',
        canPickMany: false
    });
    
    if (!selectedOption) {
        // User cancelled selection
        logger.info('Analysis scope selection cancelled by user');
        return;
    }
    
    logger.info(`Selected analysis scope: ${selectedOption.scope}`);
    
    // Call core analysis function with selected scope
    await runClangTidyAnalysis(configManager, runner, jsonParser, textParser, webview, selectedOption.scope);
}

/**
 * Run Clang-Tidy analysis and show report
 */
async function runClangTidyAnalysis(
    configManager: ConfigManager,
    runner: ClangTidyRunner,
    jsonParser: JsonParser,
    textParser: TextParser,
    webview: ReportWebview,
    scope: string | null
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

                // Get files based on selected scope
                let files: string[] = [];
                const activeEditor = vscode.window.activeTextEditor;
                
                // If no scope specified (backward compatibility), use old logic
                if (!scope) {
                    if (activeEditor && (activeEditor.document.languageId === 'cpp' || activeEditor.document.languageId === 'c')) {
                        files = await getCurrentFileFiles(activeEditor);
                    } else {
                        files = await getWholeWorkspaceFiles(configManager);
                    }
                } else {
                    // Use new scope-based logic
                    switch (scope) {
                        case 'currentFile':
                            files = await getCurrentFileFiles(activeEditor);
                            break;
                        case 'openFiles':
                            files = await getOpenFiles();
                            break;
                        case 'selectedFolder':
                            files = await getSelectedFolderFiles();
                            break;
                        case 'compileDatabase':
                            files = await getCompileDatabaseFiles(configManager);
                            break;
                        case 'wholeWorkspace':
                            files = await getWholeWorkspaceFiles(configManager);
                            break;
                        default:
                            logger.error(`Unknown analysis scope: ${scope}`);
                            vscode.window.showErrorMessage(`Unknown analysis scope: ${scope}`);
                            return;
                    }
                }
                
                logger.debug(`Found ${files.length} files to analyze: ${files.slice(0, 5).join(', ')}${files.length > 5 ? '...' : ''}`);
                
                if (files.length === 0) {
                    vscode.window.showErrorMessage(i18n.t('error.noCppFilesFound'));
                    logger.warn('No C/C++ files found for analysis');
                    return;
                }
                
                progress.report({ message: `Found ${files.length} files to analyze...` });

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
 * Get files for "Current File" scope
 */
async function getCurrentFileFiles(activeEditor: vscode.TextEditor | undefined): Promise<string[]> {
    if (!activeEditor || (activeEditor.document.languageId !== 'cpp' && activeEditor.document.languageId !== 'c')) {
        logger.error('No active C/C++ editor found');
        vscode.window.showErrorMessage('No active C/C++ editor found');
        return [];
    }
    
    const file = activeEditor.document.uri.fsPath;
    logger.debug(`Analyzing current file: ${file}`);
    return [file];
}

/**
 * Get files for "Open Files" scope
 */
async function getOpenFiles(): Promise<string[]> {
    const openFiles: string[] = [];
    
    for (const editor of vscode.window.visibleTextEditors) {
        if (editor.document.languageId === 'cpp' || editor.document.languageId === 'c') {
            openFiles.push(editor.document.uri.fsPath);
        }
    }
    
    logger.debug(`Found ${openFiles.length} open C/C++ files`);
    return openFiles;
}

/**
 * Get files for "Selected Folder" scope
 */
async function getSelectedFolderFiles(): Promise<string[]> {
    let folderPath: string | undefined;
    
    // First try to get folder from active editor
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor) {
        folderPath = path.dirname(activeEditor.document.uri.fsPath);
    } 
    
    // Let user select folder if no active editor or they want to choose different folder
    const selectFolderResult = await vscode.window.showQuickPick(
        [
            { label: 'Use current file\'s folder', description: `${folderPath}`, value: 'current' },
            { label: 'Select different folder...', description: 'Choose a specific folder to analyze', value: 'select' }
        ],
        {
            placeHolder: 'Select folder analysis option',
            canPickMany: false
        }
    );
    
    if (!selectFolderResult) {
        logger.info('Folder selection cancelled by user');
        return [];
    }
    
    // If user wants to select different folder
    if (selectFolderResult.value === 'select' || !folderPath) {
        const selectedFolder = await vscode.window.showOpenDialog({
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
            openLabel: 'Select Folder',
            title: 'Select Folder for Clang-Tidy Analysis'
        });
        
        if (!selectedFolder || selectedFolder.length === 0) {
            logger.info('Folder selection cancelled by user');
            return [];
        }
        
        folderPath = selectedFolder[0].fsPath;
    }
    
    if (!folderPath) {
        logger.error('No folder path determined');
        vscode.window.showErrorMessage('No folder path determined');
        return [];
    }
    
    logger.debug(`Searching for files in selected folder: ${folderPath}`);
    
    // Always use fs directly for searching files - this is more reliable
    const fileExtensions = ['.cpp', '.c', '.hpp', '.h', '.cxx', '.cc', '.hh', '.hxx'];
    const files: string[] = [];
    
    // Use fs to recursively search for files
    const searchRecursively = (dir: string) => {
        try {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                
                if (entry.isDirectory()) {
                    // Skip ignored directories
                    if (entry.name === 'node_modules' || entry.name === 'build' || entry.name === 'out' || entry.name === 'third_party') {
                        logger.debug(`Skipping ignored directory: ${fullPath}`);
                        continue;
                    }
                    searchRecursively(fullPath);
                } else if (entry.isFile()) {
                    const ext = path.extname(entry.name).toLowerCase();
                    if (fileExtensions.includes(ext)) {
                        logger.debug(`Found C/C++ file: ${fullPath}`);
                        files.push(fullPath);
                    }
                }
            }
        } catch (error) {
            logger.error(`Error reading directory ${dir}: ${error}`);
        }
    };
    
    try {
        searchRecursively(folderPath);
        logger.debug(`Found ${files.length} C/C++ files in selected folder`);
        return files;
    } catch (error) {
        logger.error(`Error searching files in folder ${folderPath}: ${error}`);
        vscode.window.showErrorMessage(`Error searching files in folder: ${error}`);
        return [];
    }
}

/**
 * Get files for "Compile Database" scope
 */
async function getCompileDatabaseFiles(configManager: ConfigManager): Promise<string[]> {
    const compileCommandsPath = configManager.getCompileCommandsPath();
    if (!FileUtils.exists(compileCommandsPath)) {
        logger.error(`Compile database not found at: ${compileCommandsPath}`);
        return [];
    }
    
    try {
        const compileCommandsContent = FileUtils.readFile(compileCommandsPath);
        const compileCommands = JSON.parse(compileCommandsContent);
        
        const files = new Set<string>();
        // Enhanced ignore pattern - similar to other scopes
        const ignorePatterns = [
            /node_modules/i,
            /build/i,
            /out/i,
            /third_party/i
        ];
        
        for (const entry of compileCommands) {
            const file = entry['file'];
            const directory = entry['directory'];
            
            let absFile = path.isAbsolute(file) ? file : path.join(directory, file);
            absFile = path.normalize(absFile);
            
            // Check if file path matches any ignore pattern
            const shouldIgnore = ignorePatterns.some(pattern => pattern.test(absFile));
            if (shouldIgnore) {
                logger.debug(`Ignoring file from compile database: ${absFile}`);
                continue;
            }
            
            files.add(absFile);
        }
        
        logger.debug(`Found ${files.size} files in compile_commands.json after filtering`);
        return Array.from(files);
    } catch (error) {
        logger.error('Failed to parse compile_commands.json:', error as Error);
        return [];
    }
}

/**
 * Get files for "Whole Workspace" scope
 */
async function getWholeWorkspaceFiles(configManager: ConfigManager): Promise<string[]> {
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
    
    let files = allFiles.flat().map(uri => uri.fsPath);
    
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
            
            const filteredFiles = files.filter(file => buildFiles.has(file));
            logger.debug(`Filtered files using compile_commands.json: ${filteredFiles.length} out of ${files.length} files`);
            
            // Use filtered files if we found any, otherwise use all files
            files = filteredFiles.length > 0 ? filteredFiles : files;
        } catch (error) {
            logger.error('Failed to filter files using compile_commands.json:', error as Error);
            // Continue with all found files if compile_commands.json parsing fails
        }
    }
    
    logger.debug(`Found ${files.length} C/C++ files in whole workspace`);
    return files;
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
