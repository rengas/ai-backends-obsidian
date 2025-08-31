import { Menu, MenuItem, Editor, MarkdownView } from 'obsidian';
import { SummarizeOperation } from '../operations/summarize';
import { TranslateOperation } from '../operations/translate';
import { KeywordsOperation } from '../operations/keywords';
import { RewriteOperation } from '../operations/rewrite';
import { ComposeOperation } from '../operations/compose';
import { ComposePromptModal } from './compose-modal';
import { AIPluginSettings } from '../types/config';
import { Language, POPULAR_LANGUAGES } from '../types/languages';
import { TONES } from '../types/tones';

export class ContextMenuManager {
	private summarizeOperation: SummarizeOperation;
	private translateOperation: TranslateOperation;
	private keywordsOperation: KeywordsOperation;
	private rewriteOperation: RewriteOperation;
	private composeOperation: ComposeOperation;
	private settings: AIPluginSettings;
	private popularLanguages: Language[];
	private tones: string[] = TONES;
	private app: any;

	constructor(
		app: any,
		summarizeOperation: SummarizeOperation,
		translateOperation: TranslateOperation,
		keywordsOperation: KeywordsOperation,
		rewriteOperation: RewriteOperation,
		composeOperation: ComposeOperation,
		settings: AIPluginSettings
	) {
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

	setupContextMenu(menu: Menu, editor: Editor, view: MarkdownView): void {
		const selection = editor.getSelection();
		if (selection.length > 0) {
			menu.addItem((item: MenuItem) => {
				item
					.setTitle('AI Backends')
					.setIcon('brain-circuit')
					.setSection('selection');

				// Create the main submenu
				const subMenu: Menu = (item as any).setSubmenu();

				// Add compose option (NEW)
				subMenu.addItem((subItem: MenuItem) => {
					subItem
						.setTitle('Compose with AI')
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

				// Add separator
				subMenu.addSeparator();

				// Add summarize option
				subMenu.addItem((subItem: MenuItem) => {
					subItem
						.setTitle('Summarize')
						.setIcon('document-text')
						.onClick(async () => {
							await this.summarizeOperation.execute(editor, selection, this.settings);
						});
				});

				// Add keywords option
				subMenu.addItem((subItem: MenuItem) => {
					subItem
						.setTitle('Extract Keywords')
						.setIcon('tag')
						.onClick(async () => {
							await this.keywordsOperation.execute(editor, selection, this.settings);
						});
				});

				// Improve description
				subMenu.addItem((subItem: MenuItem) => {
					subItem
						.setTitle('Improve description')
						.setIcon('file-text')
						.onClick(async () => {
							await this.rewriteOperation.improveDescription(editor, selection, this.settings);
						});
				});

				// Improve writing
				subMenu.addItem((subItem: MenuItem) => {
					subItem
						.setTitle('Improve writing')
						.setIcon('wand')
						.onClick(async () => {
							await this.rewriteOperation.improveWriting(editor, selection,this.settings);
						});
				});

				// Fix spelling & grammar
				subMenu.addItem((subItem: MenuItem) => {
					subItem
						.setTitle('Fix spelling & grammar')
						.setIcon('check')
						.onClick(async () => {
							await this.rewriteOperation.fixSpellingGrammar(editor, selection, this.settings);
						});
				});

				// Brainstorm
				subMenu.addItem((subItem: MenuItem) => {
					subItem
						.setTitle('Brainstorm')
						.setIcon('lightbulb')
						.onClick(async () => {
							await this.rewriteOperation.brainstorm(editor, selection, this.settings);
						});
				});

				// Make shorter
				subMenu.addItem((subItem: MenuItem) => {
					subItem
						.setTitle('Make shorter')
						.setIcon('minus')
						.onClick(async () => {
							await this.rewriteOperation.makeShorter(editor, selection, this.settings);
						});
				});

				// Change tone to ... (submenu)
				subMenu.addItem((toneItem: MenuItem) => {
					toneItem.setTitle('Change tone to ...').setIcon('mic');
					const toneMenu: Menu = (toneItem as any).setSubmenu();
					const tones = [

					];
					this.tones.forEach((tone) => {
						toneMenu.addItem((tItem: MenuItem) => {
							tItem.setTitle(tone).onClick(async () => {
								await this.rewriteOperation.changeTone(editor, selection, tone, this.settings);
							});
						});
					});
				});



				// Add translate option with language submenu
				subMenu.addItem((translateItem: MenuItem) => {
					translateItem
						.setTitle('Translate')
						.setIcon('languages');

					// Create translation submenu
					const translateSubMenu: Menu = (translateItem as any).setSubmenu();

					// Add default translation option
					translateSubMenu.addItem((defaultItem: MenuItem) => {
						defaultItem
							.setTitle('Default Language')
							.setIcon('globe')
							.onClick(async () => {
								await this.translateOperation.execute(editor, selection, this.settings);
							});
					});

					// Add separator
					translateSubMenu.addSeparator();

					// Add popular language options
					this.popularLanguages.forEach(language => {
						translateSubMenu.addItem((langItem: MenuItem) => {
							langItem
								.setTitle(language.label)
								.onClick(async () => {
									await this.translateOperation.execute(editor, selection, this.settings, language.code);
								});
						});
					});
				});
			});
		}
	}

	// Optional: Method to update popular languages for context menu
	setPopularLanguages(languages: Language[]): void {
		this.popularLanguages.length = 0;
		this.popularLanguages.push(...languages);
	}
}
