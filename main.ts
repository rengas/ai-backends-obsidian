
import { App, Editor, MarkdownView, Notice, Plugin, PluginSettingTab, Setting, Menu, MenuItem, TFile } from 'obsidian';
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
	translate: AIOperationConfig & {
		defaultTargetLanguage: string;
	};
	// Generic rewrite config used by Actions like Improve writing, Make shorter, etc.
	rewrite?: AIOperationConfig;
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

interface TranslateRequest {
	payload: {
		text: string;
		targetLanguage: string;
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

interface TranslateResponse {
	translation: string;
	provider: string;
	model: string;
	usage: {
		input_tokens: number;
		output_tokens: number;
		total_tokens: number;
	};
}

interface RewriteRequest {
	payload: {
		text: string;
		instruction: string;
	};
	config: AIOperationConfig;
}

interface RewriteResponse {
	// Response payloads can vary; support several common keys
	text?: string;
	result?: string;
	output?: string;
	content?: string;
	message?: string;
	provider?: string;
	model?: string;
}

export default class AIPlugin extends Plugin {
	settings: AIPluginSettings;
	config: AIConfig | null = null;
	configWatcher: any = null; // Store reference to the file watcher

	async onload() {
		await this.loadSettings();

		// Delay config loading to ensure vault is ready
		this.app.workspace.onLayoutReady(() => {
			this.loadConfig();
			this.setupConfigWatcher();
		});

		// Add context menu for selected text with AI Backends submenu
		this.registerEvent(
			this.app.workspace.on('editor-menu', (menu: Menu, editor: Editor, view: MarkdownView) => {
				const selection = editor.getSelection();
				if (selection.length > 0) {


					menu.addItem((item: MenuItem) => {
						item
							.setTitle('AI Backends')
							.setIcon('wand')
							.setSection('selection');

						// Root submenu: Actions
						const actionsMenu: Menu = (item as any).setSubmenu();

						// Improve description
						actionsMenu.addItem((subItem: MenuItem) => {
							subItem
								.setTitle('Improve description')
								.setIcon('file-text')
								.onClick(async () => {
									await this.improveDescription(editor, selection);
								});
						});

						// Summarise writing
						actionsMenu.addItem((subItem: MenuItem) => {
							subItem
								.setTitle('Summarise writing')
								.setIcon('document-text')
								.onClick(async () => {
									await this.summarizeText(editor, selection);
								});
						});

						// Improve writing
						actionsMenu.addItem((subItem: MenuItem) => {
							subItem
								.setTitle('Improve writing')
								.setIcon('wand')
								.onClick(async () => {
									await this.improveWriting(editor, selection);
								});
						});

						// Fix spelling & grammar
						actionsMenu.addItem((subItem: MenuItem) => {
							subItem
								.setTitle('Fix spelling & grammar')
								.setIcon('check')
								.onClick(async () => {
									await this.fixSpellingGrammar(editor, selection);
								});
						});

						// Brainstorm
						actionsMenu.addItem((subItem: MenuItem) => {
							subItem
								.setTitle('Brainstorm')
								.setIcon('lightbulb')
								.onClick(async () => {
									await this.brainstorm(editor, selection);
								});
						});

						// Make shorter
						actionsMenu.addItem((subItem: MenuItem) => {
							subItem
								.setTitle('Make shorter')
								.setIcon('minus')
								.onClick(async () => {
									await this.makeShorter(editor, selection);
								});
						});

						// Change tone to ... (submenu)
						actionsMenu.addItem((toneItem: MenuItem) => {
							toneItem.setTitle('Change tone to ...').setIcon('mic');
							const toneMenu: Menu = (toneItem as any).setSubmenu();
							const tones = [
								'Friendly', 'Formal', 'Casual', 'Professional', 'Confident', 'Empathetic', 'Persuasive', 'Playful', 'Direct'
							];
							tones.forEach((tone) => {
								toneMenu.addItem((tItem: MenuItem) => {
									tItem.setTitle(tone).onClick(async () => {
										await this.changeTone(editor, selection, tone);
									});
								});
							});
						});

						// Translate to ... (submenu)
						actionsMenu.addItem((tItem: MenuItem) => {
							tItem.setTitle('Translate to ...').setIcon('languages');
							const langMenu: Menu = (tItem as any).setSubmenu();
							const languages: { label: string; code: string }[] = [
								{ label: 'English', code: 'en' },
								{ label: 'Spanish', code: 'es' },
								{ label: 'French', code: 'fr' },
								{ label: 'German', code: 'de' },
								{ label: 'Italian', code: 'it' },
								{ label: 'Portuguese', code: 'pt' },
								{ label: 'Chinese (Simplified)', code: 'zh' },
								{ label: 'Japanese', code: 'ja' },
								{ label: 'Korean', code: 'ko' },
								{ label: 'Hindi', code: 'hi' },
								{ label: 'Arabic', code: 'ar' },
								{ label: 'Dutch', code: 'nl' },
								{ label: 'Russian', code: 'ru' }
							];
							languages.forEach(({ label, code }) => {
								langMenu.addItem((lItem: MenuItem) => {
									lItem.setTitle(label).onClick(async () => {
										await this.translateText(editor, selection, code);
									});
								});
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

		this.addCommand({
			id: 'translate-selection',
			name: 'Translate selected text',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				const selection = editor.getSelection();
				if (selection.length > 0) {
					await this.translateText(editor, selection);
				} else {
					new Notice('Please select some text to translate');
				}
			}
		});

		// New: Command palette entries for Actions
		this.addCommand({
			id: 'improve-description-selection',
			name: 'Improve description of selected text',
			editorCallback: async (editor: Editor) => {
				const selection = editor.getSelection();
				if (selection.length > 0) {
					await this.improveDescription(editor, selection);
				} else {
					new Notice('Please select some text to improve');
				}
			}
		});

		this.addCommand({
			id: 'improve-writing-selection',
			name: 'Improve writing of selected text',
			editorCallback: async (editor: Editor) => {
				const selection = editor.getSelection();
				if (selection.length > 0) {
					await this.improveWriting(editor, selection);
				} else {
					new Notice('Please select some text to improve');
				}
			}
		});

		this.addCommand({
			id: 'fix-spelling-grammar-selection',
			name: 'Fix spelling & grammar of selection',
			editorCallback: async (editor: Editor) => {
				const selection = editor.getSelection();
				if (selection.length > 0) {
					await this.fixSpellingGrammar(editor, selection);
				} else {
					new Notice('Please select some text to correct');
				}
			}
		});

		this.addCommand({
			id: 'brainstorm-selection',
			name: 'Brainstorm ideas from selection',
			editorCallback: async (editor: Editor) => {
				const selection = editor.getSelection();
				if (selection.length > 0) {
					await this.brainstorm(editor, selection);
				} else {
					new Notice('Please select some text to brainstorm on');
				}
			}
		});

		this.addCommand({
			id: 'make-shorter-selection',
			name: 'Make selected text shorter',
			editorCallback: async (editor: Editor) => {
				const selection = editor.getSelection();
				if (selection.length > 0) {
					await this.makeShorter(editor, selection);
				} else {
					new Notice('Please select some text to shorten');
				}
			}
		});

		// Tone change shortcuts
		const tones = ['Friendly','Formal','Casual','Professional','Confident','Empathetic','Persuasive','Playful','Direct'];
		for (const tone of tones) {
			this.addCommand({
				id: `change-tone-${tone.toLowerCase()}-selection`,
				name: `Change tone to ${tone}`,
				editorCallback: async (editor: Editor) => {
					const selection = editor.getSelection();
					if (selection.length > 0) {
						await this.changeTone(editor, selection, tone);
					} else {
						new Notice('Please select some text to change tone');
					}
				}
			});
		}

		// Translate presets
		const languages: { label: string; code: string }[] = [
			{ label: 'English', code: 'en' },
			{ label: 'Spanish', code: 'es' },
			{ label: 'French', code: 'fr' },
			{ label: 'German', code: 'de' },
			{ label: 'Italian', code: 'it' },
			{ label: 'Portuguese', code: 'pt' },
			{ label: 'Chinese (Simplified)', code: 'zh' },
			{ label: 'Japanese', code: 'ja' },
			{ label: 'Korean', code: 'ko' },
			{ label: 'Hindi', code: 'hi' },
			{ label: 'Arabic', code: 'ar' },
			{ label: 'Dutch', code: 'nl' },
			{ label: 'Russian', code: 'ru' },
		];
		for (const { label, code } of languages) {
			this.addCommand({
				id: `translate-selection-to-${code}`,
				name: `Translate selection to ${label}`,
				editorCallback: async (editor: Editor) => {
					const selection = editor.getSelection();
					if (selection.length > 0) {
						await this.translateText(editor, selection, code);
					} else {
						new Notice('Please select some text to translate');
					}
				}
			});
		}

		// Add settings tab
		this.addSettingTab(new AIPluginSettingTab(this.app, this));
	}

	setupConfigWatcher() {
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

			new Notice('AI Backends Configuration loaded');
		} catch (error) {
			console.error('Error loading config:', error);
			new Notice('Error loading configuration file: ' + error.message);
		}
	}

	async handleStreamingResponse(
		response: Response, 
		editor: Editor, 
		headerText: string, 
		successMessage: string
	): Promise<void> {
		const reader = response.body!.getReader();
		const decoder = new TextDecoder();

		// Always append to the end of the document
		const lastLine = editor.lastLine();
		const lastLineContent = editor.getLine(lastLine);
		const endOfDocument = { line: lastLine, ch: lastLineContent.length };
		editor.setCursor(endOfDocument);

		// Insert header at the end of document
		editor.replaceRange(headerText, endOfDocument, endOfDocument);

		// Update cursor position after inserting the header
		const newLastLine = editor.lastLine();
		const newLastLineContent = editor.getLine(newLastLine);
		editor.setCursor({ line: newLastLine, ch: newLastLineContent.length });

		let buffer = '';
		let totalContent = '';

		try {
			while (true) {
				const { done, value } = await reader.read();
				if (done) {
					break;
				}

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
							new Notice(successMessage);
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

		new Notice(successMessage);
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

			// Always append to the end of the document
			const lastLine = editor.lastLine();
			const lastLineContent = editor.getLine(lastLine);
			const endOfDocument = { line: lastLine, ch: lastLineContent.length };
			editor.setCursor(endOfDocument);

			// Check content type to determine if it's a streaming response
			const contentType = response.headers.get('content-type') || '';
			const isStreaming = this.config.summarize.stream &&
				(contentType.includes('text/event-stream') || contentType.includes('application/x-ndjson') || response.body);

			if (isStreaming && response.body) {
				await this.handleStreamingResponse(
					response, 
					editor, 
					'\n\n**Summary:**\n\n', 
					'Text summarized successfully'
				);
			} else {
				// Handle non-streaming response
				const result: SummarizeResponse = await response.json();

				// Always append to the end of the document
				const lastLine = editor.lastLine();
				const lastLineContent = editor.getLine(lastLine);
				const endOfDocument = { line: lastLine, ch: lastLineContent.length };

				// Append summary at the end of the document
				editor.replaceRange(`\n\n**Summary:**\n\n ${result.summary}`, endOfDocument, endOfDocument);

				new Notice('Text summarized successfully');
			}
		} catch (error) {

			new Notice('Error summarizing text. Please check your API settings.');
		}
	}

	// Generic rewrite helper used by most actions
	async rewriteText(editor: Editor, text: string, instruction: string, headerLabel: string) {
		if (!this.config || !this.config.rewrite) {
			new Notice('Please configure the rewrite settings in the YAML file first');
			return;
		}

		if (!this.settings.apiUrl) {
			new Notice('Please set the API URL in settings');
			return;
		}

		try {
			const requestBody: RewriteRequest = {
				payload: {
					text,
					instruction
				},
				config: {
					provider: this.config.rewrite.provider,
					model: this.config.rewrite.model,
					temperature: this.config.rewrite.temperature,
					stream: this.config.rewrite.stream
				}
			};

			const response = await fetch(`${this.settings.apiUrl}/api/v1/rewrite`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Origin': 'app://obsidian.md',
					'Accept': this.config.rewrite.stream ? 'text/event-stream, application/x-ndjson, application/json' : 'application/json'
				},
				body: JSON.stringify(requestBody)
			});

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
			}

			const contentType = response.headers.get('content-type') || '';
			const isStreaming = this.config.rewrite.stream &&
				(contentType.includes('text/event-stream') || contentType.includes('application/x-ndjson') || response.body);

			if (isStreaming && response.body) {
				await this.handleStreamingResponse(
					response,
					editor,
					`\n\n**${headerLabel}:**\n\n`,
					'Action applied successfully'
				);
			} else {
				const result: RewriteResponse = await response.json();
				const output = result.text || result.result || result.output || result.content || result.message || '';

				const lastLine = editor.lastLine();
				const lastLineContent = editor.getLine(lastLine);
				const endOfDocument = { line: lastLine, ch: lastLineContent.length };
				editor.replaceRange(`\n\n**${headerLabel}:**\n\n${output}`, endOfDocument, endOfDocument);

				new Notice('Action applied successfully');
			}
		} catch (error) {
			console.error('Error applying rewrite:', error);
			new Notice('Error applying action. Please check your API settings.');
		}
	}

	async improveDescription(editor: Editor, text: string) {
		const instruction = 'Improve the following description for clarity, concision, and impact while keeping the facts and meaning. Return only the improved description.';
		await this.rewriteText(editor, text, instruction, 'Improved description');
	}

	async improveWriting(editor: Editor, text: string) {
		const instruction = 'Rewrite the text to improve clarity, grammar, and flow, preserving meaning and voice. Return only the rewritten text.';
		await this.rewriteText(editor, text, instruction, 'Improved writing');
	}

	async fixSpellingGrammar(editor: Editor, text: string) {
		const instruction = 'Fix spelling, grammar, and punctuation without changing meaning or tone. Return only the corrected text.';
		await this.rewriteText(editor, text, instruction, 'Fixed spelling & grammar');
	}

	async brainstorm(editor: Editor, text: string) {
		const instruction = 'Brainstorm 6-10 concise ideas based on the text. Use a bulleted list, each idea on its own line.';
		await this.rewriteText(editor, text, instruction, 'Brainstorm');
	}

	async makeShorter(editor: Editor, text: string) {
		const instruction = 'Rewrite the text to be significantly shorter (around 30-50% reduction) while preserving key points and tone. Return only the shortened version.';
		await this.rewriteText(editor, text, instruction, 'Shorter version');
	}

	async changeTone(editor: Editor, text: string, tone: string) {
		const instruction = `Rewrite the text in a ${tone.toLowerCase()} tone while preserving meaning and intent. Return only the rewritten text.`;
		await this.rewriteText(editor, text, instruction, `Changed tone (${tone})`);
	}

	async translateText(editor: Editor, text: string, customTargetLanguage?: string) {
		if (!this.config || !this.config.translate) {
			new Notice('Please configure the translate settings in the YAML file first');
			return;
		}

		if (!this.settings.apiUrl) {
			new Notice('Please set the API URL in settings');
			return;
		}

		// If no custom target language is provided, use default from config
		const targetLanguage = customTargetLanguage || this.config.translate.defaultTargetLanguage;

		if (!targetLanguage) {
			new Notice('Please specify a target language in the config file or provide one');
			return;
		}

		try {
			const requestBody: TranslateRequest = {
				payload: {
					text: text,
					targetLanguage: targetLanguage
				},
				config: {
					provider: this.config.translate.provider,
					model: this.config.translate.model,
					temperature: this.config.translate.temperature,
					stream: this.config.translate.stream
				}
			};

			const response = await fetch(`${this.settings.apiUrl}/api/v1/translate`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Origin': 'app://obsidian.md',
					'Accept': this.config.translate.stream ? 'text/event-stream, application/x-ndjson, application/json' : 'application/json'
				},
				body: JSON.stringify(requestBody)
			});

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
			}

			// Always append to the end of the document
			const lastLine = editor.lastLine();
			const lastLineContent = editor.getLine(lastLine);
			const endOfDocument = { line: lastLine, ch: lastLineContent.length };
			editor.setCursor(endOfDocument);

			// Check content type to determine if it's a streaming response
			const contentType = response.headers.get('content-type') || '';
			const isStreaming = this.config.translate.stream &&
				(contentType.includes('text/event-stream') || contentType.includes('application/x-ndjson') || response.body);

			if (isStreaming && response.body) {
				await this.handleStreamingResponse(
					response, 
					editor, 
					`\n\n**Translation (${targetLanguage}):**\n\n`, 
					'Text translated successfully'
				);
			} else {
				// Handle non-streaming response
				const result: TranslateResponse = await response.json();

				// Always append to the end of the document
				const lastLine = editor.lastLine();
				const lastLineContent = editor.getLine(lastLine);
				const endOfDocument = { line: lastLine, ch: lastLineContent.length };

				// Append translation at the end of the document
				editor.replaceRange(`\n\n**Translation (${targetLanguage}):**\n\n${result.translation}`, endOfDocument, endOfDocument);

				new Notice('Text translated successfully');
			}
		} catch (error) {
			console.error('Error translating text:', error);
			new Notice('Error translating text. Please check your API settings.');
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
		// Reload config and reset watcher when settings change
		await this.loadConfig();
		this.setupConfigWatcher();
	}

	onunload() {
		// Clean up the config watcher when plugin is unloaded
		if (this.configWatcher) {
			this.app.vault.offref(this.configWatcher);
			this.configWatcher = null;
		}
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
		containerEl.createEl('p', {text: 'Create a YAML file at the specified path with separate configurations for summarize, keywords, translate, and rewrite (generic actions):'});

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
  defaultTargetLanguage: "en"
  
 rewrite:
  provider: "openai"
  model: "gpt-4o-mini"
  temperature: 0.3
  stream: true
 `});

		containerEl.createEl('h4', {text: 'Configuration Options:'});
		const optionsList = containerEl.createEl('ul');
		optionsList.createEl('li', {text: 'provider: The AI provider (e.g., "ollama", "openai", "anthropic")'});
		optionsList.createEl('li', {text: 'model: The specific model to use'});
		optionsList.createEl('li', {text: 'temperature: Controls randomness (0.0 to 1.0)'});
		optionsList.createEl('li', {text: 'stream: Whether to use streaming responses'});
		optionsList.createEl('li', {text: 'maxLength: Maximum length for summaries'});
		optionsList.createEl('li', {text: 'maxKeywords: Maximum number of keywords to extract'});
		optionsList.createEl('li', {text: 'defaultTargetLanguage: Default target language for translations (e.g., "en", "es", "fr")'});
		optionsList.createEl('li', {text: 'rewrite: Generic config used by Actions such as Improve writing, Brainstorm, Make shorter, and tone changes'});
	}
}
