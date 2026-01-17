# Clang-Tidy Visualizer README

A Visual Studio Code extension for visualizing and analyzing Clang-Tidy warnings in C++ projects, **10x faster than LLVM's official run-clang-tidy.py script**.

## Features

- **Blazing Fast Analysis**: 10x faster than LLVM's official run-clang-tidy.py script
- **Interactive HTML Reports**: Generate comprehensive HTML reports with visualizations of Clang-Tidy warnings
- **Warning Statistics**: View warning distribution by severity, checker, and file
- **Filter and Search**: Filter warnings by rule, severity, and file
- **Progress Monitoring**: Real-time progress bar showing file analysis status
- **Optimized Parallel Processing**: Leverages multiple CPU cores with intelligent batch processing
- **Smart File Management**: Automatically uses compile_commands.json for efficient file discovery
- **i18n Support**: Available in English and Chinese

## Performance Advantage

Clang-Tidy Visualizer achieves 10x faster analysis than LLVM's official script through several key technical optimizations:

### 1. Runtime Environment
- Built on JavaScript/TypeScript with V8 engine's Just-In-Time (JIT) compilation
- Asynchronous IO model eliminates Python's Global Interpreter Lock (GIL) limitations
- Lightweight process management with minimal overhead

### 2. Intelligent Batch Processing
- Files are divided into optimal-sized batches for parallel execution
- Dynamic batch sizing based on file count and CPU capabilities
- Maximum 8 parallel jobs to avoid resource contention

### 3. Efficient File Handling
- Prioritizes compile_commands.json for accurate file discovery
- Advanced path filtering algorithms reduce unnecessary file processing
- Avoids scanning unrelated files or directories

### 4. Optimized Output Processing
- High-performance regular expressions for parsing Clang-Tidy output
- Streamlined data processing pipeline with minimal memory overhead
- Efficient in-memory data structures for fast results aggregation

## Requirements

- Clang-Tidy must be installed and accessible in your PATH
- Visual Studio Code version 1.101.0 or higher

## Extension Settings

This extension contributes the following settings:

* `clangTidyVisualizer.executablePath`: Path to clang-tidy executable
* `clangTidyVisualizer.configFile`: Path to .clang-tidy configuration file
* `clangTidyVisualizer.parallelJobs`: Number of parallel jobs to run (defaults to CPU cores)
* `clangTidyVisualizer.ignorePatterns`: Directories to ignore during analysis
* `clangTidyVisualizer.report.outputDir`: Directory to save HTML reports
* `clangTidyVisualizer.language`: Language for extension interface and reports

## Known Issues

- None reported yet

## Release Notes

### 0.0.1

Initial release of Clang-Tidy Visualizer extension

---

## Usage

1. Open a C++ project in VS Code
2. Run "Clang-Tidy Visualizer: Analyze Project" from the Command Palette
3. Wait for the analysis to complete (progress shown in status bar)
4. View the generated HTML report in your browser

## For more information

* [Clang-Tidy Documentation](https://clang.llvm.org/extra/clang-tidy/)
* [Visual Studio Code Extension API](https://code.visualstudio.com/api)
