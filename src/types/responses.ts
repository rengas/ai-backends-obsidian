export interface SummarizeResponse {
	summary: string;
	provider: string;
	model: string;
	usage: {
		input_tokens: number;
		output_tokens: number;
		total_tokens: number;
	};
	apiVersion: string;
}

export interface KeywordsResponse {
	keywords: string[];
	provider: string;
	usage: {
		input_tokens: number;
		output_tokens: number;
		total_tokens: number;
	};
	apiVersion: string;
}

export interface TranslateResponse {
	translation: string;
	provider: string;
	model: string;
	usage: {
		input_tokens: number;
		output_tokens: number;
		total_tokens: number;
	};
}

// Streaming response interface - supports multiple formats
export interface StreamChunk {
	content?: string;
	text?: string;
	delta?: string;
	chunk?: string;
	message?: string;
	done?: boolean;
	provider?: string;
	model?: string;
	usage?: {
		input_tokens: number;
		output_tokens: number;
		total_tokens: number;
	};
}


export interface RewriteResponse {
	// Response payloads can vary; support several common keys
	text?: string;
	result?: string;
	output?: string;
	content?: string;
	message?: string;
	provider?: string;
	model?: string;
}