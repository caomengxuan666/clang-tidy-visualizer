# Clang-Tidy Visualizer - Internationalization Support

## Overview
The Clang-Tidy Visualizer extension now supports internationalization (i18n), allowing the interface to automatically adapt to the user's preferred language in VS Code.

## Supported Languages

- **English** (default)
- **Simplified Chinese** (`zh-cn`)

## How It Works

The extension automatically detects VS Code's display language setting (`vscode.env.language`) and loads the appropriate translations.

1. **English**: Default language used when no other language is specified or when the specified language is not supported.
2. **Chinese**: Automatically used when VS Code's display language is set to any Chinese variant (`zh`, `zh-cn`, `zh-tw`, etc.).

## How to Change Language

To change the extension's language, follow these steps:

1. Open VS Code
2. Go to **File** → **Preferences** → **Settings** (or use shortcut `Ctrl+,`)
3. Search for "Display Language"
4. Select your preferred language from the dropdown menu
5. Restart VS Code to apply the changes

## Customization

### Adding New Languages

To add support for a new language:

1. Create a new translation file named `package.nls.<language-code>.json` in the extension root directory
2. Copy the structure from `package.nls.json` (English) and translate all values
3. Update the `i18nService.ts` file to support the new language code

### Modifying Existing Translations

Translation files are located in the extension root directory:

- `package.nls.json` - Default English translations
- `package.nls.zh-cn.json` - Simplified Chinese translations

To modify a translation:

1. Open the appropriate language file
2. Find the key for the string you want to modify
3. Update the value while preserving the key
4. Recompile the extension with `npm run compile`

## Translation Keys Structure

Translation keys follow a consistent naming convention:

- `extension.description` - Extension description
- `command.<command-name>` - Command titles
- `config.<setting-name>.description` - Configuration descriptions
- `report.<element-name>` - Report UI elements
- `status.<status-name>` - Status messages
- `error.<error-type>` - Error messages
- `info.<message-type>` - Information messages

## Technical Details

### Translation Loading Flow

1. The extension activates and initializes the `I18nService` singleton
2. The service detects the user's language from VS Code settings
3. Default English translations are loaded from `package.nls.json`
4. Language-specific translations are loaded from `package.nls.<language-code>.json` (if exists)
5. Translations are merged, with language-specific translations overriding defaults

### Using Translations in Code

The `I18nService` provides a simple API for accessing translations:

```typescript
import { i18n } from './utils/i18nService';

// Basic usage
const message = i18n.t('key.name');

// With default value (fallback if key not found)
const message = i18n.t('key.name', 'Default message');

// With parameters (replaces {0}, {1}, etc.)
const message = i18n.t('error.fileNotFound', 'File not found: {0}', fileName);
```

## Troubleshooting

### Translation Not Showing

If translations are not appearing correctly:

1. Ensure the translation key exists in both `package.nls.json` and the language-specific file
2. Verify that VS Code's display language is set correctly
3. Check the extension console for any loading errors
4. Recompile the extension with `npm run compile`

### Parameters Not Replaced

If parameters in translations are not being replaced:

1. Ensure the parameter format is correct (`{0}`, `{1}`, etc.)
2. Verify that the correct number of parameters are passed to `i18n.t()`
3. Check that the parameter indices match the placeholders in the translation string

## Contributing

Contributions to improve translations or add new languages are welcome!

1. Fork the repository
2. Create a new branch for your changes
3. Add or update translations
4. Test your changes
5. Submit a pull request
