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
	private configService: ConfigService;

	constructor(aiService: AIService, streamingService: StreamingService, configService: ConfigService) {
		this.aiService = aiService;
		this.streamingService = streamingService;
		this.configService = configService;
	}

	async execute(editor: Editor, text: string, settings: AIPluginSettings, customTargetLanguage?: string): Promise<void> {
		const config = this.configService.getConfig();

		if (!config || !config.translate) {
			new Notice('Please configure the translate settings in the YAML file first');
			return;
		}

		if (!settings.apiUrl) {
			new Notice('Please set the API URL in settings');
			return;
		}

		// If no custom target language is provided, use default from config
		const targetLanguage = customTargetLanguage || config.translate.defaultTargetLanguage;

		if (!targetLanguage) {
			new Notice('Please specify a target language in the config file or provide one');
			return;
		}

		try {
			const requestBody: TranslateRequest = {
				payload: {
					text: text,
					targetLanguage: targetLanguage
				},
				config: {
					provider: config.translate.provider,
					model: config.translate.model,
					temperature: config.translate.temperature,
					stream: config.translate.stream
				}
			};

			const response = await this.aiService.translate(requestBody);

			// Check content type to determine if it's a streaming response
			const contentType = response.headers.get('content-type') || '';
			const isStreaming = config.translate.stream &&
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
			new Notice('Error translating text. Please check your API settings.');
		}
	}
}
