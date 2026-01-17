const { TextParser } = require('../out/src/core/parser/TextParser');

// Simulate Clang-Tidy output with fix suggestions
const clangTidyOutput = `D:\\codespace\\test-clang-tidy\\test\\test.cpp:75:18: warning: C-style casts are discouraged; use static_cast [google-readability-casting]
   75 |   int *raw_ptr = (int*)malloc(sizeof(int)); // C-style cast and raw pointer to allocated memory        |                  ^~~~~~
   75 |   int *raw_ptr = (int*)malloc(sizeof(int)); // C-style cast and raw pointer to allocated memory        |                  static_cast<int*>(
   75 |   int *raw_ptr = (int*)malloc(sizeof(int)); // C-style cast and raw pointer to allocated memory        |                  
`;

// Parse the output
const parser = new TextParser();
const result = parser.parse(clangTidyOutput);

// Debug the parsed data
console.log('=== Debug Parser Output ===');
console.log(`Found ${result.diagnostics.length} diagnostics`);

result.diagnostics.forEach((diagnostic, index) => {
    console.log(`\nDiagnostic ${index + 1}:`);
    console.log(`  File: ${diagnostic.filePath}`);
    console.log(`  Line: ${diagnostic.line}`);
    console.log(`  Column: ${diagnostic.column}`);
    console.log(`  Code Line Full: "${diagnostic.codeLineFull}"`);
    console.log(`  Caret Line: "${diagnostic.caretLine}"`);
    console.log(`  Fix Suggestion: "${diagnostic.fixSuggestion}"`);
    
    // Show the lengths
    if (diagnostic.codeLineFull) {
        console.log(`  Code Line Length: ${diagnostic.codeLineFull.length}`);
    }
    if (diagnostic.caretLine) {
        console.log(`  Caret Line Length: ${diagnostic.caretLine.length}`);
        console.log(`  Caret Position: ${diagnostic.caretLine.indexOf('^')}`);
    }
    if (diagnostic.fixSuggestion) {
        console.log(`  Fix Suggestion Length: ${diagnostic.fixSuggestion.length}`);
        console.log(`  Fix Suggestion Trimmed: "${diagnostic.fixSuggestion.trim()}"`);
    }
});
