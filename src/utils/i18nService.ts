
// Internationalization Service
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Internationalization service for loading and managing localized strings
 */
export class I18nService {
  private static instance: I18nService;
  private translations: Map<string, string> = new Map();
  private currentLanguage: string;

  private constructor() {
    this.currentLanguage = this.getUserLanguage();
    this.loadTranslations();
  }

  /**
   * Get the singleton instance of the I18nService
   */
  public static getInstance(): I18nService {
    if (!I18nService.instance) {
      I18nService.instance = new I18nService();
    }
    return I18nService.instance;
  }

  /**
   * Get the user's preferred language from extension settings or VS Code display language
   */
  private getUserLanguage(): string {
    // First check extension setting
    const config = vscode.workspace.getConfiguration('clangTidyVisualizer');
    const extensionLanguage = config.get<string>('language', 'auto');
    
    // If user specified a language, use it
    if (extensionLanguage !== 'auto') {
      return extensionLanguage;
    }
    
    // Otherwise use VS Code's display language
    const vscodeLanguage = vscode.env.language;
    
    // For Chinese, we support simplified Chinese (zh-cn)
    if (vscodeLanguage.startsWith('zh')) {
      return 'zh-cn';
    }
    
    // Default to English
    return 'en';
  }

  /**
   * Load translations based on current language
   */
  private loadTranslations(): void {
    // Try different paths to find the translation files
    let extensionPath: string;
    
    // First try to get extension path from VS Code API
    const extension = vscode.extensions.getExtension('clang-tidy-visualizer');
    if (extension && extension.extensionPath) {
      extensionPath = extension.extensionPath;
    } else {
      // For development: try to find translations in the project root
      let currentDir = __dirname;
      while (true) {
        const nlsPath = path.join(currentDir, 'package.nls.json');
        if (fs.existsSync(nlsPath)) {
          extensionPath = currentDir;
          break;
        }
        const parentDir = path.dirname(currentDir);
        if (parentDir === currentDir) {
          // Reached root directory, use __dirname as fallback
          extensionPath = __dirname;
          break;
        }
        currentDir = parentDir;
      }
    }
    
    // Load default English translations first
    const defaultLangFile = path.join(extensionPath, 'package.nls.json');
    if (fs.existsSync(defaultLangFile)) {
      try {
        const defaultTranslations = JSON.parse(fs.readFileSync(defaultLangFile, 'utf-8'));
        Object.entries(defaultTranslations).forEach(([key, value]) => {
          if (typeof value === 'string') {
            this.translations.set(key, value);
          }
        });
      } catch (error) {
        console.error(`Failed to load default translations: ${error}`);
      }
    }
    
    // Load language-specific translations if they exist
    if (this.currentLanguage !== 'en') {
      const langFile = path.join(extensionPath, `package.nls.${this.currentLanguage}.json`);
      if (fs.existsSync(langFile)) {
        try {
          const langTranslations = JSON.parse(fs.readFileSync(langFile, 'utf-8'));
          Object.entries(langTranslations).forEach(([key, value]) => {
            if (typeof value === 'string') {
              this.translations.set(key, value);
            }
          });
        } catch (error) {
          console.error(`Failed to load ${this.currentLanguage} translations: ${error}`);
        }
      }
    }
  }

  /**
   * Get a localized string by key with parameter replacement
   * @param key The translation key
   * @param defaultValue The default value if key is not found
   * @param params Parameters to replace in the string (e.g., {0}, {1})
   */
  public t(key: string, defaultValue?: string, ...params: (string | number)[]): string {
    let translation = this.translations.get(key) || defaultValue || key;
    
    // Replace parameters in the format {0}, {1}, etc.
    params.forEach((param, index) => {
      const placeholder = `{${index}}`;
      // Use a simple while loop for global replacement to avoid regex issues
      while (translation.includes(placeholder)) {
        translation = translation.replace(placeholder, String(param));
      }
    });
    
    return translation;
  }

  /**
   * Get the current language code
   */
  public getCurrentLanguage(): string {
    return this.currentLanguage;
  }

  /**
   * Refresh translations when language changes
   */
  public refresh(): void {
    const newLanguage = this.getUserLanguage();
    if (newLanguage !== this.currentLanguage) {
      this.currentLanguage = newLanguage;
      this.translations.clear();
      this.loadTranslations();
    }
  }
}

// Export a singleton instance
export const i18n = I18nService.getInstance();
