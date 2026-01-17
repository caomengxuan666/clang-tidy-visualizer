// Debug test script to see what's happening with line parsing

// Mock Clang-Tidy output with fix suggestions
const testOutput = `D:\\codespace\\test-clang-tidy\\test\\test.cpp:34:21: warning: C-style casts are discouraged; use static_cast [google-readability-casting]
   34 |     int converted = (int)val; // C-style cast, should use static_cast
      |                     ^~~~~
      |                     static_cast<int>( )
D:\\codespace\\test-clang-tidy\\test\\test.cpp:44:16: warning: use nullptr [modernize-use-nullptr]
   44 |     int* ptr = NULL; // Should use nullptr
      |                ^~~~
      |                nullptr
`;

// Debug each line
function debugLineParsing(output) {
    const lines = output.split('\n');
    const warningRegex = /^([a-zA-Z]:[\/].*?|.*?):(\d+):(\d+):\s+([a-zA-Z]+):\s+(.*?)(?:\s+\[([^\]]+)\])?$/;
    
    console.log('=== DEBUGGING LINE PARSING ===');
    console.log(`Total lines: ${lines.length}`);
    console.log('\n');
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineNum = i + 1;
        
        console.log(`Line ${lineNum}: "${line}"`);
        console.log(`  Length: ${line.length}`);
        console.log(`  Is empty: ${!line.trim()}`);
        
        // Check for indentation
        const indentationMatch = line.match(/^(\s+)/);
        if (indentationMatch) {
            console.log(`  Indentation: "${indentationMatch[1]}"`);
            console.log(`  Indentation length: ${indentationMatch[1].length}`);
        } else {
            console.log(`  Indentation: none`);
        }
        
        // Check if it's a warning line
        const warningMatch = line.match(warningRegex);
        if (warningMatch) {
            console.log(`  Is warning line: YES`);
            console.log(`  Warning info: ${warningMatch[1]}:${warningMatch[2]}:${warningMatch[3]} - ${warningMatch[4]} - ${warningMatch[5]} [${warningMatch[6]}]`);
        } else {
            console.log(`  Is warning line: NO`);
        }
        
        // Check for caret line
        if (line.trim() === '^' || line.trim().startsWith('^')) {
            console.log(`  Is caret line: YES`);
        } else {
            console.log(`  Is caret line: NO`);
        }
        
        // Check for fix suggestion
        if (indentationMatch && indentationMatch[1].length >= 6 && line.trim() && !warningMatch) {
            console.log(`  Is fix suggestion: PROBABLY YES`);
        }
        
        console.log('');
    }
}

// Run debug
debugLineParsing(testOutput);
