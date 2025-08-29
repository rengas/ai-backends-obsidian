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
					instruction
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
		const instruction = 'Improve the following description for clarity, concision, and impact while keeping the facts and meaning. Return only the improved description.';
		await this.execute(editor, text, instruction, 'Improved description', settings);
	}

	async improveWriting(editor: Editor, text: string, settings: AIPluginSettings): Promise<void> {
		const instruction = 'Rewrite the text to improve clarity, grammar, and flow, preserving meaning and voice. Return only the rewritten text.';
		await this.execute(editor, text, instruction, 'Improved writing', settings);
	}

	async fixSpellingGrammar(editor: Editor, text: string, settings: AIPluginSettings): Promise<void> {
		const instruction = 'Fix spelling, grammar, and punctuation without changing meaning or tone. Return only the corrected text.';
		await this.execute(editor, text, instruction, 'Fixed spelling & grammar', settings);
	}

	async brainstorm(editor: Editor, text: string, settings: AIPluginSettings): Promise<void> {
		const instruction = 'Brainstorm 6-10 concise ideas based on the text. Use a bulleted list, each idea on its own line.';
		await this.execute(editor, text, instruction, 'Brainstorm', settings);
	}

	async makeShorter(editor: Editor, text: string, settings: AIPluginSettings): Promise<void> {
		const instruction = 'Rewrite the text to be significantly shorter (around 30-50% reduction) while preserving key points and tone. Return only the shortened version.';
		await this.execute(editor, text, instruction, 'Shorter version', settings);
	}

	async changeTone(editor: Editor, text: string, tone: string, settings: AIPluginSettings): Promise<void> {
		const instruction = `Rewrite the text in a ${tone.toLowerCase()} tone while preserving meaning and intent. Return only the rewritten text.`;
		await this.execute(editor, text, instruction, `Changed tone (${tone})`, settings);
	}
}