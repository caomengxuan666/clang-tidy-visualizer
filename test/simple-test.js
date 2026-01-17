// Simple test script to verify fix suggestion parsing logic

// Mock Clang-Tidy output with fix suggestions
const testOutput = `D:\\codespace\\test-clang-tidy\\test\\test.cpp:34:21: warning: C-style casts are discouraged; use static_cast [google-readability-casting]
   34 |     int converted = (int)val; // C-style cast, should use static_cast
      |                     ^~~~~
      |                     static_cast<int>( )
D:\\codespace\\test-clang-tidy\\test\\test.cpp:44:16: warning: use nullptr [modernize-use-nullptr]
   44 |     int* ptr = NULL; // Should use nullptr
      |                ^~~~
      |                nullptr
D:\\codespace\\test-clang-tidy\\test\\test.cpp:75:18: warning: C-style casts are discouraged; use static_cast [google-readability-casting]
   75 |   int *raw_ptr = (int*)malloc(sizeof(int)); // C-style cast and raw pointer to allocated memory
      |                  ^~~~~~
      |                  static_cast<int*>(       )
`;

// Simplified parsing logic to test fix suggestion detection
function testFixSuggestionParsing(output) {
    const diagnostics = [];
    const lines = output.split('\n');
    const warningRegex = /^([a-zA-Z]:[\/].*?|.*?):(\d+):(\d+):\s+([a-zA-Z]+):\s+(.*?)(?:\s+\[([^\]]+)\])?$/;
    
    let currentDiagnostic = null;
    
    for (const line of lines) {
        if (!line.trim()) {
            currentDiagnostic = null;
            continue;
        }
        
        // Check if this is a warning line
        const warningMatch = line.match(warningRegex);
        if (warningMatch) {
            const [, filePath, lineStr, columnStr, severityStr, message, checkName = ''] = warningMatch;
            
            const diagnostic = {
                filePath,
                line: parseInt(lineStr, 10),
                column: parseInt(columnStr, 10),
                severity: severityStr.toLowerCase(),
                message: message.trim(),
                checkName
            };
            
            diagnostics.push(diagnostic);
            currentDiagnostic = diagnostic;
        } else if (currentDiagnostic) {
            // Check if this is a fix suggestion line
            const trimmedLine = line.trim();
            if (trimmedLine) {
                // Fix suggestions typically start with significant indentation (6+ spaces)
                const indentation = line.match(/^(\s+)/);
                const hasEnoughIndentation = indentation && indentation[1].length >= 6;
                
                if (hasEnoughIndentation) {
                    if (currentDiagnostic.fixSuggestion) {
                        currentDiagnostic.fixSuggestion += '\n' + trimmedLine;
                    } else {
                        currentDiagnostic.fixSuggestion = trimmedLine;
                    }
                    // Also check for caret line
                    if (trimmedLine === '^' || trimmedLine.startsWith('^')) {
                        currentDiagnostic.caretLine = line.replace(/^(\s+).*$/, '$1') + '^';
                    }
                } else {
                    currentDiagnostic = null;
                }
            } else {
                currentDiagnostic = null;
            }
        }
    }
    
    return diagnostics;
}

// Run the test
console.log('Testing fix suggestion parsing...');
const diagnostics = testFixSuggestionParsing(testOutput);

console.log(`\nParsed ${diagnostics.length} diagnostics:`);

diagnostics.forEach((diag, index) => {
    console.log(`\nDiagnostic ${index + 1}:`);
    console.log(`  File: ${diag.filePath}`);
    console.log(`  Line: ${diag.line}`);
    console.log(`  Check: ${diag.checkName}`);
    console.log(`  Message: ${diag.message}`);
    console.log(`  Has fix suggestion: ${!!diag.fixSuggestion}`);
    if (diag.fixSuggestion) {
        console.log(`  Fix suggestion: ${diag.fixSuggestion}`);
    }
    console.log(`  Has caret line: ${!!diag.caretLine}`);
    if (diag.caretLine) {
        console.log(`  Caret line: ${diag.caretLine}`);
    }
});

// Verify results
const diagnosticsWithFixes = diagnostics.filter(d => d.fixSuggestion);
console.log(`\nVerification:`);
console.log(`Diagnostics with fix suggestions: ${diagnosticsWithFixes.length} / ${diagnostics.length}`);

if (diagnosticsWithFixes.length === 0) {
    console.error('ERROR: No fix suggestions were parsed!');
    process.exit(1);
} else {
    console.log('SUCCESS: Fix suggestions were parsed correctly!');
    process.exit(0);
}
