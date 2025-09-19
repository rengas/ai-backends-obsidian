export interface AIPluginSettings {
	// Existing settings
	apiUrl: string;
	apiKey?: string;
	configFilePath: string; // Will be removed after migration
	
	// Global defaults
	defaultProvider?: string;
	defaultModel?: string;
	defaultTemperature?: number;
	defaultStream?: boolean;
	
	// Operation-specific settings
	summarize?: {
		provider: string;
		model: string;
		temperature: number;
		stream: boolean;
		maxLength: number;
	};
	
	keywords?: {
		provider: string;
		model: string;
		temperature: number;
		stream: boolean;
		maxKeywords: number;
	};
	
	translate?: {
		provider: string;
		model: string;
		temperature: number;
		stream: boolean;
		defaultTargetLanguage: string;
	};
	
	rewrite?: {
		provider: string;
		model: string;
		temperature: number;
		stream: boolean;
	};
	
	compose?: {
		provider: string;
		model: string;
		temperature: number;
		stream: boolean;
		maxLength: number;
	};
}

export const DEFAULT_SETTINGS: AIPluginSettings = {
	apiUrl: 'http://localhost:3000',
	apiKey: '',
	configFilePath: 'ai-config/config.yaml', // Will be removed after migration
	
	// Global defaults
	defaultProvider: 'ollama',
	defaultModel: 'gemma3:4b',
	defaultTemperature: 0.3,
	defaultStream: true,
	
	// Operation-specific defaults
	summarize: {
		provider: 'ollama',
		model: 'gemma3:4b',
		temperature: 0.3,
		stream: true,
		maxLength: 100
	},
	
	keywords: {
		provider: 'ollama',
		model: 'mistrallite:latest',
		temperature: 0.3,
		stream: false,
		maxKeywords: 500
	},
	
	translate: {
		provider: 'ollama',
		model: 'gemma3:4b',
		temperature: 0.1,
		stream: true,
		defaultTargetLanguage: 'en'
	},
	
	rewrite: {
		provider: 'ollama',
		model: 'gemma3:4b',
		temperature: 0.3,
		stream: true
	},
	
	compose: {
		provider: 'ollama',
		model: 'gemma3:4b',
		temperature: 0.3,
		stream: true,
		maxLength: 50
	}
}

export interface AIOperationConfig {
	provider: string;
	model: string;
	temperature: number;
	stream: boolean;
}

export interface AIConfig {
	summarize: AIOperationConfig & {
		maxLength: number;
	};
	keywords: AIOperationConfig & {
		maxKeywords: number;
		temperature: number; // Override for keywords payload
	};
	translate: AIOperationConfig & {
		defaultTargetLanguage: string;
	};
	rewrite?: AIOperationConfig;
    compose?: AIOperationConfig & {
        maxLength: number;
    };
}
