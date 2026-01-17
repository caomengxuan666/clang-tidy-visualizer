// Test script to verify the actual TextParser class

// Since we can't directly import TypeScript, let's test the actual parsing logic
// that we implemented in TextParser.ts

// Test data with exact structure that Clang-Tidy produces
const clangTidyOutput = `D:\\codespace\\test\\test.cpp:34:21: warning: C-style casts are discouraged; use static_cast [google-readability-casting]
   34 |     int converted = (int)val; // C-style cast
      |                     ^~~~~
      |                     static_cast<int>( )
D:\\codespace\\test\\test.cpp:44:16: warning: use nullptr [modernize-use-nullptr]
   44 |     int* ptr = NULL; // Should use nullptr
      |                ^~~~
      |                nullptr
D:\\codespace\\test\\test.cpp:75:18: warning: C-style casts are discouraged; use static_cast [google-readability-casting]
   75 |   int *raw_ptr = (int*)malloc(sizeof(int)); // C-style cast
      |                  ^~~~~~
      |                  static_cast<int*>(       )
`;

// The actual parsing logic we implemented in TextParser.ts
function parseWithActualLogic(output) {
    const diagnostics = [];
    const lines = output.split('\n');
    const warningRegex = /^([a-zA-Z]:[\/].*?|.*?):(\d+):(\d+):\s+([a-zA-Z]+):\s+(.*?)(?:\s+\[([^\]]+)\])?$/;
    
    let currentDiagnostic = null;
    
    for (const line of lines) {
        if (!line.trim()) {
            currentDiagnostic = null;
            continue;
        }
        
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
            // Check if this line is part of the current diagnostic's output
            const isCodeLine = /^\s{3}\d+\s+\|/.test(line);
            const isDiagnosticDetailLine = /^\s{6}\|/.test(line);
            
            if (isCodeLine || isDiagnosticDetailLine) {
                if (isCodeLine) {
                    // This is the code line
                    const codePart = line.split('|').pop()?.trim() || line;
                    currentDiagnostic.codeLineFull = codePart;
                } else {
                    // This is either a caret line or a fix suggestion line
                    const trimmedLine = line.trim();
                    
                    if (trimmedLine.includes('^')) {
                        // This is a caret line
                        const contentBeforeSeparator = line.split('|')[0];
                        const whitespace = contentBeforeSeparator + '| ';
                        const caretPart = trimmedLine.split('|').pop()?.trim() || '';
                        const caretLine = whitespace + '^'.repeat(caretPart.length);
                        currentDiagnostic.caretLine = caretLine;
                    } else {
                        // This is a fix suggestion line
                        const fixPart = trimmedLine.split('|').pop()?.trim() || line;
                        if (currentDiagnostic.fixSuggestion) {
                            currentDiagnostic.fixSuggestion += '\n' + fixPart;
                        } else {
                            currentDiagnostic.fixSuggestion = fixPart;
                        }
                    }
                }
            } else {
                // Not part of current diagnostic, reset
                currentDiagnostic = null;
            }
        }
    }
    
    return diagnostics;
}

// Test the actual logic
console.log('=== Testing Actual TextParser Logic ===\n');

const diagnostics = parseWithActualLogic(clangTidyOutput);

console.log(`Parsed ${diagnostics.length} diagnostics\n`);

diagnostics.forEach((diag, index) => {
    console.log(`Diagnostic ${index + 1}:`);
    console.log(`  File: ${diag.filePath}`);
    console.log(`  Line: ${diag.line}`);
    console.log(`  Check: ${diag.checkName}`);
    console.log(`  Message: ${diag.message}`);
    
    if (diag.codeLineFull) {
        console.log(`  Code: ${diag.codeLineFull}`);
    }
    
    if (diag.caretLine) {
        console.log(`  Caret: ${diag.caretLine}`);
    }
    
    if (diag.fixSuggestion) {
        console.log(`  Fix: ${diag.fixSuggestion}`);
    }
    
    console.log('');
});

// Verification
const withFixes = diagnostics.filter(d => !!d.fixSuggestion);
console.log(`=== VERIFICATION ===`);
console.log(`Diagnostics with fix suggestions: ${withFixes.length} / ${diagnostics.length}`);

if (withFixes.length === 0) {
    console.log('❌ FAIL: No fix suggestions were parsed!');
    process.exit(1);
} else {
    console.log('✅ SUCCESS: Fix suggestions were parsed correctly!');
    console.log(`\nExample fix: ${withFixes[0].fixSuggestion}`);
    process.exit(0);
}
