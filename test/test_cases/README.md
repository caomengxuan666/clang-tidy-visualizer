# Clang-Tidy Visualizer Test Cases

This directory contains test cases to verify the functionality of Clang-Tidy Visualizer extension.

## Test Structure

Each file contains different types of C++ code issues that should be detected by Clang-Tidy.

## Files

1. **test_basic.cpp** - Basic syntax issues
2. **test_google_style.cpp** - Google C++ Style Guide violations
3. **test_misc.cpp** - Miscellaneous issues
4. **test_readability.cpp** - Readability issues
5. **test_performance.cpp** - Performance issues
6. **test_bugprone.cpp** - Bug-prone code patterns
7. **test_portability.cpp** - Portability issues
8. **test_modernize.cpp** - Modern C++ usage issues
9. **test_cert.cpp** - CERT security guidelines violations
10. **test_concurrency.cpp** - Concurrency issues

## Running Tests

1. Open the test directory in VS Code
2. Run Clang-Tidy Visualizer extension
3. Verify all issues are detected correctly
4. Check that parallel processing works properly
5. Ensure progress bar shows accurate status

## Expected Results

The extension should detect all intentionally added issues in these test files.
