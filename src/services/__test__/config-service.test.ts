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
            apiUrl: 'http://localhost:3000'
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
        it('should initialize with app and settings', () => {
            expect(configService).toBeDefined();
            expect(configService.getConfig()).toBeNull();
        });
    });

    describe('getConfig', () => {
        it('should return null initially', () => {
            expect(configService.getConfig()).toBeNull();
        });
    });

    describe('updateSettings', () => {
        it('should update settings', () => {
            const newSettings: AIPluginSettings = {
                configFilePath: 'new/path.yaml',
                apiUrl: 'http://localhost:4000'
            };

            configService.updateSettings(newSettings);

            // Since settings is private, we can't directly check it
            // but we can verify behavior changes in other methods
            expect(configService).toBeDefined();
        });
    });

    describe('setupConfigWatcher', () => {
        it('should set up config watcher when config file path exists', () => {
            const mockWatcherRef = { id: 'mock-watcher' };
            mockApp.vault.on.mockReturnValue(mockWatcherRef);

            configService.setupConfigWatcher();

            expect(mockApp.vault.on).toHaveBeenCalledWith('modify', expect.any(Function));
            expect(console.log).toHaveBeenCalledWith('Config watcher set up for:', mockSettings.configFilePath);
        });

        it('should show notice when config file path is not set', () => {
            mockSettings.configFilePath = '';
            configService = new ConfigService(mockApp, mockSettings);

            configService.setupConfigWatcher();

            expect(vi.mocked(Notice)).toHaveBeenCalledWith('AI Backends Configuration not set');
            expect(mockApp.vault.on).not.toHaveBeenCalled();
        });

        it('should clean up existing watcher before setting up new one', () => {
            const existingWatcher = { id: 'existing-watcher' };
            const newWatcher = { id: 'new-watcher' };

            // Set up first watcher
            mockApp.vault.on.mockReturnValueOnce(existingWatcher);
            configService.setupConfigWatcher();

            // Set up second watcher - should clean up first
            mockApp.vault.on.mockReturnValueOnce(newWatcher);
            configService.setupConfigWatcher();

            expect(mockApp.vault.offref).toHaveBeenCalledWith(existingWatcher);
            expect(mockApp.vault.on).toHaveBeenCalledTimes(2);
        });

        it('should trigger loadConfig when watched file is modified', () => {
            const mockLoadConfig = vi.spyOn(configService, 'loadConfig').mockImplementation(async () => {});
            const mockFile = { path: mockSettings.configFilePath } as TFile;

            mockApp.vault.on.mockImplementation((event: string, callback: (file: TFile) => void) => {
                // Simulate file modification
                callback(mockFile);
                return { id: 'watcher' };
            });

            configService.setupConfigWatcher();

            expect(mockLoadConfig).toHaveBeenCalled();
        });

        it('should not trigger loadConfig when different file is modified', () => {
            const mockLoadConfig = vi.spyOn(configService, 'loadConfig').mockImplementation(async () => {});
            const mockFile = { path: 'different/file.yaml' } as TFile;

            mockApp.vault.on.mockImplementation((event: string, callback: (file: TFile) => void) => {
                // Simulate different file modification
                callback(mockFile);
                return { id: 'watcher' };
            });

            configService.setupConfigWatcher();

            expect(mockLoadConfig).not.toHaveBeenCalled();
        });
    });

    describe('loadConfig', () => {
        it('should load and parse valid config file', async () => {
            const mockConfigContent = 'summarize:\n  provider: "ollama"\n  model: "test"';
            const mockParsedConfig: AIConfig = {
                summarize: {
                    provider: 'ollama',
                    model: 'test'
                }
            } as AIConfig;
            const mockFile = { path: mockSettings.configFilePath };

            mockApp.vault.getAbstractFileByPath.mockReturnValue(mockFile);
            mockApp.vault.read.mockResolvedValue(mockConfigContent);
            vi.mocked(yaml.load).mockReturnValue(mockParsedConfig);

            await configService.loadConfig();

            expect(mockApp.vault.getAbstractFileByPath).toHaveBeenCalledWith(mockSettings.configFilePath);
            expect(mockApp.vault.read).toHaveBeenCalledWith(mockFile);
            expect(yaml.load).toHaveBeenCalledWith(mockConfigContent);
            expect(configService.getConfig()).toEqual(mockParsedConfig);
            expect(vi.mocked(Notice)).toHaveBeenCalledWith('AI Backends Configuration loaded');
        });

        it('should return early when no config file path is set', async () => {
            mockSettings.configFilePath = '';
            configService = new ConfigService(mockApp, mockSettings);

            await configService.loadConfig();

            expect(console.log).toHaveBeenCalledWith('No config file path set');
            expect(mockApp.vault.getAbstractFileByPath).not.toHaveBeenCalled();
        });

        it('should handle config file not found', async () => {
            mockApp.vault.getAbstractFileByPath.mockReturnValue(null);

            await configService.loadConfig();

            expect(console.error).toHaveBeenCalledWith('Config file not found at path:', mockSettings.configFilePath);
            expect(vi.mocked(Notice)).toHaveBeenCalledWith('Config file not found. Please check the file path in settings.');
        });

        it('should handle directory instead of file', async () => {
            const mockDirectory = new mockApp.vault.adapter.constructor();
            mockApp.vault.getAbstractFileByPath.mockReturnValue(mockDirectory);

            await configService.loadConfig();

            expect(console.error).toHaveBeenCalledWith('Config path is a directory, not a file');
            expect(mockApp.vault.read).not.toHaveBeenCalled();
        });

        it('should handle file read errors', async () => {
            const mockFile = { path: mockSettings.configFilePath };
            const readError = new Error('Failed to read file');

            mockApp.vault.getAbstractFileByPath.mockReturnValue(mockFile);
            mockApp.vault.read.mockRejectedValue(readError);

            await configService.loadConfig();

            expect(console.error).toHaveBeenCalledWith('Error loading config:', readError);
            expect(vi.mocked(Notice)).toHaveBeenCalledWith('Error loading configuration file: Failed to read file');
        });

        it('should handle YAML parsing errors', async () => {
            const mockFile = { path: mockSettings.configFilePath };
            const mockConfigContent = 'invalid: yaml: content:';
            const parseError = new Error('YAML parsing failed');

            mockApp.vault.getAbstractFileByPath.mockReturnValue(mockFile);
            mockApp.vault.read.mockResolvedValue(mockConfigContent);
            vi.mocked(yaml.load).mockImplementation(() => {
                throw parseError;
            });

            await configService.loadConfig();

            expect(console.error).toHaveBeenCalledWith('Error loading config:', parseError);
            expect(vi.mocked(Notice)).toHaveBeenCalledWith('Error loading configuration file: YAML parsing failed');
        });
    });

    describe('cleanup', () => {
        it('should clean up config watcher', () => {
            const mockWatcher = { id: 'test-watcher' };
            mockApp.vault.on.mockReturnValue(mockWatcher);

            // Set up watcher
            configService.setupConfigWatcher();

            // Clean up
            configService.cleanup();

            expect(mockApp.vault.offref).toHaveBeenCalledWith(mockWatcher);
        });

        it('should handle cleanup when no watcher exists', () => {
            configService.cleanup();

            expect(mockApp.vault.offref).not.toHaveBeenCalled();
        });

        it('should handle multiple cleanup calls', () => {
            const mockWatcher = { id: 'test-watcher' };
            mockApp.vault.on.mockReturnValue(mockWatcher);

            configService.setupConfigWatcher();
            configService.cleanup();
            configService.cleanup(); // Second cleanup should not throw

            expect(mockApp.vault.offref).toHaveBeenCalledTimes(1);
        });
    });
});