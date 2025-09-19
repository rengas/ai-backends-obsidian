import { Editor, Notice } from 'obsidian';
import { AIService } from '../services/ai-service';
import { StreamingService } from '../services/streaming-service';
import { ConfigService } from '../services/config-service';
import { AIPluginSettings } from '../types/config';
import { SummarizeRequest } from '../types/requests';
import { SummarizeResponse } from '../types/responses';
import { appendToEndOfDocument } from '../utils/editor-utils';

export class SummarizeOperation {
	private aiService: AIService;
	private streamingService: StreamingService;
	private configService: ConfigService;

	constructor(aiService: AIService, streamingService: StreamingService, configService: ConfigService) {
		this.aiService = aiService;
		this.streamingService = streamingService;
		this.configService = configService;
	}

	async execute(editor: Editor, text: string, settings: AIPluginSettings): Promise<void> {
		if (!settings.summarize) {
			new Notice('Please configure the summarize settings in the plugin settings first');
			return;
		}

		if (!settings.apiUrl) {
			new Notice('Please set the API URL in settings');
			return;
		}

		try {
			const requestBody: SummarizeRequest = {
				payload: {
					text: text,
					maxLength: settings.summarize.maxLength || 200
				},
				config: {
					provider: settings.summarize.provider,
					model: settings.summarize.model,
					temperature: settings.summarize.temperature,
					stream: settings.summarize.stream
				}
			};

			const response = await this.aiService.summarize(requestBody);

			// Check content type to determine if it's a streaming response
			const contentType = response.headers.get('content-type') || '';
			const isStreaming = settings.summarize.stream &&
				(contentType.includes('text/event-stream') || contentType.includes('application/x-ndjson') || response.body);

			if (isStreaming && response.body) {
				await this.streamingService.handleStreamingResponse(
					response,
					editor,
					'\n\n**Summary:**\n\n',
					'Text summarized successfully'
				);
			} else {
				// Handle non-streaming response
				const result: SummarizeResponse = await response.json();
				appendToEndOfDocument(editor, `\n\n**Summary:**\n\n ${result.summary}`);
				new Notice('Text summarized successfully');
			}
		} catch (error) {
			console.error('Error summarizing text:', error);
			new Notice('Error summarizing text. Please check your API settings.');
		}
	}
}
