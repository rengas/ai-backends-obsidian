import { Editor, Notice } from 'obsidian';
import { AIService } from '../services/ai-service';
import { StreamingService } from '../services/streaming-service';
import { ConfigService } from '../services/config-service';
import { AIPluginSettings } from '../types/config';
import { RewriteRequest } from '../types/requests';
import { RewriteResponse } from '../types/responses';
import { appendToEndOfDocument } from '../utils/editor-utils';

export class RewriteOperation {
	private aiService: AIService;
	private streamingService: StreamingService;

	constructor(aiService: AIService, streamingService: StreamingService) {
		this.aiService = aiService;
		this.streamingService = streamingService;
	}

	async execute(editor: Editor, text: string, instruction: string,tone: string ,headerLabel: string, settings: AIPluginSettings): Promise<void> {
		if (!settings.rewrite) {
			new Notice('Please configure the rewrite settings in the plugin settings first');
			return;
		}

		if (!settings.apiUrl) {
			new Notice('Please configure the rewrite settings in the plugin settings first');
			return;
		}
		try {
			const requestBody: RewriteRequest = {
				payload: {
					text,
					instruction,
	                   ...(tone && tone.trim() !== '' && { tone })
				},
				config: {
					provider: settings.rewrite.provider,
					model: settings.rewrite.model,
					temperature: settings.rewrite.temperature,
					stream: settings.rewrite.stream
				}
			};

			const response = await this.aiService.rewrite(requestBody);

			const contentType = response.headers.get('content-type') || '';
			const isStreaming = settings.rewrite.stream &&
				(contentType.includes('text/event-stream') || contentType.includes('application/x-ndjson') || response.body);

			if (isStreaming && response.body) {
				await this.streamingService.handleStreamingResponse(
					response,
					editor,
					`\n\n**${headerLabel}:**\n\n`,
					'Action applied successfully'
				);
			} else {
				const result: RewriteResponse = await response.json();
				const output = result.text || result.result || result.output || result.content || result.message || '';

				appendToEndOfDocument(editor, `\n\n**${headerLabel}:**\n\n${output}`);
				new Notice('Action applied successfully');
			}
		} catch (error) {
			console.error('Error applying rewrite:', error);
			new Notice('Please configure the rewrite settings in the plugin settings first');
		}
	}

	// Convenience methods for different rewrite operations
	async improveDescription(editor: Editor, text: string, settings: AIPluginSettings): Promise<void> {
		await this.execute(editor, text, 'improve_text', '','Improved description', settings);
	}

	async improveWriting(editor: Editor, text: string, settings: AIPluginSettings): Promise<void> {
		await this.execute(editor, text, 'improve_text', '','Improved writing', settings);
	}

	async fixSpellingGrammar(editor: Editor, text: string, settings: AIPluginSettings): Promise<void> {
		await this.execute(editor, text, 'fix_spelling_grammar', '','Fixed spelling & grammar', settings);
	}

	async brainstorm(editor: Editor, text: string, settings: AIPluginSettings): Promise<void> {
		await this.execute(editor, text, 'brainstorm_ideas', '','Brainstorm', settings);
	}

	async makeShorter(editor: Editor, text: string, settings: AIPluginSettings): Promise<void> {
		await this.execute(editor, text, 'shorten', '','Shorter version', settings);
	}

	async changeTone(editor: Editor, text: string, tone: string, settings: AIPluginSettings): Promise<void> {
		await this.execute(editor, text, 'rewrite_with_tone', tone,'Changing tone', settings);
	}
}