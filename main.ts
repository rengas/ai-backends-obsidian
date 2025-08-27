import { App, Editor, MarkdownView, Notice, Plugin, PluginSettingTab, Setting, Menu, MenuItem } from 'obsidian';
import * as yaml from 'js-yaml';

interface AIPluginSettings {
	apiUrl: string;
	configFilePath: string;
}

const DEFAULT_SETTINGS: AIPluginSettings = {
	apiUrl: 'http://localhost:3000',
	configFilePath: 'ai-config/config.yaml'
}

interface AIOperationConfig {
	provider: string;
	model: string;
	temperature: number;
	stream: boolean;
}

interface AIConfig {
	summarize: AIOperationConfig & {
		maxLength: number;
	};
	keywords: AIOperationConfig & {
		maxKeywords: number;
		temperature: number; // Override for keywords payload
	};
}

interface SummarizeRequest {
	payload: {
		text: string;
		maxLength: number;
	};
	config: AIOperationConfig;
}

interface KeywordsRequest {
	payload: {
		text: string;
		maxKeywords: number;
		temperature: number;
	};
	config: AIOperationConfig;
}

interface SummarizeResponse {
	summary: string;
	provider: string;
	model: string;
	usage: {
		input_tokens: number;
		output_tokens: number;
		total_tokens: number;
	};
}

interface KeywordsResponse {
	keywords: string[];
	provider: string;
	usage: {
		input_tokens: number;
		output_tokens: number;
		total_tokens: number;
	};
}

export default class AIPlugin extends Plugin {
	settings: AIPluginSettings;
	config: AIConfig | null = null;

	async onload() {
		await this.loadSettings();
		await this.loadConfig();

		// Add context menu for selected text with AI Backends submenu
		this.registerEvent(
			this.app.workspace.on('editor-menu', (menu: Menu, editor: Editor, view: MarkdownView) => {
				const selection = editor.getSelection();
				if (selection.length > 0) {


					menu.addItem((item: MenuItem) => {
						item
							.setTitle('AI Backends')
							.setIcon('brain-circuit')
							.setSection('selection');

						// Create the submenu
						const subMenu: Menu = (item as any).setSubmenu();
						// Add items to the submenu
						subMenu.addItem((subItem: MenuItem) => {
							subItem
								.setTitle('Summarize')
								.setIcon('document-text')
								.onClick(async () => {
									await this.summarizeText(editor, selection);
								});
						});

						subMenu.addItem((subItem: MenuItem) => {
							subItem
								.setTitle('Extract Keywords')
								.setIcon('tag')
								.onClick(async () => {
									await this.extractKeywords(editor, selection);
								});
						});
					});
				}
			})
		);

		// Add commands for summarize and keywords
		this.addCommand({
			id: 'summarize-selection',
			name: 'Summarize selected text',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				const selection = editor.getSelection();
				if (selection.length > 0) {
					await this.summarizeText(editor, selection);
				} else {
					new Notice('Please select some text to summarize');
				}
			}
		});

		this.addCommand({
			id: 'extract-keywords-selection',
			name: 'Extract keywords from selected text',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				const selection = editor.getSelection();
				if (selection.length > 0) {
					await this.extractKeywords(editor, selection);
				} else {
					new Notice('Please select some text to extract keywords from');
				}
			}
		});

		// Add settings tab
		this.addSettingTab(new AIPluginSettingTab(this.app, this));
	}

	async loadConfig() {
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

			new Notice('Configuration loaded successfully');
		} catch (error) {
			console.error('Error loading config:', error);
			new Notice('Error loading configuration file: ' + error.message);
		}
	}

	async summarizeText(editor: Editor, text: string) {
		if (!this.config || !this.config.summarize) {
			new Notice('Please configure the summarize settings in the YAML file first');
			return;
		}

		if (!this.settings.apiUrl) {
			new Notice('Please set the API URL in settings');
			return;
		}

		try {
			const requestBody: SummarizeRequest = {
				payload: {
					text: text,
					maxLength: this.config.summarize.maxLength || 200
				},
				config: {
					provider: this.config.summarize.provider,
					model: this.config.summarize.model,
					temperature: this.config.summarize.temperature,
					stream: this.config.summarize.stream
				}
			};

			const response = await fetch(`${this.settings.apiUrl}/api/v1/summarize`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Origin': 'app://obsidian.md',

				},
				body: JSON.stringify(requestBody)
			});

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const result: SummarizeResponse = await response.json();

			// Append summary after the selected text
			const cursor = editor.getCursor('to');
			editor.setCursor(cursor);
			editor.replaceSelection(`${text}\n\n**Summary:** ${result.summary}`);

			new Notice('Text summarized successfully');
		} catch (error) {
			console.error('Error summarizing text:', error);
			new Notice('Error summarizing text. Please check your API settings.');
		}
	}

	async extractKeywords(editor: Editor, text: string) {
		if (!this.config || !this.config.keywords) {
			new Notice('Please configure the keywords settings in the YAML file first');
			return;
		}

		if (!this.settings.apiUrl) {
			new Notice('Please set the API URL in settings');
			return;
		}

		try {
			const requestBody: KeywordsRequest = {
				payload: {
					text: text,
					maxKeywords: this.config.keywords.maxKeywords || 10,
					temperature: this.config.keywords.temperature || 1
				},
				config: {
					provider: this.config.keywords.provider,
					model: this.config.keywords.model,
					temperature: this.config.keywords.temperature,
					stream: this.config.keywords.stream
				}
			};

			const response = await fetch(`${this.settings.apiUrl}/api/v1/keywords`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Origin': 'app://obsidian.md',

				},
				body: JSON.stringify(requestBody)
			});

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const result: KeywordsResponse = await response.json();

			// Append keywords after the selected text
			const cursor = editor.getCursor('to');
			editor.setCursor(cursor);
			const keywordsList = result.keywords.map(keyword => `- ${keyword}`).join('\n');
			editor.replaceSelection(`${text}\n\n**Keywords:**\n${keywordsList}`);

			new Notice('Keywords extracted successfully');
		} catch (error) {
			console.error('Error extracting keywords:', error);
			new Notice('Error extracting keywords. Please check your API settings.');
		}
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
		await this.loadConfig(); // Reload config when settings change
	}

	onunload() {
		// Cleanup code here
	}

}

class AIPluginSettingTab extends PluginSettingTab {
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
		containerEl.createEl('p', {text: 'Create a YAML file at the specified path with separate configurations for summarize and keywords:'});

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
  maxKeywords: 10`});

		containerEl.createEl('h4', {text: 'Configuration Options:'});
		const optionsList = containerEl.createEl('ul');
		optionsList.createEl('li', {text: 'provider: The AI provider (e.g., "ollama", "openai", "anthropic")'});
		optionsList.createEl('li', {text: 'model: The specific model to use'});
		optionsList.createEl('li', {text: 'temperature: Controls randomness (0.0 to 1.0)'});
		optionsList.createEl('li', {text: 'stream: Whether to use streaming responses'});
		optionsList.createEl('li', {text: 'maxLength: Maximum length for summaries'});
		optionsList.createEl('li', {text: 'maxKeywords: Maximum number of keywords to extract'});
	}
}