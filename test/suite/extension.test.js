"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = __importStar(require("vscode"));
const assert = __importStar(require("assert"));
const ConfigManager_1 = require("../../src/core/config/ConfigManager");
const TextParser_1 = require("../../src/core/parser/TextParser");
const JsonParser_1 = require("../../src/core/parser/JsonParser");
// 测试套件
suite('Clang-Tidy Visualizer Extension Test Suite', () => {
    let extension;
    let configManager;
    let textParser;
    let jsonParser;
    // 在所有测试前执行
    suiteSetup(async () => {
        // 激活扩展
        extension = vscode.extensions.getExtension('LinJUn.clang-tidy-visualizer');
        if (extension) {
            await extension.activate();
        }
        // 初始化组件
        configManager = ConfigManager_1.ConfigManager.getInstance();
        textParser = new TextParser_1.TextParser();
        jsonParser = new JsonParser_1.JsonParser();
    });
    // 测试扩展是否存在
    test('Extension should be present', () => {
        assert.ok(extension);
    });
    // 测试扩展是否激活
    test('Extension should activate', () => {
        assert.strictEqual(extension?.isActive, true);
    });
    // 测试命令是否注册
    test('Clang-Tidy command should be registered', async () => {
        const commands = await vscode.commands.getCommands();
        assert.ok(commands.includes('clangTidyVisualizer.run'));
    });
    // 测试配置管理器是否正常工作
    test('ConfigManager should initialize with defaults', () => {
        assert.ok(configManager);
        assert.strictEqual(configManager.getClangTidyPath(), 'clang-tidy');
        assert.strictEqual(configManager.getChecks(), '*');
    });
    // 测试文本解析器是否能解析模拟的Clang-Tidy输出
    test('TextParser should parse clang-tidy output', () => {
        // 模拟的Clang-Tidy输出（包含Windows路径格式）
        const testOutput = `
D:\\test\\test.cpp:5:9: warning: use of a signed integer operand with a binary bitwise operator [bugprone-signed-char-bitwise]
        char c = 'a';
        ^~~~~
D:\\test\\test.cpp:10:12: error: expected ';' after expression [readability-braces-around-statements]
    return 0
           ^
           ;
`;
        const diagnostics = textParser.parseClangTidyText(testOutput);
        assert.strictEqual(diagnostics.length, 2);
        // 验证第一个诊断
        assert.strictEqual(diagnostics[0].filePath, 'D:\\test\\test.cpp');
        assert.strictEqual(diagnostics[0].line, 5);
        assert.strictEqual(diagnostics[0].column, 9);
        assert.strictEqual(diagnostics[0].severity, 'warning');
        assert.strictEqual(diagnostics[0].checkName, 'bugprone-signed-char-bitwise');
        // 验证第二个诊断
        assert.strictEqual(diagnostics[1].filePath, 'D:\\test\\test.cpp');
        assert.strictEqual(diagnostics[1].line, 10);
        assert.strictEqual(diagnostics[1].column, 12);
        assert.strictEqual(diagnostics[1].severity, 'error');
        assert.strictEqual(diagnostics[1].checkName, 'readability-braces-around-statements');
    });
    // 测试正则表达式是否能匹配Windows路径
    test('TextParser should handle Windows paths correctly', () => {
        const testLine = 'D:\\codespace\\test.cpp:13:8: warning: method \'doSomething\' can be made static [readability-convert-member-functions-to-static]';
        // 访问TextParser的私有方法（通过类型断言绕过访问限制）
        const textParserAny = textParser;
        const warningRegex = textParserAny.transformTextToDiagnostics.toString()
            .match(/const warningRegex = (\/.*?\/);/)?.[1];
        assert.ok(warningRegex);
        // 测试正则表达式是否匹配Windows路径
        const regex = new RegExp(warningRegex);
        const match = testLine.match(regex);
        assert.ok(match);
        assert.strictEqual(match?.[1], 'D:\\codespace\\test.cpp');
    });
    // 测试空输出处理
    test('TextParser should handle empty output', () => {
        const diagnostics = textParser.parseClangTidyText('');
        assert.strictEqual(diagnostics.length, 0);
    });
    // 测试无效输出处理
    test('TextParser should handle invalid output', () => {
        const diagnostics = textParser.parseClangTidyText('Invalid output that does not match the regex');
        assert.strictEqual(diagnostics.length, 0);
    });
});
//# sourceMappingURL=extension.test.js.map