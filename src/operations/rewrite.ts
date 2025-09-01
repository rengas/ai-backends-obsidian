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
	private configService: ConfigService;

	constructor(aiService: AIService, streamingService: StreamingService, configService: ConfigService) {
		this.aiService = aiService;
		this.streamingService = streamingService;
		this.configService = configService;
	}

	async execute(editor: Editor, text: string, instruction: string, headerLabel: string, settings: AIPluginSettings): Promise<void> {
		const config = this.configService.getConfig();

		if (!config || !config.rewrite) {
			new Notice('Please configure the rewrite settings in the YAML file first');
			return;
		}

		if (!settings.apiUrl) {
			new Notice('Please set the API URL in settings');
			return;
		}
		try {
			const requestBody: RewriteRequest = {
				payload: {
					text,
					instruction,
				},
				config: {
					provider: config.rewrite.provider,
					model: config.rewrite.model,
					temperature: config.rewrite.temperature,
					stream: config.rewrite.stream
				}
			};

			const response = await this.aiService.rewrite(requestBody);

			const contentType = response.headers.get('content-type') || '';
			const isStreaming = config.rewrite.stream &&
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
			new Notice('Error applying action. Please check your API settings.');
		}
	}

	// Convenience methods for different rewrite operations
	async improveDescription(editor: Editor, text: string, settings: AIPluginSettings): Promise<void> {
		await this.execute(editor, text, 'improve_text', 'Improved description', settings);
	}

	async improveWriting(editor: Editor, text: string, settings: AIPluginSettings): Promise<void> {
		await this.execute(editor, text, 'improve_text', 'Improved writing', settings);
	}

	async fixSpellingGrammar(editor: Editor, text: string, settings: AIPluginSettings): Promise<void> {
		await this.execute(editor, text, 'fix_spelling_grammar', 'Fixed spelling & grammar', settings);
	}

	async brainstorm(editor: Editor, text: string, settings: AIPluginSettings): Promise<void> {
		await this.execute(editor, text, 'brainstorm_ideas', 'Brainstorm', settings);
	}

	async makeShorter(editor: Editor, text: string, settings: AIPluginSettings): Promise<void> {
		await this.execute(editor, text, 'shorten', 'Shorter version', settings);
	}

	async changeTone(editor: Editor, text: string, tone: string, settings: AIPluginSettings): Promise<void> {
		await this.execute(editor, text, 'rewrite_with_tone', tone, settings);
	}
}