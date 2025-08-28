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
	apiVersion: string;
}

// Streaming response interface - supports multiple formats
interface StreamChunk {
	content?: string;
	text?: string;
	delta?: string;
	chunk?: string;
	message?: string;
	done?: boolean;
	provider?: string;
	model?: string;
	usage?: {
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
	apiVersion: string;
}

export default class AIPlugin extends Plugin {
	settings: AIPluginSettings;
	config: AIConfig | null = null;

	async onload() {
		await this.loadSettings();
		
		// Delay config loading to ensure vault is ready
		this.app.workspace.onLayoutReady(() => {
			this.loadConfig();
		});

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
					'Accept': this.config.summarize.stream ? 'text/event-stream, application/x-ndjson, application/json' : 'application/json'
				},
				body: JSON.stringify(requestBody)
			});

			if (!response.ok) {
				const errorText = await response.text();

				throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
			}

			// Get cursor at the end of selection
			const cursor = editor.getCursor('to');
			editor.setCursor(cursor);

			// Check content type to determine if it's a streaming response
			const contentType = response.headers.get('content-type') || '';
			const isStreaming = this.config.summarize.stream && 
				(contentType.includes('text/event-stream') || contentType.includes('application/x-ndjson') || response.body);


			if (isStreaming && response.body) {
				// Handle streaming response
				const reader = response.body.getReader();
				const decoder = new TextDecoder();
				
				// Insert summary header without duplicating the selected text
				editor.replaceRange('\n\n**Summary:** ', cursor, cursor);
				
				// Force editor to update before we start streaming
				editor.setCursor(cursor);
				
				let buffer = '';
				let chunkCount = 0;
				let totalContent = '';
				
				try {
					while (true) {
						const { done, value } = await reader.read();
						if (done) {

							break;
						}

						chunkCount++;
						// Decode chunk and add to buffer
						const chunk = decoder.decode(value, { stream: true });
						buffer += chunk;


						// Try different line endings
						const lines = buffer.split(/\r?\n/);
						buffer = lines.pop() || ''; // Keep incomplete line in buffer


						for (const line of lines) {
							if (line.trim() === '') continue;

							
							try {
								let jsonStr = line;
								
								// Handle SSE format
								if (line.startsWith('data: ')) {
									jsonStr = line.slice(6).trim();
								} else if (line.startsWith('event:') || line.startsWith('id:') || line.startsWith('retry:')) {
									// Skip other SSE fields
									continue;
								}
								
								// Skip SSE end marker
								if (jsonStr === '[DONE]' || jsonStr === 'data: [DONE]') {
									continue;
								}
								
								// Skip empty or non-JSON lines
								if (!jsonStr || (!jsonStr.startsWith('{') && !jsonStr.startsWith('['))) {
									continue;
								}
								
								const streamData: StreamChunk = JSON.parse(jsonStr);
								
								// Try different possible field names for content
								const content = streamData.content || streamData.text || streamData.delta || streamData.chunk || streamData.message;
								
								if (content) {

									totalContent += content;
									
									// Small delay to ensure UI updates
									await new Promise(resolve => setTimeout(resolve, 10));
									
									// Get current position and append content
									const lastLine = editor.lastLine();
									const lastLineContent = editor.getLine(lastLine);
									const appendPosition = { line: lastLine, ch: lastLineContent.length };

									
									// Append content directly
									editor.replaceRange(content, appendPosition, appendPosition);
									
									// Ensure visibility
									const newLastLine = editor.lastLine();
									editor.setCursor({ line: newLastLine, ch: editor.getLine(newLastLine).length });
									editor.scrollIntoView({ from: { line: newLastLine, ch: 0 }, to: { line: newLastLine, ch: 0 } }, true);
								}
								
								if (streamData.done) {
									new Notice('Text summarized successfully');
									return;
								}
							} catch (parseError) {
								// Skip malformed JSON chunks
							}
						}
					}
					
					// Process any remaining data in buffer
					if (buffer.trim()) {
						try {
							let jsonStr = buffer.trim();
							if (jsonStr.startsWith('data: ')) {
								jsonStr = jsonStr.slice(6).trim();
							}
							if (jsonStr !== '[DONE]' && jsonStr.startsWith('{')) {
								const streamData: StreamChunk = JSON.parse(jsonStr);
								const content = streamData.content || streamData.text || streamData.delta || streamData.chunk || streamData.message;
								if (content) {
									totalContent += content;
									const lastLine = editor.lastLine();
									const lastLineContent = editor.getLine(lastLine);
									const appendPosition = { line: lastLine, ch: lastLineContent.length };
									editor.replaceRange(content, appendPosition, appendPosition);
								}
							}
						} catch (e) {
							// Skip if final buffer can't be parsed
						}
					}
				} catch (streamError) {

					new Notice('Error during streaming: ' + streamError.message);
				} finally {
					reader.releaseLock();
				}
				
				new Notice('Text summarized successfully');
			} else {
				// Handle non-streaming response
				const result: SummarizeResponse = await response.json();
				
				// Append summary after the selected text without duplicating the original text
				editor.replaceRange(`\n\n**Summary:** ${result.summary}`, cursor, cursor);
				
				new Notice('Text summarized successfully');
			}
		} catch (error) {

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
				},
				config: {
					provider: this.config.keywords.provider,
					model: this.config.keywords.model,
					temperature: this.config.keywords.temperature || 0.3,
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

			// Add keywords after the selected text
			const cursor = editor.getCursor('to');
			editor.setCursor(cursor);
			const keywordsList = result.keywords.map(keyword => `- ${keyword}`).join('\n');
			editor.replaceRange(`\n\n**Keywords:**\n${keywordsList}`, cursor);

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