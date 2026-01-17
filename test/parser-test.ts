// Test script to verify TextParser can correctly parse fix suggestions
import { TextParser } from '../src/core/parser/TextParser';
import { ClangTidyDiagnostic } from '../src/types';

// Test text with fix suggestions
const testText = `D:\\codespace\\test-clang-tidy\\test\\test.cpp:34:21: warning: C-style casts are discouraged; use static_cast [google-readability-casting]
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

function runTest(): void {
    console.log('Testing TextParser with fix suggestions...');
    
    // Create TextParser instance
    const textParser = new TextParser();
    
    // Parse the test text
    const diagnostics = textParser.parseClangTidyText(testText);
    
    // Log results
    console.log(`\nParsed ${diagnostics.length} diagnostics:`);
    
    diagnostics.forEach((diagnostic, index) => {
        console.log(`\nDiagnostic ${index + 1}:`);
        console.log(`  File: ${diagnostic.filePath}`);
        console.log(`  Line: ${diagnostic.line}`);
        console.log(`  Check: ${diagnostic.checkName}`);
        console.log(`  Message: ${diagnostic.message}`);
        console.log(`  Has fix suggestion: ${!!diagnostic.fixSuggestion}`);
        if (diagnostic.fixSuggestion) {
            console.log(`  Fix suggestion: ${diagnostic.fixSuggestion}`);
        }
    });
    
    // Verify results
    const diagnosticsWithFixes = diagnostics.filter(d => !!d.fixSuggestion);
    console.log(`\nVerification:`);
    console.log(`Diagnostics with fix suggestions: ${diagnosticsWithFixes.length} / ${diagnostics.length}`);
    
    if (diagnosticsWithFixes.length > 0) {
        console.log('✓ Fix suggestions are being parsed correctly!');
        process.exit(0);
    } else {
        console.log('✗ Fix suggestions are NOT being parsed!');
        process.exit(1);
    }
}

// Run the test
runTest();
