// tests/services/config-service.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as yaml from 'js-yaml';

// Mock Obsidian dependencies
vi.mock('obsidian', () => ({
    Notice: vi.fn(),
    TFile: vi.fn()
}));

// Mock js-yaml
vi.mock('js-yaml', () => ({
    load: vi.fn()
}));

// Import after mocks are set up
import { ConfigService } from '../config-service';
import { Notice, TFile } from 'obsidian';
import { AIConfig, AIPluginSettings } from '../../types/config';

describe('ConfigService', () => {
    let configService: ConfigService;
    let mockApp: any;
    let mockSettings: AIPluginSettings;
    let mockNotice: any;

    beforeEach(() => {
        // Mock app structure
        mockApp = {
            vault: {
                on: vi.fn(),
                offref: vi.fn(),
                getAbstractFileByPath: vi.fn(),
                read: vi.fn(),
                adapter: {
                    constructor: vi.fn()
                }
            }
        };

        mockSettings = {
            configFilePath: 'config/ai-config.yaml',
            apiUrl: 'http://localhost:3000',
            summarize: {
                provider: 'ollama',
                model: 'gemma3:4b',
                temperature: 0.3,
                stream: true,
                maxLength: 100
            },
            keywords: {
                provider: 'ollama',
                model: 'gemma3:4b',
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
        };

        // Mock Notice
        mockNotice = vi.fn();
        vi.mocked(Notice).mockImplementation(mockNotice);

        // Mock console methods
        vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.spyOn(console, 'error').mockImplementation(() => {});

        configService = new ConfigService(mockApp, mockSettings);
    });

    afterEach(() => {
        vi.clearAllMocks();
        vi.restoreAllMocks();
    });

    describe('constructor', () => {
        it('should initialize with app and settings and create config from settings', () => {
            expect(configService).toBeDefined();
            const config = configService.getConfig();
            expect(config).not.toBeNull();
            expect(config?.summarize).toEqual(mockSettings.summarize);
            expect(config?.keywords).toEqual(mockSettings.keywords);
            expect(config?.translate).toEqual(mockSettings.translate);
            expect(config?.rewrite).toEqual(mockSettings.rewrite);
            expect(config?.compose).toEqual(mockSettings.compose);
        });
    });

    describe('getConfig', () => {
        it('should return config initialized from settings', () => {
            const config = configService.getConfig();
            expect(config).not.toBeNull();
            expect(config?.summarize).toEqual(mockSettings.summarize);
            expect(config?.keywords).toEqual(mockSettings.keywords);
            expect(config?.translate).toEqual(mockSettings.translate);
            expect(config?.rewrite).toEqual(mockSettings.rewrite);
            expect(config?.compose).toEqual(mockSettings.compose);
        });
    });

    describe('updateSettings', () => {
        it('should update settings and config', () => {
            const newSettings: AIPluginSettings = {
                configFilePath: 'new/path.yaml',
                apiUrl: 'http://localhost:4000',
                summarize: {
                    provider: 'new-provider',
                    model: 'new-model',
                    temperature: 0.5,
                    stream: false,
                    maxLength: 200
                },
                keywords: {
                    provider: 'new-provider',
                    model: 'new-model',
                    temperature: 0.5,
                    stream: false,
                    maxKeywords: 100
                },
                translate: {
                    provider: 'new-provider',
                    model: 'new-model',
                    temperature: 0.5,
                    stream: false,
                    defaultTargetLanguage: 'fr'
                },
                rewrite: {
                    provider: 'new-provider',
                    model: 'new-model',
                    temperature: 0.5,
                    stream: false
                },
                compose: {
                    provider: 'new-provider',
                    model: 'new-model',
                    temperature: 0.5,
                    stream: false,
                    maxLength: 100
                }
            };

            configService.updateSettings(newSettings);

            // Check that config was updated with new settings
            const config = configService.getConfig();
            expect(config?.summarize).toEqual(newSettings.summarize);
            expect(config?.keywords).toEqual(newSettings.keywords);
            expect(config?.translate).toEqual(newSettings.translate);
            expect(config?.rewrite).toEqual(newSettings.rewrite);
            expect(config?.compose).toEqual(newSettings.compose);
        });
    });

    describe('setupConfigWatcher', () => {
        it('should skip config watcher setup (deprecated)', () => {
            configService.setupConfigWatcher();

            expect(mockApp.vault.on).not.toHaveBeenCalled();
            expect(console.log).toHaveBeenCalledWith('Config watcher setup skipped (using UI settings)');
        });

        it('should handle config watcher setup when config file path is not set', () => {
            mockSettings.configFilePath = '';
            configService = new ConfigService(mockApp, mockSettings);

            configService.setupConfigWatcher();

            expect(mockApp.vault.on).not.toHaveBeenCalled();
            expect(console.log).toHaveBeenCalledWith('Config watcher setup skipped (using UI settings)');
        });

        it('should handle config watcher setup with existing config file path', () => {
            const existingWatcher = { id: 'existing-watcher' };
            const newWatcher = { id: 'new-watcher' };

            // Set up first watcher
            mockApp.vault.on.mockReturnValueOnce(existingWatcher);
            configService.setupConfigWatcher();

            // Set up second watcher - should not set up any watcher
            mockApp.vault.on.mockReturnValueOnce(newWatcher);
            configService.setupConfigWatcher();

            expect(mockApp.vault.offref).not.toHaveBeenCalled();
            expect(mockApp.vault.on).not.toHaveBeenCalled();
        });
    });

    describe('loadConfig', () => {
        it('should skip YAML config loading (deprecated)', async () => {
            await configService.loadConfig();

            expect(mockApp.vault.getAbstractFileByPath).not.toHaveBeenCalled();
            expect(console.log).toHaveBeenCalledWith('YAML config loading skipped (using UI settings)');
        });

        it('should skip YAML config loading when no config file path is set', async () => {
            mockSettings.configFilePath = '';
            configService = new ConfigService(mockApp, mockSettings);

            await configService.loadConfig();

            expect(mockApp.vault.getAbstractFileByPath).not.toHaveBeenCalled();
            expect(console.log).toHaveBeenCalledWith('YAML config loading skipped (using UI settings)');
        });

        it('should skip YAML config loading when config file is not found', async () => {
            mockApp.vault.getAbstractFileByPath.mockReturnValue(null);

            await configService.loadConfig();

            expect(mockApp.vault.read).not.toHaveBeenCalled();
            expect(console.log).toHaveBeenCalledWith('YAML config loading skipped (using UI settings)');
        });

        it('should skip YAML config loading when config path is a directory', async () => {
            const mockDirectory = new mockApp.vault.adapter.constructor();
            mockApp.vault.getAbstractFileByPath.mockReturnValue(mockDirectory);

            await configService.loadConfig();

            expect(mockApp.vault.read).not.toHaveBeenCalled();
            expect(console.log).toHaveBeenCalledWith('YAML config loading skipped (using UI settings)');
        });

        it('should skip YAML config loading when file read errors occur', async () => {
            const mockFile = { path: mockSettings.configFilePath };
            const readError = new Error('Failed to read file');

            mockApp.vault.getAbstractFileByPath.mockReturnValue(mockFile);
            mockApp.vault.read.mockRejectedValue(readError);

            await configService.loadConfig();

            expect(yaml.load).not.toHaveBeenCalled();
            expect(console.log).toHaveBeenCalledWith('YAML config loading skipped (using UI settings)');
        });

        it('should skip YAML config loading when YAML parsing errors occur', async () => {
            const mockFile = { path: mockSettings.configFilePath };
            const mockConfigContent = 'invalid: yaml: content:';
            const parseError = new Error('YAML parsing failed');

            mockApp.vault.getAbstractFileByPath.mockReturnValue(mockFile);
            mockApp.vault.read.mockResolvedValue(mockConfigContent);
            vi.mocked(yaml.load).mockImplementation(() => {
                throw parseError;
            });

            await configService.loadConfig();

            expect(console.log).toHaveBeenCalledWith('YAML config loading skipped (using UI settings)');
        });
    });

    describe('cleanup', () => {

        it('should handle cleanup when no watcher exists', () => {
            configService.cleanup();

            expect(mockApp.vault.offref).not.toHaveBeenCalled();
        });

        it('should handle multiple cleanup calls', () => {
            configService.cleanup();
            configService.cleanup(); // Second cleanup should not throw

            expect(mockApp.vault.offref).not.toHaveBeenCalled();
        });
    });
});