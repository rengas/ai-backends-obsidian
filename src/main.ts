import { Editor, MarkdownView, Menu, Plugin } from 'obsidian';
import { AIPluginSettings, DEFAULT_SETTINGS } from './types/config';
import { ConfigService } from './services/config-service';
import { AIService } from './services/ai-service';
import { StreamingService } from './services/streaming-service';
import { UIStateService } from './services/ui-state-service';
import { SummarizeOperation } from './operations/summarize';
import { TranslateOperation } from './operations/translate';
import { KeywordsOperation } from './operations/keywords';
import { RewriteOperation } from './operations/rewrite';
import { ComposeOperation } from './operations/compose';
import { CommandsManager } from './ui/commands';
import { AIPluginSettingTab } from './ui/settings-tab';
import { ComposePromptModal } from './ui/compose-modal';
import { AIContextMenu } from './ui/ai-context-menu';
import { RibbonIconManager } from './ui/ribbon-icon';
import { FloatingIcon } from './ui/floating-icon';

export class AIPlugin extends Plugin {
	settings: AIPluginSettings;
	private configService: ConfigService;
	private aiService: AIService;
	private streamingService: StreamingService;
	private uiStateService: UIStateService;
	private summarizeOperation: SummarizeOperation;
	private translateOperation: TranslateOperation;
	private keywordsOperation: KeywordsOperation;
	private rewriterOperation: RewriteOperation;
	private composeOperation: ComposeOperation;
	private commandsManager: CommandsManager;
	private aiContextMenu: AIContextMenu;
	private ribbonIconManager: RibbonIconManager;
	private floatingIcon: FloatingIcon;

	async onload() {
		await this.loadSettings();
		await this.initializeServices();
		await this.registerCommands();
		this.addSettingTab(new AIPluginSettingTab(this.app, this));

		// Add ribbon icon
		this.addRibbonIcon(
			'brain-circuit',
			'AI Backends',
			(evt: MouseEvent) => {
				this.ribbonIconManager.handleRibbonIconClick(evt);
			}
		);

		// Delay config loading to ensure vault is ready
		this.app.workspace.onLayoutReady(() => {
			this.configService.loadConfig();
			this.configService.setupConfigWatcher();
		});

		// Initialize floating icon
		this.addChild(this.floatingIcon);

		await this.createExampleConfig();
	}

	private async initializeServices(): Promise<void> {
		// Initialize services
		this.configService = new ConfigService(this.app, this.settings);
		this.aiService = new AIService(this.settings);
		this.streamingService = new StreamingService();
		this.uiStateService = new UIStateService();

		// Initialize operations
		this.summarizeOperation = new SummarizeOperation(
			this.aiService, 
			this.streamingService, 
			this.configService
		);
		this.translateOperation = new TranslateOperation(
			this.aiService, 
			this.streamingService, 
			this.configService
		);
		this.keywordsOperation = new KeywordsOperation(
			this.aiService, 
			this.configService
		);
		this.rewriterOperation = new RewriteOperation(
			this.aiService,
			this.streamingService,
			this.configService
		);
		this.composeOperation = new ComposeOperation(
			this.aiService,
			this.streamingService,
            this.configService
		);

		this.commandsManager = new CommandsManager(
			this.summarizeOperation,
			this.translateOperation,
			this.keywordsOperation,
			this.rewriterOperation,
			this.settings
		);
		this.aiContextMenu = new AIContextMenu(
			this.app,
			this.summarizeOperation,
			this.translateOperation,
			this.keywordsOperation,
			this.rewriterOperation,
			this.composeOperation,
			this.settings,
            this.uiStateService,
		);
		this.ribbonIconManager = new RibbonIconManager(
			this.app,
			this.aiContextMenu,
			this.composeOperation,
			this.settings,
            this.uiStateService,
		);
		this.floatingIcon = new FloatingIcon(
			this.app,
			this.aiContextMenu,
			this.composeOperation,
			this.settings,
			this.uiStateService
		);
	}

	private async  registerCommands(): Promise<void> {
		const commands = this.commandsManager.getCommands();
		commands.forEach(command => {
			this.addCommand(command);
		});

		// Add compose command with keyboard shortcut
		this.addCommand({
			id: 'compose-with-ai',
			name: 'Compose with AI',
			editorCallback: (editor: Editor) => {
				const selection = editor.getSelection();
				new ComposePromptModal(
					this.app,
					editor,
					selection,
					this.settings,
					this.composeOperation,
					this.uiStateService
				).open();
			}
		});

		// Add AI Backends context menu command with keyboard shortcut
		this.addCommand({
			id: 'show-ai-context-menu',
			name: 'Show AI Backends Menu',
			hotkeys: [{ modifiers: ['Mod', 'Shift'], key: 'a' }],
			editorCallback: (editor: Editor) => {
				this.aiContextMenu.showContextMenu(editor);
			}
		});
	}

	async loadSettings(): Promise<void> {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);

		// Update services with new settings
		this.configService.updateSettings(this.settings);
		this.aiService.updateSettings(this.settings);
		this.commandsManager.updateSettings(this.settings);
		this.aiContextMenu.updateSettings(this.settings);
		this.ribbonIconManager.updateSettings(this.settings);
		this.floatingIcon.updateSettings(this.settings);

		// Reload config and reset watcher when settings change
		await this.configService.loadConfig();
		this.configService.setupConfigWatcher();
	}

	onunload(): void {
		this.configService.cleanup();
	}

	private async createExampleConfig(): Promise<void> {
		const configDir = 'ai-backends';
		const configFilePath = `${configDir}/config.example.md`;
		const vault = this.app.vault;

		try {
			// Check if the directory exists
			const dirExists = await vault.adapter.exists(configDir);
			if (!dirExists) {
				await vault.createFolder(configDir);
			}

			// Check if the file exists
			const fileExists = await vault.adapter.exists(configFilePath);
			if (!fileExists) {
				const defaultConfig = `
summarize:  
  provider: "ollama"  
  model: "gemma3:270m"  
  temperature: 0.3  
  stream: true  
  maxLength: 100  
keywords:  
  provider: "ollama"  
  model: "gemma3:270m"  
  temperature: 0.3  
  stream: false  
  maxKeywords: 500  
translate:    
  provider: "ollama"    
  model: "gemma3:270m"  
  temperature: 0.1    
  stream: true    
  defaultTargetLanguage: "ta"  
rewrite:    
  provider: "ollama"    
  model: "gemma3:270m"  
  stream: true  
compose:    
  provider: "ollama" 
  stream: true   
  model: "gemma3:270m"    
  maxLength: 50		maxLength: 50
`.trim();
				await vault.create(configFilePath, defaultConfig);
			}
		} catch (error) {
			console.error('Error creating example config file:', error);
		}
	}
}

export default AIPlugin;
