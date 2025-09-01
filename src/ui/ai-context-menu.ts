import { App, Menu, Editor, Component } from 'obsidian';
import { SummarizeOperation } from '../operations/summarize';
import { TranslateOperation } from '../operations/translate';
import { KeywordsOperation } from '../operations/keywords';
import { RewriteOperation } from '../operations/rewrite';
import { ComposeOperation } from '../operations/compose';
import { ComposePromptModal } from './compose-modal';
import { AIPluginSettings } from '../types/config';
import { Language, POPULAR_LANGUAGES } from '../types/languages';
import { TONES } from '../types/tones';

export class AIContextMenu extends Component {
    private app: App;
    private summarizeOperation: SummarizeOperation;
    private translateOperation: TranslateOperation;
    private keywordsOperation: KeywordsOperation;
    private rewriteOperation: RewriteOperation;
    private composeOperation: ComposeOperation;
    private settings: AIPluginSettings;
    private popularLanguages: Language[];
    private tones: string[] = TONES;

    constructor(
        app: App,
        summarizeOperation: SummarizeOperation,
        translateOperation: TranslateOperation,
        keywordsOperation: KeywordsOperation,
        rewriteOperation: RewriteOperation,
        composeOperation: ComposeOperation,
        settings: AIPluginSettings
    ) {
        super();
        this.app = app;
        this.summarizeOperation = summarizeOperation;
        this.translateOperation = translateOperation;
        this.keywordsOperation = keywordsOperation;
        this.rewriteOperation = rewriteOperation;
        this.composeOperation = composeOperation;
        this.settings = settings;
        this.popularLanguages = [...POPULAR_LANGUAGES];
    }

    updateSettings(settings: AIPluginSettings): void {
        this.settings = settings;
    }

    showContextMenu(editor: Editor, evt?: MouseEvent): void {
        const selection = editor.getSelection();
        const menu = new Menu();

        // Set menu title
        menu.addItem((item) => {
            item.setTitle('AI Backends')
                .setIcon('brain-circuit')
                .setDisabled(true);
        });

        menu.addSeparator();

        // Add compose option (NEW) - always available
        menu.addItem((item) => {
            item.setTitle('Compose with AI')
                .setIcon('edit-3')
                .onClick(() => {
                    new ComposePromptModal(
                        this.app,
                        editor,
                        selection,
                        this.settings,
                        this.composeOperation
                    ).open();
                });
        });

        // Only show other options if text is selected
        if (selection.length > 0) {
            menu.addSeparator();

            // Add summarize option
            menu.addItem((item) => {
                item.setTitle('Summarize')
                    .setIcon('document-text')
                    .onClick(async () => {
                        await this.summarizeOperation.execute(editor, selection, this.settings);
                    });
            });

            // Add keywords option
            menu.addItem((item) => {
                item.setTitle('Extract Keywords')
                    .setIcon('tag')
                    .onClick(async () => {
                        await this.keywordsOperation.execute(editor, selection, this.settings);
                    });
            });

            menu.addSeparator();

            // Improve description
            menu.addItem((item) => {
                item.setTitle('Improve description')
                    .setIcon('file-text')
                    .onClick(async () => {
                        await this.rewriteOperation.improveDescription(editor, selection, this.settings);
                    });
            });

            // Improve writing
            menu.addItem((item) => {
                item.setTitle('Improve writing')
                    .setIcon('wand')
                    .onClick(async () => {
                        await this.rewriteOperation.improveWriting(editor, selection, this.settings);
                    });
            });

            // Fix spelling & grammar
            menu.addItem((item) => {
                item.setTitle('Fix spelling & grammar')
                    .setIcon('check')
                    .onClick(async () => {
                        await this.rewriteOperation.fixSpellingGrammar(editor, selection, this.settings);
                    });
            });

            // Brainstorm
            menu.addItem((item) => {
                item.setTitle('Brainstorm')
                    .setIcon('lightbulb')
                    .onClick(async () => {
                        await this.rewriteOperation.brainstorm(editor, selection, this.settings);
                    });
            });

            // Make shorter
            menu.addItem((item) => {
                item.setTitle('Make shorter')
                    .setIcon('minus')
                    .onClick(async () => {
                        await this.rewriteOperation.makeShorter(editor, selection, this.settings);
                    });
            });

            // Change tone to ... (submenu)
            menu.addItem((toneItem) => {
                toneItem.setTitle('Change tone to ...')
                    .setIcon('mic');

                const toneMenu = (toneItem as any).setSubmenu();
                this.tones.forEach((tone) => {
                    toneMenu.addItem((tItem: any) => {
                        tItem.setTitle(tone).onClick(async () => {
                            await this.rewriteOperation.changeTone(editor, selection, tone, this.settings);
                        });
                    });
                });
            });

            menu.addSeparator();

            // Add translate option with language submenu
            menu.addItem((translateItem) => {
                translateItem.setTitle('Translate')
                    .setIcon('languages');

                const translateSubMenu = (translateItem as any).setSubmenu();

                // Add default translation option
                translateSubMenu.addItem((defaultItem: any) => {
                    defaultItem.setTitle('Default Language')
                        .setIcon('globe')
                        .onClick(async () => {
                            await this.translateOperation.execute(editor, selection, this.settings);
                        });
                });

                translateSubMenu.addSeparator();

                // Add popular language options
                this.popularLanguages.forEach(language => {
                    translateSubMenu.addItem((langItem: any) => {
                        langItem.setTitle(language.label)
                            .onClick(async () => {
                                await this.translateOperation.execute(editor, selection, this.settings, language.code);
                            });
                    });
                });
            });
        } else {
            // Show message when no text is selected
            menu.addItem((item) => {
                item.setTitle('Select text for more AI options')
                    .setIcon('info')
                    .setDisabled(true);
            });
        }

        // Calculate menu position
        let x = 0;
        let y = 0;

        if (evt) {
            // Use mouse event position if available
            x = evt.clientX;
            y = evt.clientY;
        } else {
            // For keyboard shortcuts, show at a default position
            // We'll use the center of the current viewport
            const activeLeaf = this.app.workspace.activeLeaf;
            if (activeLeaf && activeLeaf.view.containerEl) {
                const rect = activeLeaf.view.containerEl.getBoundingClientRect();
                x = rect.left + rect.width / 2;
                y = rect.top + rect.height / 3; // Show in upper third of editor
            }
        }

        // Show the menu at calculated position
        menu.showAtPosition({ x, y });
    }

}
