import { App, PluginSettingTab, Setting } from 'obsidian';
import { AIPlugin } from '../main';

export class AIPluginSettingTab extends PluginSettingTab {
	plugin: AIPlugin;

	constructor(app: App, plugin: AIPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h2', {text: 'AI Plugin Settings'});

		new Setting(containerEl)
			.setName('API URL')
			.setDesc('Enter the base URL for the AI API (e.g., http://localhost:3000)')
			.addText(text => text
				.setPlaceholder('http://localhost:3000')
				.setValue(this.plugin.settings.apiUrl)
				.onChange(async (value) => {
					this.plugin.settings.apiUrl = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('API Key')
			.setDesc('Enter your API key')
			.addText(text => text
				.setPlaceholder('Enter your API key')
				.setValue(this.plugin.settings.apiKey)
				.onChange(async (value) => {
					this.plugin.settings.apiKey = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Configuration File Path')
			.setDesc('Full path to the YAML configuration file (relative to vault root)')
			.addText(text => text
				.setPlaceholder('ai-config/config.yaml')
				.setValue(this.plugin.settings.configFilePath)
				.onChange(async (value) => {
					this.plugin.settings.configFilePath = value;
					await this.plugin.saveSettings();
				}));

		containerEl.createEl('h3', {text: 'Configuration File Format'});
		containerEl.createEl('p', {text: 'Create a YAML file at the specified path with separate configurations for summarize, keywords, and translate:'});

		const codeBlock = containerEl.createEl('pre');
		codeBlock.createEl('code', {text: `
AI Backends Configuration Example
How to use this file:
1. Create a copy of config.example.yaml file in the ai-backends directory (or anywhere in your vault).
2. Rename it to something like 'config.md' or 'config.yaml'.
3. In Obsidian, go to Community plugins -> Settings -> AI Backends and update the 'Config File Path'
to the path of your new file (e.g., 'ai-backends/config.yaml').
4. Customize the settings to your liking. You can use the default values as a starting point from config.example.yaml.`});

	}
}
