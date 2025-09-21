import { App, Notice, TFile } from 'obsidian';
import * as yaml from 'js-yaml';
import { AIConfig, AIPluginSettings } from '../types/config';

export class ConfigService {
	private app: App;
	private settings: AIPluginSettings;
	private config: AIConfig | null = null;
	private configWatcher: any = null;

	constructor(app: App, settings: AIPluginSettings) {
		this.app = app;
		this.settings = settings;
		// Initialize config from settings
		this.initializeConfigFromSettings();
	}

	/**
	 * Initialize config from plugin settings instead of YAML file
	 */
	private initializeConfigFromSettings(): void {
		// Ensure all required settings are present
		if (!this.settings.summarize || !this.settings.keywords || !this.settings.translate ||
			!this.settings.rewrite || !this.settings.compose) {
			console.error('Missing required operation settings');
			return;
		}

		this.config = {
			summarize: this.settings.summarize,
			keywords: this.settings.keywords,
			translate: this.settings.translate,
			rewrite: this.settings.rewrite,
			compose: this.settings.compose
		};
		console.log('Config initialized from plugin settings:', this.config);
	}

	getConfig(): AIConfig | null {
		return this.config;
	}

	updateSettings(settings: AIPluginSettings): void {
		this.settings = settings;
		// Update config when settings change
		this.initializeConfigFromSettings();
	}

	/**
	 * Migration method to load config from YAML file and convert to settings
	 */
	async migrateFromYAML(): Promise<AIPluginSettings | null> {
		try {
			if (!this.settings.configFilePath) {
				console.log('No config file path set for migration');
				return null;
			}

			const configPath = this.settings.configFilePath;
			console.log('Attempting migration from:', configPath);

			const configFile = this.app.vault.getAbstractFileByPath(configPath);
			if (!configFile) {
				console.log('No existing config file found for migration');
				return null;
			}

			const configContent = await this.app.vault.read(configFile as any);
			const yamlConfig = yaml.load(configContent) as AIConfig;
			
			// Convert YAML config to settings format
			const migratedSettings: Partial<AIPluginSettings> = {
				summarize: yamlConfig.summarize,
				keywords: yamlConfig.keywords,
				translate: yamlConfig.translate,
				rewrite: yamlConfig.rewrite,
				compose: yamlConfig.compose
			};

			console.log('Migration successful:', migratedSettings);
			new Notice('Configuration migrated from YAML file successfully');
			return migratedSettings as AIPluginSettings;
		} catch (error) {
			console.error('Error during migration:', error);
			new Notice('Error migrating configuration: ' + error.message);
			return null;
		}
	}

	/**
	 * Migration method to load config from YAML content string and convert to settings
	 */
	async migrateFromYAMLContent(yamlContent: string): Promise<AIPluginSettings | null> {
		try {
			console.log('Attempting migration from YAML content');
			
			const yamlConfig = yaml.load(yamlContent) as AIConfig;
			
			// Convert YAML config to settings format
			const migratedSettings: Partial<AIPluginSettings> = {
				summarize: yamlConfig.summarize,
				keywords: yamlConfig.keywords,
				translate: yamlConfig.translate,
				rewrite: yamlConfig.rewrite,
				compose: yamlConfig.compose
			};

			console.log('Migration from content successful:', migratedSettings);
			return migratedSettings as AIPluginSettings;
		} catch (error) {
			console.error('Error during migration from content:', error);
			throw new Error('Error migrating configuration: ' + error.message);
		}
	}

	/**
	 * Export current settings to YAML format
	 */
	async exportToYAML(): Promise<string> {
		try {
			const config = this.getConfig();
			if (!config) {
				throw new Error('No configuration available');
			}

			const yamlContent = yaml.dump(config, {
				indent: 2,
				lineWidth: 120
			});

			console.log('Settings exported to YAML');
			return yamlContent;
		} catch (error) {
			console.error('Error exporting to YAML:', error);
			throw new Error('Failed to export configuration: ' + error.message);
		}
	}

	/**
	 * Setup config watcher (deprecated, kept for backward compatibility)
	 */
	setupConfigWatcher(): void {
		// Clean up existing watcher
		if (this.configWatcher) {
			this.app.vault.offref(this.configWatcher);
		}

		// Note: File watching is deprecated in favor of UI settings
		// This method is kept for backward compatibility during migration
		console.log('Config watcher setup skipped (using UI settings)');
	}

	/**
	 * Load config from YAML file (deprecated, kept for backward compatibility)
	 */
	async loadConfig(): Promise<void> {
		// Note: YAML loading is deprecated in favor of UI settings
		// This method is kept for backward compatibility during migration
		console.log('YAML config loading skipped (using UI settings)');
	}

	cleanup(): void {
		// Clean up the config watcher
		if (this.configWatcher) {
			this.app.vault.offref(this.configWatcher);
			this.configWatcher = null;
		}
	}
}
