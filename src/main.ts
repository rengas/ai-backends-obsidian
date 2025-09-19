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
	configService: ConfigService;
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

		// Initialize config from settings (no more YAML loading)
		this.app.workspace.onLayoutReady(() => {
			// Config is now automatically initialized from plugin settings
			console.log('AI Backends plugin initialized with UI-based settings');
		});

		// Initialize floating icon
		this.addChild(this.floatingIcon);

		// Example config creation removed - now using UI-based settings
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

		// Update config when settings change (no more YAML reloading)
		this.configService.updateSettings(this.settings);
	}

	onunload(): void {
		this.configService.cleanup();
	}

	// Example config creation removed - now using UI-based settings
}

export default AIPlugin;
