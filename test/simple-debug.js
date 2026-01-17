// Simple debug script to test fix suggestion parsing

// Simulate Clang-Tidy output with fix suggestions (exactly as it appears in terminal)
const clangTidyOutput = `D:\\codespace\\test-clang-tidy\\test\\test.cpp:75:18: warning: C-style casts are discouraged; use static_cast [google-readability-casting]
   75 |   int *raw_ptr = (int*)malloc(sizeof(int)); // C-style cast and raw pointer to allocated memory
      |                  ^~~~~~
      |                  static_cast<int*>(       )
D:\\codespace\\test-clang-tidy\\test\\test.cpp:44:16: warning: use nullptr [modernize-use-nullptr]
   44 |     int* ptr = NULL; // Should use nullptr
      |                ^~~~     
      |                nullptr
`;

// Manual parsing to see what's happening
function simulateParsing(output) {
    const lines = output.split('\n');
    const diagnostics = [];
    let currentDiagnostic = null;

    lines.forEach(line => {
        if (line.includes(': warning:')) {
            // Start of a new diagnostic
            const match = line.match(/^(.*):(\d+):(\d+): warning: (.*) \[(.*)\]/);
            if (match) {
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
            const trimmedLine = line.trim();

            if (line.match(/^\s{3}\d+\s+\|/)) {
                // This is a code line
                const codePart = line.split('|').pop()?.trim() || line;
                currentDiagnostic.codeLineFull = codePart;
            } else if (line.match(/^\s{6}\s*\|/)) {
                // This is either a caret line or a fix suggestion line
                if (trimmedLine.includes('^')) {
                    // This is a caret line
                    const contentBeforeSeparator = line.split('|')[0];
                    const whitespace = contentBeforeSeparator + '| ';
                    const caretPart = trimmedLine.split('|').pop()?.trim() || '';
                    const caretLine = whitespace + '^'.repeat(caretPart.length);
                    currentDiagnostic.caretLine = caretLine;
                } else {
                    // This is a fix suggestion line
                    // Extract everything after |, preserving whitespace
                    const separatorIndex = line.indexOf('|');
                    if (separatorIndex !== -1) {
                        const fixPart = line.substring(separatorIndex + 1);
                        if (currentDiagnostic.fixSuggestion) {
                            currentDiagnostic.fixSuggestion += '\n' + fixPart;
                        } else {
                            currentDiagnostic.fixSuggestion = fixPart;
                        }
                    }
                }
            } else if (trimmedLine === '') {
                // Empty line, reset
                currentDiagnostic = null;
            }
        }
    });

    return diagnostics;
}

// Parse and debug
const result = simulateParsing(clangTidyOutput);

console.log('=== Parsed Diagnostics ===');
result.forEach((diagnostic, index) => {
    console.log(`\nDiagnostic ${index + 1}:`);
    console.log(`  Code Line Full: "${diagnostic.codeLineFull}"`);
    console.log(`  Caret Line: "${diagnostic.caretLine}"`);
    console.log(`  Fix Suggestion: "${diagnostic.fixSuggestion}"`);

    // Show detailed information
    if (diagnostic.caretLine) {
        console.log(`  Caret Line (unescaped): ${JSON.stringify(diagnostic.caretLine)}`);
        console.log(`  Caret Position: ${diagnostic.caretLine.indexOf('^')}`);
        console.log(`  Caret Line Length: ${diagnostic.caretLine.length}`);
    }

    if (diagnostic.fixSuggestion) {
        console.log(`  Fix Suggestion (unescaped): ${JSON.stringify(diagnostic.fixSuggestion)}`);
        console.log(`  Fix Suggestion Length: ${diagnostic.fixSuggestion.length}`);
        console.log(`  Leading Spaces: ${diagnostic.fixSuggestion.match(/^\s*/)[0].length}`);
    }

    // Simulate the new HTML generation logic
    console.log('\n  Simulated New HTML:');

    // Process caret line
    let processedCaretLine = '';
    if (diagnostic.caretLine) {
        const separatorIndex = diagnostic.caretLine.indexOf('|');
        if (separatorIndex !== -1) {
            processedCaretLine = diagnostic.caretLine.substring(separatorIndex + 1);
        }
    }

    // Process fix suggestion
    let processedFixSuggestion = '';
    if (diagnostic.fixSuggestion && processedCaretLine) {
        const match = processedCaretLine.match(/^\s*/);
        const caretIndentation = match ? match[0] : '';
        const fixLines = diagnostic.fixSuggestion.split('\n');
        processedFixSuggestion = fixLines.map(line => {
            return caretIndentation + line.trimStart();
        }).join('\n');
    } else if (diagnostic.fixSuggestion) {
        processedFixSuggestion = diagnostic.fixSuggestion;
    }

    // Generate HTML
    if (diagnostic.codeLineFull) {
        console.log(`  <div class="code-line"><span class="line-number">${diagnostic.line}</span><span class="line-separator">|</span><span class="line-content">${diagnostic.codeLineFull}</span></div>`);
    }
    if (processedCaretLine) {
        console.log(`  <div class="code-line"><span class="line-number"></span><span class="line-separator">|</span><span class="line-content">${processedCaretLine}</span></div>`);
    }
    if (processedFixSuggestion) {
        console.log(`  <div class="code-line"><span class="line-number"></span><span class="line-separator">|</span><span class="line-content fix-suggestion">${processedFixSuggestion}</span></div>`);
    }

    // Show what it will look like
    console.log('\n  Visual Preview:');
    if (diagnostic.codeLineFull) {
        console.log(`  ${diagnostic.line} | ${diagnostic.codeLineFull}`);
    }
    if (processedCaretLine) {
        console.log(`     | ${processedCaretLine}`);
    }
    if (processedFixSuggestion) {
        processedFixSuggestion.split('\n').forEach(line => {
            console.log(`     | ${line}`);
        });
    }
});
