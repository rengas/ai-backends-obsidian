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
		codeBlock.createEl('code', {text: `summarize:
  provider: "ollama"
  model: "llama2"
  temperature: 0.3
  stream: false
  maxLength: 200

keywords:
  provider: "openai"
  model: "gpt-3.5-turbo"
  temperature: 0.8
  stream: false
  maxKeywords: 10

translate:
  provider: "ollama"
  model: "gemma2:2b"
  temperature: 0.1
  stream: false
  defaultTargetLanguage: "en"`});

		containerEl.createEl('h4', {text: 'Configuration Options:'});
		const optionsList = containerEl.createEl('ul');
		optionsList.createEl('li', {text: 'provider: The AI provider (e.g., "ollama", "openai", "anthropic")'});
		optionsList.createEl('li', {text: 'model: The specific model to use'});
		optionsList.createEl('li', {text: 'temperature: Controls randomness (0.0 to 1.0)'});
		optionsList.createEl('li', {text: 'stream: Whether to use streaming responses'});
		optionsList.createEl('li', {text: 'maxLength: Maximum length for summaries'});
		optionsList.createEl('li', {text: 'maxKeywords: Maximum number of keywords to extract'});
		optionsList.createEl('li', {text: 'defaultTargetLanguage: Default target language for translations (e.g., "en", "es", "fr")'});
	}
}
