import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Editor, Notice } from 'obsidian';
import { RewriteOperation } from '../rewrite';
import { AIService } from '../../services/ai-service';
import { StreamingService } from '../../services/streaming-service';
import { ConfigService } from '../../services/config-service';
import { AIPluginSettings } from '../../types/config';
import { RewriteRequest } from 'src/types/requests';

// Mock services
vi.mock('../../services/ai-service');
vi.mock('../../services/streaming-service');
vi.mock('../../services/config-service');

// Mock Obsidian components
vi.mock('obsidian', () => ({
  Editor: vi.fn(),
  Notice: vi.fn(),
}));

describe('RewriteOperation', () => {
  let rewriteOperation: RewriteOperation;
  let mockAIService: AIService;
  let mockStreamingService: StreamingService;
  let mockConfigService: ConfigService;
  let mockEditor: Editor;
  let mockSettings: AIPluginSettings;

  beforeEach(() => {
    vi.clearAllMocks();

    mockAIService = { rewrite: vi.fn() } as any;
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
          rewrite: {
            provider: 'test-provider',
            model: 'test-model',
            temperature: 0.7,
            stream: false,
          },
      };

    rewriteOperation = new RewriteOperation(mockAIService, mockStreamingService, mockConfigService);

    (mockConfigService.getConfig as any).mockReturnValue({
      rewrite: {
        provider: 'test-provider',
        model: 'test-model',
        temperature: 0.7,
        stream: false,
      },
    });
  });

  it('should show notice if config is missing', async () => {
    (mockConfigService.getConfig as any).mockReturnValue(null);
    await rewriteOperation.execute(mockEditor, 'text', 'instruction', 'tone', 'header', mockSettings);
    expect(Notice).toHaveBeenCalledWith('Please configure the rewrite settings in the plugin settings first');
  });

  it('should show notice if API URL is missing', async () => {
    mockSettings.apiUrl = '';
    await rewriteOperation.execute(mockEditor, 'text', 'instruction', 'tone', 'header', mockSettings);
    expect(Notice).toHaveBeenCalledWith('Please configure the rewrite settings in the plugin settings first');
  });

  it('should handle non-streaming response', async () => {
    const mockResponse = {
      headers: new Headers({ 'content-type': 'application/json' }),
      json: vi.fn().mockResolvedValue({ text: 'Rewritten text' }),
    };
    (mockAIService.rewrite as any).mockResolvedValue(mockResponse);

    await rewriteOperation.execute(mockEditor, 'text', 'instruction', 'tone', 'header', mockSettings);

    expect(mockAIService.rewrite).toHaveBeenCalled();
    expect(Notice).toHaveBeenCalledWith('Action applied successfully');
  });

  it('should handle streaming response', async () => {
    const mockResponse = {
      headers: new Headers({ 'content-type': 'text/event-stream' }),
      body: new ReadableStream(),
    };
    (mockAIService.rewrite as any).mockResolvedValue(mockResponse);
    // Update the settings to enable streaming

      mockSettings.rewrite = {
          ...(mockSettings.rewrite || {
              provider: 'test-provider',
              model: 'test-model',
              temperature: 0.7,
             stream: false,
          }),
          stream: true,
      };

      await rewriteOperation.execute(mockEditor, 'text', 'instruction', 'tone', 'header', mockSettings);

    expect(mockAIService.rewrite).toHaveBeenCalled();
    expect(mockStreamingService.handleStreamingResponse).toHaveBeenCalled();
  });

  it('should handle API errors gracefully', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    (mockAIService.rewrite as any).mockRejectedValue(new Error('API Error'));

    await rewriteOperation.execute(mockEditor, 'text', 'instruction', 'tone', 'header', mockSettings);

    expect(Notice).toHaveBeenCalledWith('Please configure the rewrite settings in the plugin settings first');
    consoleErrorSpy.mockRestore();
  });

  it('should construct the correct request body', async () => {
    const mockResponse = {
      headers: new Headers({ 'content-type': 'application/json' }),
      json: vi.fn().mockResolvedValue({ text: 'Rewritten text' }),
    };
    (mockAIService.rewrite as any).mockResolvedValue(mockResponse);

    const text = 'Original text';
    const instruction = 'Make it more formal';
    const tone = 'formal';
    await rewriteOperation.execute(mockEditor, text, instruction, tone, 'header', mockSettings);

    const expectedBody: RewriteRequest = {
      payload: {
        text,
        instruction,
        tone,
      },
      config: {
        provider: 'test-provider',
        model: 'test-model',
        temperature: 0.7,
        stream: false,
      },
    };

    expect(mockAIService.rewrite).toHaveBeenCalledWith(expectedBody);
  });
});