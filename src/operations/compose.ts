import { Editor, Notice } from 'obsidian';
import { AIPluginSettings } from '../types/config';
import { ComposeSuggestionsModal } from '../ui/compose-modal';

export interface ComposeResponse {
    suggestions: string[];
    success: boolean;
    error?: string;
}

export class ComposeOperation {
    private app: any;

    constructor(app: any) {
        this.app = app;
    }

    async execute(
        editor: Editor, 
        selectedText: string, 
        prompt: string, 
        settings: AIPluginSettings
    ): Promise<void> {
        const notice = new Notice('Generating suggestions...', 0);

        try {
            // Get cursor position for insertion
            const cursorPos = editor.getCursor();

            // Make API call
            const response = await this.callComposeAPI(selectedText, prompt, settings);

            notice.hide();

            if (response.success && response.suggestions.length > 0) {
                // Show suggestions modal
                new ComposeSuggestionsModal(
                    this.app,
                    editor,
                    selectedText,
                    response.suggestions,
                    cursorPos
                ).open();
            } else {
                new Notice(response.error || 'No suggestions were generated');
            }
        } catch (error) {
            notice.hide();
            console.error('Compose operation error:', error);
            new Notice('Failed to generate suggestions. Please check your connection and try again.');
        }
    }

    private async callComposeAPI(
        selectedText: string, 
        prompt: string, 
        settings: AIPluginSettings
    ): Promise<ComposeResponse> {
        try {
            // Load configuration
            const config = await this.loadConfig(settings.configFilePath);
            const composeConfig = config.compose || config.rewrite || {};

            const requestBody = {
                operation: 'compose',
                text: selectedText,
                prompt: prompt,
                config: {
                    provider: composeConfig.provider || 'openai',
                    model: composeConfig.model || 'gpt-4o-mini',
                    temperature: composeConfig.temperature || 0.7,
                    stream: false, // We need complete responses for suggestions
                    maxSuggestions: composeConfig.maxSuggestions || 3
                }
            };

            const response = await fetch(`${settings.apiUrl}/ai/compose`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                throw new Error(`API request failed: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();

            return {
                suggestions: data.suggestions || [],
                success: true
            };
        } catch (error) {
            console.error('API call failed:', error);
            return {
                suggestions: [],
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
    }

    private async loadConfig(configPath: string): Promise<any> {
        try {
            const configFile = this.app.vault.getAbstractFileByPath(configPath);
            if (!configFile) {
                console.warn(`Config file not found at ${configPath}, using defaults`);
                return {};
            }

            const configContent = await this.app.vault.read(configFile);

            // Parse YAML (simple implementation)
            // In a real implementation, you'd want to use a proper YAML parser
            const config: any = {};
            const lines = configContent.split('\n');
            let currentSection = '';

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || trimmed.startsWith('#')) continue;

                if (trimmed.endsWith(':') && !trimmed.includes(' ')) {
                    currentSection = trimmed.slice(0, -1);
                    config[currentSection] = {};
                } else if (trimmed.includes(':') && currentSection) {
                    const [key, ...valueParts] = trimmed.split(':');
                    const value = valueParts.join(':').trim();
                    // Remove quotes if present
                    const cleanValue = value.replace(/^["']|["']$/g, '');

                    // Try to parse as number or boolean
                    let parsedValue: any = cleanValue;
                    if (!isNaN(Number(cleanValue))) {
                        parsedValue = Number(cleanValue);
                    } else if (cleanValue === 'true' || cleanValue === 'false') {
                        parsedValue = cleanValue === 'true';
                    }

                    config[currentSection][key.trim()] = parsedValue;
                }
            }

            return config;
        } catch (error) {
            console.error('Failed to load config:', error);
            return {};
        }
    }
}
