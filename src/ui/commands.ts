import { Editor, MarkdownView, Notice } from 'obsidian';
import { SummarizeOperation } from '../operations/summarize';
import { TranslateOperation } from '../operations/translate';
import { KeywordsOperation } from '../operations/keywords';
import { RewriteOperation } from '../operations/rewrite';
import { AIPluginSettings } from '../types/config';
import { Language, SUPPORTED_LANGUAGES } from '../types/languages';
import { TONES } from '../types/tones';

export interface CommandDefinition {
	id: string;
	name: string;
	editorCallback: (editor: Editor, view: MarkdownView) => Promise<void>;
}

export class CommandsManager {
	private summarizeOperation: SummarizeOperation;
	private translateOperation: TranslateOperation;
	private keywordsOperation: KeywordsOperation;
	private rewriterOperation: RewriteOperation;
	private settings: AIPluginSettings;
	private languages: Language[];
	private tones: string[] = TONES;

	constructor(
		summarizeOperation: SummarizeOperation,
		translateOperation: TranslateOperation,
		keywordsOperation: KeywordsOperation,
		rewriterOperation: RewriteOperation,
		settings: AIPluginSettings
	) {
		this.summarizeOperation = summarizeOperation;
		this.translateOperation = translateOperation;
		this.keywordsOperation = keywordsOperation;
		this.rewriterOperation = rewriterOperation;
		this.settings = settings;
		this.languages = [...SUPPORTED_LANGUAGES]; // Create a copy
	}

	updateSettings(settings: AIPluginSettings): void {
		this.settings = settings;
	}

	getCommands(): CommandDefinition[] {
		const baseCommands: CommandDefinition[] = [
			{
				id: 'summarize-selection',
				name: 'Summarize selected text',
				editorCallback: async (editor: Editor, view: MarkdownView) => {
					const selection = editor.getSelection();
					if (selection.length > 0) {
						await this.summarizeOperation.execute(editor, selection, this.settings);
					} else {
						new Notice('Please select some text to summarize');
					}
				}
			},
			{
				id: 'extract-keywords-selection',
				name: 'Extract keywords from selected text',
				editorCallback: async (editor: Editor, view: MarkdownView) => {
					const selection = editor.getSelection();
					if (selection.length > 0) {
						await this.keywordsOperation.execute(editor, selection, this.settings);
					} else {
						new Notice('Please select some text to extract keywords from');
					}
				}
			},
			{
				id: 'translate-selection',
				name: 'Translate selected text (default language)',
				editorCallback: async (editor: Editor, view: MarkdownView) => {
					const selection = editor.getSelection();
					if (selection.length > 0) {
						await this.translateOperation.execute(editor, selection, this.settings);
					} else {
						new Notice('Please select some text to translate');
					}
				}
			},
			{
				id: 'improve-description-selection',
				name: 'Improve description of selected text',
				editorCallback: async (editor: Editor, view: MarkdownView) => {
					const selection = editor.getSelection();
					if (selection.length > 0) {
						await this.rewriterOperation.improveDescription(editor, selection, this.settings);
					} else {
						new Notice('Please select some text to improve');
					}
				}
			},
			{
				id: 'improve-writing-selection',
				name: 'Improve writing of selected text',
				editorCallback: async (editor: Editor, view: MarkdownView) => {
					const selection = editor.getSelection();
					if (selection.length > 0) {
						await this.rewriterOperation.improveWriting(editor, selection, this.settings);
					} else {
						new Notice('Please select some text to improve');
					}
				}
			},
			{
				id: 'fix-spelling-grammar-selection',
				name: 'Fix spelling & grammar of selection',
				editorCallback: async (editor: Editor, view: MarkdownView) => {
					const selection = editor.getSelection();
					if (selection.length > 0) {
						await this.rewriterOperation.fixSpellingGrammar(editor, selection, this.settings);
					} else {
						new Notice('Please select some text to correct');
					}
				}
			},
			{
				id: 'brainstorm-selection',
				name: 'Brainstorm ideas from selection',
				editorCallback: async (editor: Editor, view: MarkdownView) => {
					const selection = editor.getSelection();
					if (selection.length > 0) {
						await this.rewriterOperation.brainstorm(editor, selection, this.settings);
					} else {
						new Notice('Please select some text to brainstorm on');
					}
				}
			},
			{
				id: 'make-shorter-selection',
				name: 'Make selected text shorter',
				editorCallback: async (editor: Editor, view: MarkdownView) => {
					const selection = editor.getSelection();
					if (selection.length > 0) {
						await this.rewriterOperation.makeShorter(editor, selection, this.settings);
					} else {
						new Notice('Please select some text to shorten');
					}
				}
			}
		];

		// Generate translation commands for each language
		const translationCommands: CommandDefinition[] = this.languages.map(language => ({
			id: `translate-selection-to-${language.code}`,
			name: `Translate selection to ${language.label}`,
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				const selection = editor.getSelection();
				if (selection.length > 0) {
					await this.translateOperation.execute(editor, selection, this.settings, language.code);
				} else {
					new Notice('Please select some text to translate');
				}
			}
		}));

		// Generate tone commands for each tone
		const rewriteCommands: CommandDefinition[] = this.tones.map(tone => ({
			id: `change-tone-${tone.toLowerCase()}-selection`,
			name: `Change tone to ${tone}`,
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				const selection = editor.getSelection();
				if (selection.length > 0) {
					await this.rewriterOperation.changeTone(editor, selection, tone, this.settings);
				} else {
					new Notice('Please select some text to translate');
				}
			}
		}));

		return [...baseCommands, ...translationCommands,...rewriteCommands];
	}
}
