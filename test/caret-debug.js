// Detailed test script to debug caret line parsing
const fs = require('fs');
const path = require('path');

// Realistic Clang-Tidy output as it appears in terminal
const clangTidyOutput = `D:\\codespace\\test-clang-tidy\\test\\test.cpp:75:18: warning: C-style casts are discouraged; use static_cast [google-readability-casting]
   75 |   int *raw_ptr = (int*)malloc(sizeof(int)); // C-style cast and raw pointer to allocated memory
      |                  ^~~~~~
      |                  static_cast<int*>(       )

D:\\codespace\\test-clang-tidy\\test\\test.cpp:44:16: warning: use nullptr [modernize-use-nullptr]
   44 |     int* ptr = NULL; // Should use nullptr
      |                ^~~~     
      |                nullptr
`;

// Simulate the parsing process exactly as in TextParser.ts
function debugParsing(output) {
    const lines = output.split('\n');
    const diagnostics = [];
    let currentDiagnostic = null;
    
    console.log('=== LINE BY LINE ANALYSIS ===');
    console.log('Lines in output:', lines.length);
    console.log('\n');
    
    lines.forEach((line, index) => {
        console.log(`Line ${index}: "${line.replace(/\n/g, '\\n')}"`);
        console.log(`  Trimmed: "${line.trim()}"`);
        console.log(`  Length: ${line.length}`);
        
        if (line.includes(': warning:') || line.includes(': error:')) {
            console.log('  -> Warning/Error line');
            const match = line.match(/^(.*):(\d+):(\d+): (?:warning|error): (.*) \[(.*)\]/);
            if (match) {
                console.log('  -> Matched diagnostic pattern');
                currentDiagnostic = {
                    filePath: match[1],
                    line: parseInt(match[2]),
                    column: parseInt(match[3]),
                    message: match[4],
                    checkName: match[5],
                    codeLineFull: null,
                    caretLine: null,
                    fixSuggestion: null
                };
                diagnostics.push(currentDiagnostic);
            }
        } else if (currentDiagnostic) {
            // Check for code line
            const isCodeLine = /^\s{3}\d+\s+\|/.test(line);
            console.log(`  -> Is Code Line: ${isCodeLine}`);
            
            // Check for diagnostic detail line (caret or fix suggestion)
            const isDiagnosticDetailLine = /^\s+\|/.test(line);
            console.log(`  -> Is Diagnostic Detail Line: ${isDiagnosticDetailLine}`);
            
            // Check if line contains ^
            const hasCaret = line.includes('^');
            console.log(`  -> Has Caret: ${hasCaret}`);
            
            if (isCodeLine || isDiagnosticDetailLine) {
                console.log('  -> Processing as diagnostic content line');
                
                if (isCodeLine) {
                    console.log('  -> Extracting code line');
                    const codePart = line.split('|').pop()?.trim() || line;
                    currentDiagnostic.codeLineFull = codePart;
                    console.log(`  -> Code Line: "${codePart}"`);
                } else {
                    console.log('  -> Processing caret/fix suggestion line');
                    if (hasCaret) {
                        console.log('  -> Extracting caret line');
                        currentDiagnostic.caretLine = line;
                        console.log(`  -> Caret Line: "${line}"`);
                    } else {
                        console.log('  -> Extracting fix suggestion line');
                        if (currentDiagnostic.fixSuggestion) {
                            currentDiagnostic.fixSuggestion += '\n' + line;
                        } else {
                            currentDiagnostic.fixSuggestion = line;
                        }
                        console.log(`  -> Fix Suggestion: "${line}"`);
                    }
                }
            } else if (line.trim() === '') {
                console.log('  -> Empty line, resetting current diagnostic');
                currentDiagnostic = null;
            }
        }
        
        console.log('\n');
    });
    
    console.log('=== FINAL DIAGNOSTICS ===');
    diagnostics.forEach((diagnostic, index) => {
        console.log(`\nDiagnostic ${index + 1}:`);
        console.log(`  File: ${diagnostic.filePath}`);
        console.log(`  Line: ${diagnostic.line}`);
        console.log(`  Column: ${diagnostic.column}`);
        console.log(`  Code Line: "${diagnostic.codeLineFull}"`);
        console.log(`  Caret Line: "${diagnostic.caretLine}"`);
        console.log(`  Fix Suggestion: "${diagnostic.fixSuggestion}"`);
        
        // Check if caret line exists and contains ^
        if (diagnostic.caretLine) {
            console.log(`  Caret Line Contains ^: ${diagnostic.caretLine.includes('^')}`);
            console.log(`  Caret Position: ${diagnostic.caretLine.indexOf('^')}`);
        } else {
            console.log('  Caret Line Missing!');
        }
        
        // Show what HTML would be generated
        console.log('\n  Generated HTML:');
        if (diagnostic.codeLineFull) {
            console.log(`  <div class="code-line"><span class="line-number">${diagnostic.line}</span><span class="line-separator">|</span><span class="line-content">${diagnostic.codeLineFull}</span></div>`);
        }
        
        if (diagnostic.caretLine) {
            const caretContent = diagnostic.caretLine.split('|').pop();
            console.log(`  <div class="code-line"><span class="line-number"></span><span class="line-separator">|</span><span class="line-content">${caretContent}</span></div>`);
        }
        
        if (diagnostic.fixSuggestion) {
            const fixLines = diagnostic.fixSuggestion.split('\n');
            fixLines.forEach(line => {
                const fixContent = line.split('|').pop();
                console.log(`  <div class="code-line"><span class="line-number"></span><span class="line-separator">|</span><span class="line-content fix-suggestion">${fixContent}</span></div>`);
            });
        }
    });
    
    return diagnostics;
}

// Run the debug
const result = debugParsing(clangTidyOutput);
console.log('\n=== SUMMARY ===');
console.log(`Processed ${result.length} diagnostics`);
const caretMissing = result.filter(d => !d.caretLine).length;
console.log(`Diagnostics missing caret line: ${caretMissing}/${result.length}`);
