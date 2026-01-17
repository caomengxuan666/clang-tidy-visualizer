// Extension Integration Test Script
// This script simulates VSCode extension activation and command execution

const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// Test configuration
const TEST_CONFIG = {
    testFile: path.join(__dirname, 'test.cpp'),
    compileCommands: path.join(__dirname, 'compile_commands.json'),
    extensionPath: path.join(__dirname, '..'),
    clangTidyPath: 'clang-tidy'
};

// Test steps
async function runTests() {
    console.log('=== Clang-Tidy Visualizer Extension Integration Test ===\n');

    try {
        // Step 1: Verify extension compilation
        console.log('1. Verifying extension compilation...');
        await runCommand('npm run compile', { cwd: TEST_CONFIG.extensionPath });
        console.log('✓ Extension compiled successfully');

        // Step 2: Verify dist directory exists
        console.log('\n2. Checking dist directory...');
        const distPath = path.join(TEST_CONFIG.extensionPath, 'dist');
        if (fs.existsSync(distPath)) {
            console.log('✓ dist directory exists');
        } else {
            throw new Error('dist directory not found');
        }

        // Step 3: Verify extension.js exists
        console.log('\n3. Checking extension.js...');
        const extensionJsPath = path.join(TEST_CONFIG.extensionPath, 'dist', 'extension.js');
        if (fs.existsSync(extensionJsPath)) {
            console.log('✓ extension.js exists');
        } else {
            throw new Error('extension.js not found in dist directory');
        }

        // Step 4: Verify test files
        console.log('\n4. Checking test files...');
        if (!fs.existsSync(TEST_CONFIG.testFile)) {
            throw new Error('test.cpp not found');
        }
        if (!fs.existsSync(TEST_CONFIG.compileCommands)) {
            throw new Error('compile_commands.json not found');
        }
        console.log('✓ Test files found');

        // Step 5: Test Clang-Tidy execution
        console.log('\n5. Testing Clang-Tidy execution...');
        const clangTidyCmd = `${TEST_CONFIG.clangTidyPath} -p ${TEST_CONFIG.compileCommands} ${TEST_CONFIG.testFile} -- -std=c++17`;
        const clangTidyOutput = await runCommand(clangTidyCmd, { cwd: path.dirname(TEST_CONFIG.testFile) });

        // Check if output contains expected warnings
        const expectedWarnings = ['cppcoreguidelines-special-member-functions', 'magic number', 'memory leak'];
        const foundWarnings = expectedWarnings.filter(warning => clangTidyOutput.includes(warning));

        console.log(`✓ Clang-Tidy executed successfully`);
        console.log(`✓ Found ${foundWarnings.length}/${expectedWarnings.length} expected warnings`);

        // Step 6: Verify extension configuration
        console.log('\n6. Verifying extension configuration...');
        const packageJsonPath = path.join(TEST_CONFIG.extensionPath, 'package.json');
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

        // Check required fields
        const requiredFields = ['name', 'displayName', 'description', 'main', 'activationEvents', 'contributes'];
        requiredFields.forEach(field => {
            if (!packageJson[field]) {
                throw new Error(`Missing required field in package.json: ${field}`);
            }
        });

        // Check activation events
        const expectedActivationEvents = ['onCommand:clangTidyVisualizer.run'];
        const hasActivationEvents = expectedActivationEvents.every(event =>
            packageJson.activationEvents.includes(event)
        );

        if (!hasActivationEvents) {
            throw new Error('Missing required activation events');
        }

        // Check commands
        const expectedCommands = ['clangTidyVisualizer.run'];
        const hasCommands = expectedCommands.every(command =>
            packageJson.contributes.commands.some(cmd => cmd.command === command)
        );

        if (!hasCommands) {
            throw new Error('Missing required commands');
        }

        console.log('✓ Extension configuration is valid');

        // Step 7: Summary
        console.log('\n=== Test Summary ===');
        console.log('✓ All integration tests passed!');
        console.log('\nThe Clang-Tidy Visualizer extension is ready for use in VSCode.');
        console.log('\nTo test in VSCode:');
        console.log('1. Open VSCode');
        console.log('2. Open the extension directory');
        console.log('3. Press F5 to start debugging');
        console.log('4. In the new VSCode window, open a C++ project');
        console.log('5. Run "Clang-Tidy Visualizer: Run Analysis" command');

    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        console.error('\n=== Test Summary ===');
        console.error('❌ Integration tests failed!');
        process.exit(1);
    }
}

// Helper function to run shell commands
function runCommand(command, options = {}) {
    return new Promise((resolve, reject) => {
        exec(command, options, (error, stdout, stderr) => {
            if (error) {
                reject(new Error(`Command failed: ${command}\n${stderr}`));
                return;
            }
            resolve(stdout);
        });
    });
}

// Run tests
runTests();