import { Editor, Notice } from 'obsidian';
import { AIPluginSettings } from '../types/config';
import { ComposeSuggestionsModal } from '../ui/compose-modal';
import {AIService} from "../services/ai-service";
import {StreamingService} from "../services/streaming-service";
import {ConfigService} from "../services/config-service";
import {ComposeRequest, RewriteRequest} from "../types/requests";
import {TranslateResponse} from "../types/responses";
import {appendToEndOfDocument} from "../utils/editor-utils";

export class ComposeOperation {
    private aiService: AIService;
    private streamingService: StreamingService;
    private configService: ConfigService;

    constructor(aiService: AIService, streamingService: StreamingService, configService: ConfigService) {
        this.aiService = aiService;
        this.streamingService = streamingService;
        this.configService = configService;
    }


    async execute(
        editor: Editor,
        topic: string,
        settings: AIPluginSettings,
    ): Promise<void> {
        const config = this.configService.getConfig();

        if (!config || !config.compose) {
            new Notice('Please configure the compose settings in the YAML file first');
            return;
        }

        if (!settings.apiUrl) {
            new Notice('Please set the API URL in settings');
            return;
        }

        try {
            const requestBody: ComposeRequest = {
                payload: {
                    topic: topic,
                    maxLength:config.compose?.maxLength || 200,
                },
                config: {
                    provider: config.compose.provider,
                    model: config.compose.model,
                    temperature: config.compose.temperature,
                    stream: config.compose.stream
                }
            };
            const response = await this.aiService.compose(requestBody);

            // Check content type to determine if it's a streaming response
            const contentType = response.headers.get('content-type') || '';
            const isStreaming = config.translate.stream &&
                (contentType.includes('text/event-stream') || contentType.includes('application/x-ndjson') || response.body);

            if (isStreaming && response.body) {
                await this.streamingService.handleStreamingResponse(
                    response,
                    editor,
                    `\n\n**New Idea**\n\n`,
                    'Composed successfully'
                );
            } else {
                // Handle non-streaming response
                const result: TranslateResponse = await response.json();
                appendToEndOfDocument(editor, `\n\n**New Idea**\n\n`,);
                new Notice('Composed successfully');
            }
        } catch (error) {
            console.error('Compose operation error:', error);
            new Notice('Error applying action. Please check your API settings.');

        }
    }
}
