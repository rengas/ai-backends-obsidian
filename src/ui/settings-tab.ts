import { App, PluginSettingTab, Setting, DropdownComponent, TextComponent, ToggleComponent, ButtonComponent, SliderComponent } from 'obsidian';
import { AIPlugin } from '../main';
import { SUPPORTED_LANGUAGES } from '../types/languages';
import { TONES } from '../types/tones';
import { ExportPathModal } from './export-path-modal';
import { ImportFileModal } from './import-file-modal';

export class AIPluginSettingTab extends PluginSettingTab {
	plugin: AIPlugin;
	private activeTab: 'general' | 'operations' | 'advanced' = 'general';

	constructor(app: App, plugin: AIPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;
		containerEl.empty();

		// Header
		containerEl.createEl('h2', {text: 'AI Backends Settings'});

		// Tab Navigation
		const tabContainer = containerEl.createDiv('tab-container');
		tabContainer.style.display = 'flex';
		tabContainer.style.marginBottom = '20px';
		tabContainer.style.borderBottom = '1px solid var(--background-modifier-border)';

		this.createTab(tabContainer, 'General', 'general', () => this.displayGeneralSettings());
		this.createTab(tabContainer, 'Operations', 'operations', () => this.displayOperationsSettings());
		this.createTab(tabContainer, 'Advanced', 'advanced', () => this.displayAdvancedSettings());

		// Tab Content Container
		const contentContainer = containerEl.createDiv('tab-content');
		
		// Display active tab
		switch (this.activeTab) {
			case 'general':
				this.displayGeneralSettings();
				break;
			case 'operations':
				this.displayOperationsSettings();
				break;
			case 'advanced':
				this.displayAdvancedSettings();
				break;
		}
	}

	private createTab(container: HTMLElement, label: string, tabId: 'general' | 'operations' | 'advanced', onClick: () => void): void {
		const tab = container.createEl('button', { text: label });
		tab.style.padding = '10px 20px';
		tab.style.border = 'none';
		tab.style.background = this.activeTab === tabId ? 'var(--background-modifier-error-hover)' : 'transparent';
		tab.style.cursor = 'pointer';
		tab.style.borderBottom = this.activeTab === tabId ? '2px solid var(--text-accent)' : 'none';
		
		tab.addEventListener('click', () => {
			this.activeTab = tabId;
			this.display();
		});
	}

	private displayGeneralSettings(): void {
		const container = this.containerEl.querySelector('.tab-content') as HTMLElement;
		if (!container) return;
		
		container.empty();

		// API Configuration Section
		container.createEl('h3', {text: 'API Configuration'});
		
		new Setting(container)
			.setName('API URL')
			.setDesc('Enter the base URL for the AI API (e.g., http://localhost:3000)')
			.addText(text => text
				.setPlaceholder('http://localhost:3000')
				.setValue(this.plugin.settings.apiUrl)
				.onChange(async (value) => {
					this.plugin.settings.apiUrl = value;
					await this.plugin.saveSettings();
				}));

		new Setting(container)
			.setName('API Key')
			.setDesc('Enter your API key')
			.addText(text => text
				.setPlaceholder('Enter your API key')
				.setValue(this.plugin.settings.apiKey || '')
				.onChange(async (value) => {
					this.plugin.settings.apiKey = value;
					await this.plugin.saveSettings();
				}));

		// Global Defaults Section
		container.createEl('h3', {text: 'Global Defaults'});
		
		new Setting(container)
			.setName('Default Provider')
			.setDesc('Default AI provider for all operations')
			.addDropdown(dropdown => dropdown
				.addOption('ollama', 'Ollama')
				.addOption('openai', 'OpenAI')
				.addOption('anthropic', 'Anthropic')
				.setValue(this.plugin.settings.defaultProvider || 'ollama')
				.onChange(async (value) => {
					this.plugin.settings.defaultProvider = value;
					await this.plugin.saveSettings();
				}));

		new Setting(container)
			.setName('Default Model')
			.setDesc('Default AI model for all operations')
			.addText(text => text
				.setPlaceholder('gemma3:4b')
				.setValue(this.plugin.settings.defaultModel || '')
				.onChange(async (value) => {
					this.plugin.settings.defaultModel = value;
					await this.plugin.saveSettings();
				}));

		new Setting(container)
			.setName('Default Temperature')
			.setDesc('Default temperature (0.0 = conservative, 1.0 = creative)')
			.addSlider(slider => slider
				.setLimits(0, 1, 0.1)
				.setValue(this.plugin.settings.defaultTemperature || 0.3)
				.setDynamicTooltip()
				.onChange(async (value) => {
					this.plugin.settings.defaultTemperature = value;
					await this.plugin.saveSettings();
				}));

		new Setting(container)
			.setName('Default Streaming')
			.setDesc('Enable streaming responses by default')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.defaultStream || true)
				.onChange(async (value) => {
					this.plugin.settings.defaultStream = value;
					await this.plugin.saveSettings();
				}));
	}

	private displayOperationsSettings(): void {
		const container = this.containerEl.querySelector('.tab-content') as HTMLElement;
		if (!container) return;
		
		container.empty();

		// Summarize Operation
		this.createOperationAccordion(container, 'Summarize', this.plugin.settings.summarize, async (config) => {
			this.plugin.settings.summarize = config;
			await this.plugin.saveSettings();
		});

		// Keywords Operation
		this.createOperationAccordion(container, 'Keywords', this.plugin.settings.keywords, async (config) => {
			this.plugin.settings.keywords = config;
			await this.plugin.saveSettings();
		});

		// Translate Operation
		this.createOperationAccordion(container, 'Translate', this.plugin.settings.translate, async (config) => {
			this.plugin.settings.translate = config;
			await this.plugin.saveSettings();
		}, true);

		// Rewrite Operation
		this.createOperationAccordion(container, 'Rewrite', this.plugin.settings.rewrite, async (config) => {
			this.plugin.settings.rewrite = config;
			await this.plugin.saveSettings();
		});

		// Compose Operation
		this.createOperationAccordion(container, 'Compose', this.plugin.settings.compose, async (config) => {
			this.plugin.settings.compose = config;
			await this.plugin.saveSettings();
		});
	}

	private createOperationAccordion(
		container: HTMLElement,
		name: string,
		config: any,
		onSave: (config: any) => Promise<void>,
		includeLanguage: boolean = false
	): void {
		const accordion = container.createDiv('operation-accordion');
		accordion.style.marginBottom = '15px';
		accordion.style.border = '1px solid var(--background-modifier-border)';
		accordion.style.borderRadius = '5px';

		const header = accordion.createDiv('accordion-header');
		header.style.padding = '10px';
		header.style.background = 'var(--background-secondary)';
		header.style.cursor = 'pointer';
		header.style.display = 'flex';
		header.style.justifyContent = 'space-between';
		header.style.alignItems = 'center';

		const title = header.createEl('h4', { text: name });
		title.style.margin = '0';

		const toggle = header.createEl('span', { text: '▼' });
		toggle.style.transition = 'transform 0.2s';

		const content = accordion.createDiv('accordion-content');
		content.style.padding = '10px';
		content.style.display = 'none';

		header.addEventListener('click', () => {
			const isVisible = content.style.display !== 'none';
			content.style.display = isVisible ? 'none' : 'block';
			toggle.style.transform = isVisible ? 'rotate(0deg)' : 'rotate(180deg)';
		});

		// Provider
		new Setting(content)
			.setName('Provider')
			.setDesc('AI provider for this operation')
			.addDropdown(dropdown => dropdown
				.addOption('ollama', 'Ollama')
				.addOption('openai', 'OpenAI')
				.addOption('anthropic', 'Anthropic')
				.setValue(config.provider)
				.onChange(async (value) => {
					config.provider = value;
					await onSave(config);
				}));

		// Model
		new Setting(content)
			.setName('Model')
			.setDesc('AI model to use')
			.addText(text => text
				.setPlaceholder('Model name')
				.setValue(config.model)
				.onChange(async (value) => {
					config.model = value;
					await onSave(config);
				}));

		// Temperature
		new Setting(content)
			.setName('Temperature')
			.setDesc('Temperature (0.0 = conservative, 1.0 = creative)')
			.addSlider(slider => slider
				.setLimits(0, 1, 0.1)
				.setValue(config.temperature)
				.setDynamicTooltip()
				.onChange(async (value) => {
					config.temperature = value;
					await onSave(config);
				}));

		// Stream
		new Setting(content)
			.setName('Streaming')
			.setDesc('Enable streaming responses')
			.addToggle(toggle => toggle
				.setValue(config.stream)
				.onChange(async (value) => {
					config.stream = value;
					await onSave(config);
				}));

		// Operation-specific settings
		if (name === 'Summarize' || name === 'Compose') {
			new Setting(content)
				.setName('Max Length')
				.setDesc('Maximum length of the output')
				.addText(text => text
					.setPlaceholder('100')
					.setValue(config.maxLength.toString())
					.onChange(async (value) => {
						config.maxLength = parseInt(value) || 100;
						await onSave(config);
					}));
		}

		if (name === 'Keywords') {
			new Setting(content)
				.setName('Max Keywords')
				.setDesc('Maximum number of keywords to extract')
				.addText(text => text
					.setPlaceholder('10')
					.setValue(config.maxKeywords.toString())
					.onChange(async (value) => {
						config.maxKeywords = parseInt(value) || 10;
						await onSave(config);
					}));
		}

		if (includeLanguage) {
			new Setting(content)
				.setName('Default Target Language')
				.setDesc('Default language for translation')
				.addDropdown(dropdown => {
					SUPPORTED_LANGUAGES.forEach(lang => {
						dropdown.addOption(lang.code, lang.label);
					});
					dropdown.setValue(config.defaultTargetLanguage);
					dropdown.onChange(async (value) => {
						config.defaultTargetLanguage = value;
						await onSave(config);
					});
				});
		}
	}

	private displayAdvancedSettings(): void {
		const container = this.containerEl.querySelector('.tab-content') as HTMLElement;
		if (!container) return;
		
		container.empty();

		// Configuration Migration Section
		container.createEl('h3', {text: 'Configuration Migration'});
		
		new Setting(container)
			.setName('Import from YAML')
			.setDesc('Import configuration from existing YAML file')
			.addButton(button => button
				.setButtonText('Import')
				.setCta()
				.onClick(async () => {
					try {
						// Create a modal to let the user choose the file to import
						const modal = new ImportFileModal(this.app, 'yaml');
						modal.onImportComplete = (filePath: string | null, fileContent: string | null) => {
							if (filePath && fileContent) {
								// Process the migration asynchronously but don't wait for the callback
								this.plugin.configService.migrateFromYAMLContent(fileContent).then(async (migratedSettings) => {
									if (migratedSettings) {
										// Update settings with migrated values
										Object.assign(this.plugin.settings, migratedSettings);
										await this.plugin.saveSettings();
										this.display(); // Refresh the UI
										
										// Show success message
										const notice = document.createElement('div');
										notice.textContent = `Configuration imported from ${filePath}`;
										notice.style.padding = '10px';
										notice.style.background = 'var(--background-modifier-success)';
										notice.style.color = 'var(--text-normal)';
										notice.style.borderRadius = '5px';
										notice.style.marginTop = '10px';
										container.appendChild(notice);
										setTimeout(() => notice.remove(), 3000);
									}
								}).catch((error) => {
									console.error('Migration failed:', error);
									const notice = document.createElement('div');
									notice.textContent = `Migration failed: ${error.message}`;
									notice.style.padding = '10px';
									notice.style.background = 'var(--background-modifier-error)';
									notice.style.color = 'var(--text-normal)';
									notice.style.borderRadius = '5px';
									notice.style.marginTop = '10px';
									container.appendChild(notice);
									setTimeout(() => notice.remove(), 3000);
								});
							}
						};
						modal.open();
					} catch (error) {
						console.error('Import failed:', error);
						const notice = document.createElement('div');
						notice.textContent = `Import failed: ${error.message}`;
						notice.style.padding = '10px';
						notice.style.background = 'var(--background-modifier-error)';
						notice.style.color = 'var(--text-normal)';
						notice.style.borderRadius = '5px';
						notice.style.marginTop = '10px';
						container.appendChild(notice);
						setTimeout(() => notice.remove(), 3000);
					}
				}));

		new Setting(container)
			.setName('Export to YAML')
			.setDesc('Export current configuration to YAML format')
			.addButton(button => button
				.setButtonText('Export')
				.onClick(async () => {
					try {
						const yamlContent = await this.plugin.configService.exportToYAML();
						
						// Create a modal to let the user choose the file path
						const modal = new ExportPathModal(this.app, 'ai-config-export', 'yaml', yamlContent);
						modal.onExportComplete = (savedPath: string | null) => {
							if (savedPath) {
								// Show success message
								const notice = document.createElement('div');
								notice.textContent = `Configuration exported to ${savedPath}`;
								notice.style.padding = '10px';
								notice.style.background = 'var(--background-modifier-success)';
								notice.style.color = 'var(--text-normal)';
								notice.style.borderRadius = '5px';
								notice.style.marginTop = '10px';
								container.appendChild(notice);
								setTimeout(() => notice.remove(), 3000);
							}
						};
						modal.open();
					} catch (error) {
						console.error('Export failed:', error);
						const notice = document.createElement('div');
						notice.textContent = `Export failed: ${error.message}`;
						notice.style.padding = '10px';
						notice.style.background = 'var(--background-modifier-error)';
						notice.style.color = 'var(--text-normal)';
						notice.style.borderRadius = '5px';
						notice.style.marginTop = '10px';
						container.appendChild(notice);
						setTimeout(() => notice.remove(), 3000);
					}
				}));

		new Setting(container)
			.setName('Reset to Defaults')
			.setDesc('Reset all settings to default values')
			.addButton(button => button
				.setButtonText('Reset')
				.setWarning()
				.onClick(async () => {
					// Import default settings
					const { DEFAULT_SETTINGS } = await import('../types/config');
					this.plugin.settings = { ...DEFAULT_SETTINGS };
					await this.plugin.saveSettings();
					this.display(); // Refresh the UI
				}));

		// Diagnostics Section
		container.createEl('h3', {text: 'Diagnostics'});
		
		new Setting(container)
			.setName('Test API Connection')
			.setDesc('Test the current API configuration')
			.addButton(button => button
				.setButtonText('Test')
				.onClick(async () => {
					try {
						// Simple API test
						const response = await fetch(`${this.plugin.settings.apiUrl}/health`, {
							method: 'GET',
							headers: {
								'Content-Type': 'application/json',
								...(this.plugin.settings.apiKey && { 'Authorization': `Bearer ${this.plugin.settings.apiKey}` })
							}
						});
						
						if (response.ok) {
							const notice = document.createElement('div');
							notice.textContent = 'API connection successful!';
							notice.style.padding = '10px';
							notice.style.background = 'var(--background-modifier-success)';
							notice.style.color = 'var(--text-normal)';
							notice.style.borderRadius = '5px';
							notice.style.marginTop = '10px';
							container.appendChild(notice);
							setTimeout(() => notice.remove(), 3000);
						} else {
							throw new Error(`HTTP ${response.status}: ${response.statusText}`);
						}
					} catch (error) {
						console.error('API test failed:', error);
						const notice = document.createElement('div');
						notice.textContent = `API test failed: ${error.message}`;
						notice.style.padding = '10px';
						notice.style.background = 'var(--background-modifier-error)';
						notice.style.color = 'var(--text-normal)';
						notice.style.borderRadius = '5px';
						notice.style.marginTop = '10px';
						container.appendChild(notice);
						setTimeout(() => notice.remove(), 3000);
					}
				}));

		new Setting(container)
			.setName('View Current Configuration')
			.setDesc('Show the current configuration in JSON format')
			.addButton(button => button
				.setButtonText('View')
				.onClick(() => {
					const configJson = JSON.stringify(this.plugin.settings, null, 2);
					const modal = document.createElement('div');
					modal.style.position = 'fixed';
					modal.style.top = '50%';
					modal.style.left = '50%';
					modal.style.transform = 'translate(-50%, -50%)';
					modal.style.background = 'var(--background-primary)';
					modal.style.border = '1px solid var(--background-modifier-border)';
					modal.style.borderRadius = '5px';
					modal.style.padding = '20px';
					modal.style.maxWidth = '80%';
					modal.style.maxHeight = '80%';
					modal.style.overflow = 'auto';
					modal.style.zIndex = '1000';
					
					const pre = document.createElement('pre');
					pre.style.background = 'var(--background-secondary)';
					pre.style.padding = '10px';
					pre.style.borderRadius = '3px';
					pre.style.overflow = 'auto';
					pre.textContent = configJson;
					
					const closeButton = document.createElement('button');
					closeButton.textContent = 'Close';
					closeButton.style.marginTop = '10px';
					closeButton.onclick = () => modal.remove();
					
					modal.appendChild(pre);
					modal.appendChild(closeButton);
					document.body.appendChild(modal);
				}));
	}
}
