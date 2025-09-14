import { App, MarkdownView, Notice } from 'obsidian';
import { AIContextMenu } from './ai-context-menu';
import { ComposePromptModal } from './compose-modal';
import { ComposeOperation } from '../operations/compose';
import { AIPluginSettings } from '../types/config';
import { UIStateService } from '../services/ui-state-service';

export class RibbonIconManager {
    private app: App;
    private aiContextMenu: AIContextMenu;
    private composeOperation: ComposeOperation;
    private settings: AIPluginSettings;
    private uiStateService: UIStateService;

    constructor(
        app: App,
        aiContextMenu: AIContextMenu,
        composeOperation: ComposeOperation,
        settings: AIPluginSettings,
        uiStateService: UIStateService
    ) {
        this.app = app;
        this.aiContextMenu = aiContextMenu;
        this.composeOperation = composeOperation;
        this.settings = settings;
        this.uiStateService = uiStateService;
    }

    updateSettings(settings: AIPluginSettings): void {
        this.settings = settings;
    }

    handleRibbonIconClick(evt: MouseEvent): void {
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
        
        if (activeView) {
            const editor = activeView.editor;
            
            // Check if Shift key is pressed
            if (evt.shiftKey) {
                // If Shift+Click, open compose modal
                const selection = editor.getSelection();
                new ComposePromptModal(
                    this.app,
                    editor,
                    selection,
                    this.settings,
                    this.composeOperation,
                    this.uiStateService
                ).open();
            } else {
                // Regular click, show context menu
                this.aiContextMenu.showContextMenu(editor);
            }
        } else {
            // No active editor, just show a notice
            const notice = new Notice('Open a note to use AI Backends');
            setTimeout(() => notice.hide(), 3000);
        }
    }
}