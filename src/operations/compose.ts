import { Editor, Notice } from 'obsidian';
import { AIPluginSettings } from '../types/config';
import {AIService} from "../services/ai-service";
import {StreamingService} from "../services/streaming-service";
import {ConfigService} from "../services/config-service";
import {ComposeRequest} from "../types/requests";
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
        settings: AIPluginSettings
    ): Promise<void> {
        if (!settings.compose) {
            new Notice('Please configure the compose settings in the plugin settings first');
            return;
        }

        if (!settings.apiUrl) {
            new Notice('Please configure the compose settings in the plugin settings first');
            return;
        }

        try {
            const requestBody: ComposeRequest = {
                payload: {
                    topic: topic,
                    maxLength: settings.compose?.maxLength || 200,
                },
                config: {
                    provider: settings.compose.provider,
                    model: settings.compose.model,
                    temperature: settings.compose.temperature,
                    stream: settings.compose.stream
                }
            };
            const response = await this.aiService.compose(requestBody);

            // Check content type to determine if it's a streaming response
            const contentType = response.headers.get('content-type') || '';
            const isStreaming = settings.compose.stream &&
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
            new Notice('Please configure the compose settings in the plugin settings first');

        }
    }
}
