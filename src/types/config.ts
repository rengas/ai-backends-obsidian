export interface AIPluginSettings {
	apiUrl: string;
	apiKey: string;
	configFilePath: string;
}

export const DEFAULT_SETTINGS: AIPluginSettings = {
	apiUrl: 'http://localhost:3000',
	apiKey: '',
	configFilePath: 'ai-config/config.yaml'
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
