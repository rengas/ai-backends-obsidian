import { AIOperationConfig } from './config';

export interface SummarizeRequest {
	payload: {
		text: string;
		maxLength: number;
	};
	config: AIOperationConfig;
}

export interface KeywordsRequest {
	payload: {
		text: string;
		maxKeywords: number;
	};
	config: AIOperationConfig;
}

export interface TranslateRequest {
	payload: {
		text: string;
		targetLanguage: string;
	};
	config: AIOperationConfig;
}

export interface RewriteRequest {
	payload: {
		text: string;
		instruction: string;
	};
	config: AIOperationConfig;
}
