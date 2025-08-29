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
	}

	getConfig(): AIConfig | null {
		return this.config;
	}

	updateSettings(settings: AIPluginSettings): void {
		this.settings = settings;
	}

	setupConfigWatcher(): void {
		// Clean up existing watcher
		if (this.configWatcher) {
			this.app.vault.offref(this.configWatcher);
		}

		if (!this.settings.configFilePath) {
			new Notice('AI Backends Configuration not set');
			return;
		}

		// Set up file watcher for config changes
		this.configWatcher = this.app.vault.on('modify', (file: TFile) => {
			if (file.path === this.settings.configFilePath) {
				this.loadConfig();
			}
		});

		console.log('Config watcher set up for:', this.settings.configFilePath);
	}

	async loadConfig(): Promise<void> {
		try {
			if (!this.settings.configFilePath) {
				console.log('No config file path set');
				return;
			}

			const configPath = this.settings.configFilePath;
			console.log('Looking for config at:', configPath);

			const configFile = this.app.vault.getAbstractFileByPath(configPath);
			console.log('Config file found:', !!configFile);

			if (!configFile) {
				console.error('Config file not found at path:', configPath);
				new Notice('Config file not found. Please check the file path in settings.');
				return;
			}

			if (configFile instanceof this.app.vault.adapter.constructor) {
				console.error('Config path is a directory, not a file');
				return;
			}

			const configContent = await this.app.vault.read(configFile as any);
			console.log('Config content loaded:', configContent);

			this.config = yaml.load(configContent) as AIConfig;
			console.log('Config parsed:', this.config);

			new Notice('AI Backends Configuration loaded');
		} catch (error) {
			console.error('Error loading config:', error);
			new Notice('Error loading configuration file: ' + error.message);
		}
	}

	cleanup(): void {
		// Clean up the config watcher
		if (this.configWatcher) {
			this.app.vault.offref(this.configWatcher);
			this.configWatcher = null;
		}
	}
}
