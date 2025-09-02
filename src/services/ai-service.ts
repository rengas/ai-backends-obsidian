import { AIPluginSettings } from '../types/config';
import {SummarizeRequest, KeywordsRequest, TranslateRequest, RewriteRequest, ComposeRequest} from '../types/requests';
import { SummarizeResponse, KeywordsResponse, TranslateResponse } from '../types/responses';

export class AIService {
	private settings: AIPluginSettings;

	constructor(settings: AIPluginSettings) {
		this.settings = settings;
	}

	updateSettings(settings: AIPluginSettings): void {
		this.settings = settings;
	}

	async summarize(request: SummarizeRequest): Promise<Response> {
		return this.makeRequest('/api/v1/summarize', request, request.config.stream);
	}

	async extractKeywords(request: KeywordsRequest): Promise<Response> {
		return this.makeRequest('/api/v1/keywords', request, false);
	}

	async translate(request: TranslateRequest): Promise<Response> {
		return this.makeRequest('/api/v1/translate', request, request.config.stream);
	}

	async rewrite(request: RewriteRequest): Promise<Response> {
		return this.makeRequest('/api/v1/rewrite', request, request.config.stream);
	}

    async compose(request: ComposeRequest): Promise<Response> {
        return this.makeRequest('/api/v1/compose', request, request.config.stream);
    }

	private async makeRequest(endpoint: string, requestBody: any, isStreaming: boolean): Promise<Response> {
		const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : '/' + endpoint;

		const response = await fetch(`${this.settings.apiUrl}${normalizedEndpoint}`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Origin': 'app://obsidian.md',
				'Accept': isStreaming ? 'text/event-stream, application/x-ndjson, application/json' : 'application/json'
			},
			body: JSON.stringify(requestBody)
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
		}

		return response;
	}
}
