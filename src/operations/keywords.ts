import { Editor, Notice } from 'obsidian';
import { AIService } from '../services/ai-service';
import { ConfigService } from '../services/config-service';
import { AIPluginSettings } from '../types/config';
import { KeywordsRequest } from '../types/requests';
import { KeywordsResponse } from '../types/responses';

export class KeywordsOperation {
	private aiService: AIService;
	private configService: ConfigService;

	constructor(aiService: AIService, configService: ConfigService) {
		this.aiService = aiService;
		this.configService = configService;
	}

	async execute(editor: Editor, text: string, settings: AIPluginSettings): Promise<void> {
		if (!settings.keywords) {
			new Notice('Please configure the keywords settings in the plugin settings first');
			return;
		}

		if (!settings.apiUrl) {
			new Notice('Please configure the keywords settings in the plugin settings first');
			return;
		}

		try {
			const requestBody: KeywordsRequest = {
				payload: {
					text: text,
					maxKeywords: settings.keywords.maxKeywords || 10,
				},
				config: {
					provider: settings.keywords.provider,
					model: settings.keywords.model,
					temperature: settings.keywords.temperature || 0.3,
					stream: settings.keywords.stream
				}
			};

			const response = await this.aiService.extractKeywords(requestBody);
			const result: KeywordsResponse = await response.json();

			// Add keywords after the selected text
			const cursor = editor.getCursor('to');
			editor.setCursor(cursor);
			const keywordsList = result.keywords.map(keyword => `- ${keyword}`).join('\n');
			editor.replaceRange(`\n\n**Keywords:**\n${keywordsList}`, cursor);

			new Notice('Keywords extracted successfully');
		} catch (error) {
			console.error('Error extracting keywords:', error);
			new Notice('Please configure the keywords settings in the plugin settings first');
		}
	}
}
