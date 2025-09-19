import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Editor, Notice } from 'obsidian';
import { ComposeOperation } from '../compose';
import { AIService } from '../../services/ai-service';
import { StreamingService } from '../../services/streaming-service';
import { ConfigService } from '../../services/config-service';
import { AIPluginSettings } from '../../types/config';
import { ComposeRequest } from 'src/types/requests';

// Mock services
vi.mock('../../services/ai-service');
vi.mock('../../services/streaming-service');
vi.mock('../../services/config-service');

// Mock Obsidian components
vi.mock('obsidian', () => ({
  Editor: vi.fn(),
  Notice: vi.fn(),
  // Add other Obsidian mocks if needed
}));

describe('ComposeOperation', () => {
  let composeOperation: ComposeOperation;
  let mockAIService: AIService;
  let mockStreamingService: StreamingService;
  let mockConfigService: ConfigService;
  let mockEditor: Editor;
  let mockSettings: AIPluginSettings;

  beforeEach(() => {
    vi.clearAllMocks();

    mockAIService = { compose: vi.fn() } as any;
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
        compose: {
          provider: 'test-provider',
          model: 'test-model',
          temperature: 0.7,
          stream: false,
          maxLength: 500,
        },
    };

    composeOperation = new ComposeOperation(mockAIService, mockStreamingService, mockConfigService);

    // Mock service methods
    (mockConfigService.getConfig as any).mockReturnValue({
      compose: {
        provider: 'test-provider',
        model: 'test-model',
        temperature: 0.7,
        stream: false,
        maxLength: 500,
      },
    });
  });

  it('should show notice if config is missing', async () => {
    mockConfigService.getConfig = vi.fn().mockReturnValue(null);
    await composeOperation.execute(mockEditor, 'test topic', mockSettings);
    expect(Notice).toHaveBeenCalledWith('Please configure the compose settings in the plugin settings first');
  });

  it('should show notice if API URL is missing', async () => {
    mockSettings.apiUrl = '';
    await composeOperation.execute(mockEditor, 'test topic', mockSettings);
    expect(Notice).toHaveBeenCalledWith('Please configure the compose settings in the plugin settings first');
  });

  it('should handle non-streaming response', async () => {
    const mockResponse = {
      headers: new Headers({ 'content-type': 'application/json' }),
      json: vi.fn().mockResolvedValue({ result: 'Generated text' }),
    };
    (mockAIService.compose as any).mockResolvedValue(mockResponse);

    await composeOperation.execute(mockEditor, 'test topic', mockSettings);

    expect(mockAIService.compose).toHaveBeenCalled();
    expect(Notice).toHaveBeenCalledWith('Composed successfully');
  });

  it('should handle streaming response', async () => {
    const mockResponse = {
      headers: new Headers({ 'content-type': 'text/event-stream' }),
      body: new ReadableStream(),
    };
    (mockAIService.compose as any).mockResolvedValue(mockResponse);

    mockSettings.compose = {
      ...(mockSettings.compose || {
        provider: 'test-provider',
        model: 'test-model',
        temperature: 0.7,
        maxLength: 500,
      }),
      stream: true,
    };

    await composeOperation.execute(mockEditor, 'test topic', mockSettings);

    expect(mockAIService.compose).toHaveBeenCalled();
    expect(mockStreamingService.handleStreamingResponse).toHaveBeenCalled();
  });

  it('should handle API errors gracefully', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    (mockAIService.compose as any).mockRejectedValue(new Error('API Error'));

    await composeOperation.execute(mockEditor, 'test topic', mockSettings);

    expect(Notice).toHaveBeenCalledWith('Please configure the compose settings in the plugin settings first');
    consoleErrorSpy.mockRestore();
  });

  it('should construct the correct request body', async () => {
    const mockResponse = {
      headers: new Headers({ 'content-type': 'application/json' }),
      json: vi.fn().mockResolvedValue({ result: 'Generated text' }),
    };
    (mockAIService.compose as any).mockResolvedValue(mockResponse);

    const topic = 'A story about a dragon';
    await composeOperation.execute(mockEditor, topic, mockSettings);

    const expectedBody: ComposeRequest = {
      payload: {
        topic: topic,
        maxLength: 500,
      },
      config: {
        provider: 'test-provider',
        model: 'test-model',
        temperature: 0.7,
        stream: false,
      },
    };

    expect(mockAIService.compose).toHaveBeenCalledWith(expectedBody);
  });
});