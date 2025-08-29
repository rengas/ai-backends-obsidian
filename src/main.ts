import { Editor, MarkdownView, Menu, Plugin } from 'obsidian';
import { AIPluginSettings, DEFAULT_SETTINGS } from './types/config';
import { ConfigService } from './services/config-service';
import { AIService } from './services/ai-service';
import { StreamingService } from './services/streaming-service';
import { SummarizeOperation } from './operations/summarize';
import { TranslateOperation } from './operations/translate';
import { KeywordsOperation } from './operations/keywords';
import { RewriteOperation } from './operations/rewrite';
import { ContextMenuManager } from './ui/context-menu';
import { CommandsManager } from './ui/commands';
import { AIPluginSettingTab } from './ui/settings-tab';

export class AIPlugin extends Plugin {
	settings: AIPluginSettings;
	private configService: ConfigService;
	private aiService: AIService;
	private streamingService: StreamingService;
	private summarizeOperation: SummarizeOperation;
	private translateOperation: TranslateOperation;
	private keywordsOperation: KeywordsOperation;
	private rewriterOperation: RewriteOperation;
	private contextMenuManager: ContextMenuManager;
	private commandsManager: CommandsManager;

	async onload() {
		await this.loadSettings();
		this.initializeServices();
		this.setupEventHandlers();
		this.registerCommands();
		this.addSettingTab(new AIPluginSettingTab(this.app, this));

		// Delay config loading to ensure vault is ready
		this.app.workspace.onLayoutReady(() => {
			this.configService.loadConfig();
			this.configService.setupConfigWatcher();
		});
	}

	private initializeServices(): void {
		// Initialize services
		this.configService = new ConfigService(this.app, this.settings);
		this.aiService = new AIService(this.settings);
		this.streamingService = new StreamingService();

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

		// Initialize UI components
		this.contextMenuManager = new ContextMenuManager(
			this.summarizeOperation,
			this.translateOperation,
			this.keywordsOperation,
			this.rewriterOperation,
			this.settings
		);
		this.commandsManager = new CommandsManager(
			this.summarizeOperation,
			this.translateOperation,
			this.keywordsOperation,
			this.rewriterOperation,
			this.settings
		);
	}

	private setupEventHandlers(): void {
		// Add context menu for selected text with AI Backends submenu
		this.registerEvent(
			this.app.workspace.on('editor-menu', (menu: Menu, editor: Editor, view: MarkdownView) => {
				this.contextMenuManager.setupContextMenu(menu, editor, view);
			})
		);
	}

	private registerCommands(): void {
		const commands = this.commandsManager.getCommands();
		commands.forEach(command => {
			this.addCommand(command);
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
		this.contextMenuManager.updateSettings(this.settings);
		this.commandsManager.updateSettings(this.settings);

		// Reload config and reset watcher when settings change
		await this.configService.loadConfig();
		this.configService.setupConfigWatcher();
	}

	onunload(): void {
		this.configService.cleanup();
	}
}

export default AIPlugin;
