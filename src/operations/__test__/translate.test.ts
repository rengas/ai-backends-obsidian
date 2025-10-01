import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Editor, Notice } from 'obsidian';
import { TranslateOperation } from '../translate';
import { AIService } from '../../services/ai-service';
import { StreamingService } from '../../services/streaming-service';
import { ConfigService } from '../../services/config-service';
import { AIPluginSettings } from '../../types/config';
import { TranslateRequest } from 'src/types/requests';

// Mock services
vi.mock('../../services/ai-service');
vi.mock('../../services/streaming-service');
vi.mock('../../services/config-service');

// Mock Obsidian components
vi.mock('obsidian', () => ({
  Editor: vi.fn(),
  Notice: vi.fn(),
}));

describe('TranslateOperation', () => {
  let translateOperation: TranslateOperation;
  let mockAIService: AIService;
  let mockStreamingService: StreamingService;
  let mockConfigService: ConfigService;
  let mockEditor: Editor;
  let mockSettings: AIPluginSettings;

  beforeEach(() => {
    vi.clearAllMocks();

    mockAIService = { translate: vi.fn() } as any;
    mockStreamingService = { handleStreamingResponse: vi.fn() } as any;
    mockConfigService = { getConfig: vi.fn() } as any;
    mockEditor = {
      lastLine: vi.fn().mockReturnValue(0),
      getLine: vi.fn().mockReturnValue(''),
      replaceRange: vi.fn(),
      setCursor: vi.fn(),
    } as any;
      mockSettings = {
          apiUrl: 'https://api.example.com',
          configFilePath: '',
          translate: {
            provider: 'test-provider',
            model: 'test-model',
            temperature: 0.7,
            stream: false,
            defaultTargetLanguage: 'Spanish',
          },
      };

    translateOperation = new TranslateOperation(mockAIService, mockStreamingService);

    (mockConfigService.getConfig as any).mockReturnValue({
      translate: {
        provider: 'test-provider',
        model: 'test-model',
        temperature: 0.7,
        stream: false,
        defaultTargetLanguage: 'Spanish',
      },
    });
  });

  it('should show notice if config is missing', async () => {
    (mockConfigService.getConfig as any).mockReturnValue(null);
    await translateOperation.execute(mockEditor, 'test text', mockSettings);
    expect(Notice).toHaveBeenCalledWith('Please configure the translate settings in the plugin settings first');
  });

  it('should show notice if API URL is missing', async () => {
    mockSettings.apiUrl = '';
    await translateOperation.execute(mockEditor, 'test text', mockSettings);
    expect(Notice).toHaveBeenCalledWith('Please configure the translate settings in the plugin settings first');
  });

  it('should show notice if target language is missing', async () => {
    (mockConfigService.getConfig as any).mockReturnValue({
      translate: {
        defaultTargetLanguage: '',
      },
    });
    await translateOperation.execute(mockEditor, 'test text', mockSettings);
    expect(Notice).toHaveBeenCalledWith('Please configure the translate settings in the plugin settings first');
  });

  it('should handle non-streaming response', async () => {
    const mockResponse = {
      headers: new Headers({ 'content-type': 'application/json' }),
      json: vi.fn().mockResolvedValue({ translation: 'Translated text' }),
    };
    (mockAIService.translate as any).mockResolvedValue(mockResponse);

    await translateOperation.execute(mockEditor, 'test text', mockSettings);

    expect(mockAIService.translate).toHaveBeenCalled();
    expect(Notice).toHaveBeenCalledWith('Text translated successfully');
  });

  it('should handle streaming response', async () => {
    const mockResponse = {
      headers: new Headers({ 'content-type': 'text/event-stream' }),
      body: new ReadableStream(),
    };
    (mockAIService.translate as any).mockResolvedValue(mockResponse);
    // Update the settings to enable streaming
      mockSettings.translate = {
          ...(mockSettings.translate || {
              provider: 'test-provider',
              model: 'test-model',
              temperature: 0.7,
              stream: false,
              defaultTargetLanguage: "en",
          }),
          stream: true,
      };

    await translateOperation.execute(mockEditor, 'test text', mockSettings);

    expect(mockAIService.translate).toHaveBeenCalled();
    expect(mockStreamingService.handleStreamingResponse).toHaveBeenCalled();
  });

  it('should handle API errors gracefully', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    (mockAIService.translate as any).mockRejectedValue(new Error('API Error'));

    await translateOperation.execute(mockEditor, 'test text', mockSettings);

    expect(Notice).toHaveBeenCalledWith('Please configure the translate settings in the plugin settings first');
    consoleErrorSpy.mockRestore();
  });

  it('should construct the correct request body', async () => {
    const mockResponse = {
      headers: new Headers({ 'content-type': 'application/json' }),
      json: vi.fn().mockResolvedValue({ translation: 'Translated text' }),
    };
    (mockAIService.translate as any).mockResolvedValue(mockResponse);

    const text = 'Hello, world!';
    await translateOperation.execute(mockEditor, text, mockSettings, 'French');

    const expectedBody: TranslateRequest = {
      payload: {
        text: text,
        targetLanguage: 'French',
      },
      config: {
        provider: 'test-provider',
        model: 'test-model',
        temperature: 0.7,
        stream: false,
      },
    };

    expect(mockAIService.translate).toHaveBeenCalledWith(expectedBody);
  });
});