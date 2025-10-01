import { Editor, Notice } from 'obsidian';
import { AIService } from '../services/ai-service';
import { StreamingService } from '../services/streaming-service';
import { ConfigService } from '../services/config-service';
import { AIPluginSettings } from '../types/config';
import { TranslateRequest } from '../types/requests';
import { TranslateResponse } from '../types/responses';
import { appendToEndOfDocument } from '../utils/editor-utils';

export class TranslateOperation {
	private aiService: AIService;
	private streamingService: StreamingService;

	constructor(aiService: AIService, streamingService: StreamingService) {
		this.aiService = aiService;
		this.streamingService = streamingService;
	}

	async execute(editor: Editor, text: string, settings: AIPluginSettings, customTargetLanguage?: string): Promise<void> {
		if (!settings.translate) {
			new Notice('Please configure the translate settings in the plugin settings first');
			return;
		}

		if (!settings.apiUrl) {
			new Notice('Please configure the translate settings in the plugin settings first');
			return;
		}

		// If no custom target language is provided, use default from settings
		const targetLanguage = customTargetLanguage || settings.translate.defaultTargetLanguage;

		if (!targetLanguage) {
			new Notice('Please configure the translate settings in the plugin settings first');
			return;
		}

		try {
			const requestBody: TranslateRequest = {
				payload: {
					text: text,
					targetLanguage: targetLanguage
				},
				config: {
					provider: settings.translate.provider,
					model: settings.translate.model,
					temperature: settings.translate.temperature,
					stream: settings.translate.stream
				}
			};

			const response = await this.aiService.translate(requestBody);

			// Check content type to determine if it's a streaming response
			const contentType = response.headers.get('content-type') || '';
			const isStreaming = settings.translate.stream &&
				(contentType.includes('text/event-stream') || contentType.includes('application/x-ndjson') || response.body);

			if (isStreaming && response.body) {
				await this.streamingService.handleStreamingResponse(
					response,
					editor,
					`\n\n**Translation (${targetLanguage}):**\n\n`,
					'Text translated successfully'
				);
			} else {
				// Handle non-streaming response
				const result: TranslateResponse = await response.json();
				appendToEndOfDocument(editor, `\n\n**Translation (${targetLanguage}):**\n\n${result.translation}`);
				new Notice('Text translated successfully');
			}
		} catch (error) {
			console.error('Error translating text:', error);
			new Notice('Please configure the translate settings in the plugin settings first');
		}
	}
}
