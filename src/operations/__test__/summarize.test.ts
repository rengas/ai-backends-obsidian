import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Editor, Notice } from 'obsidian';
import { SummarizeOperation } from '../summarize';
import { AIService } from '../../services/ai-service';
import { StreamingService } from '../../services/streaming-service';
import { ConfigService } from '../../services/config-service';
import { AIPluginSettings } from '../../types/config';
import { SummarizeRequest } from 'src/types/requests';

// Mock services
vi.mock('../../services/ai-service');
vi.mock('../../services/streaming-service');
vi.mock('../../services/config-service');

// Mock Obsidian components
vi.mock('obsidian', () => ({
  Editor: vi.fn(),
  Notice: vi.fn(),
}));

describe('SummarizeOperation', () => {
  let summarizeOperation: SummarizeOperation;
  let mockAIService: AIService;
  let mockStreamingService: StreamingService;
  let mockConfigService: ConfigService;
  let mockEditor: Editor;
  let mockSettings: AIPluginSettings;

  beforeEach(() => {
    vi.clearAllMocks();

    mockAIService = { summarize: vi.fn() } as any;
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
      };

    summarizeOperation = new SummarizeOperation(mockAIService, mockStreamingService, mockConfigService);

    (mockConfigService.getConfig as any).mockReturnValue({
      summarize: {
        provider: 'test-provider',
        model: 'test-model',
        temperature: 0.7,
        stream: false,
        maxLength: 150,
      },
    });
  });

  it('should show notice if config is missing', async () => {
    (mockConfigService.getConfig as any).mockReturnValue(null);
    await summarizeOperation.execute(mockEditor, 'test text', mockSettings);
    expect(Notice).toHaveBeenCalledWith('Please configure the summarize settings in the YAML file first');
  });

  it('should show notice if API URL is missing', async () => {
    mockSettings.apiUrl = '';
    await summarizeOperation.execute(mockEditor, 'test text', mockSettings);
    expect(Notice).toHaveBeenCalledWith('Please set the API URL in settings');
  });

  it('should handle non-streaming response', async () => {
    const mockResponse = {
      headers: new Headers({ 'content-type': 'application/json' }),
      json: vi.fn().mockResolvedValue({ summary: 'This is a summary.' }),
    };
    (mockAIService.summarize as any).mockResolvedValue(mockResponse);

    await summarizeOperation.execute(mockEditor, 'test text', mockSettings);

    expect(mockAIService.summarize).toHaveBeenCalled();
    expect(Notice).toHaveBeenCalledWith('Text summarized successfully');
  });

  it('should handle streaming response', async () => {
    const mockResponse = {
      headers: new Headers({ 'content-type': 'text/event-stream' }),
      body: new ReadableStream(),
    };
    (mockAIService.summarize as any).mockResolvedValue(mockResponse);
    (mockConfigService.getConfig as any).mockReturnValue({
      summarize: {
        stream: true,
      },
    });

    await summarizeOperation.execute(mockEditor, 'test text', mockSettings);

    expect(mockAIService.summarize).toHaveBeenCalled();
    expect(mockStreamingService.handleStreamingResponse).toHaveBeenCalled();
  });

  it('should handle API errors gracefully', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    (mockAIService.summarize as any).mockRejectedValue(new Error('API Error'));

    await summarizeOperation.execute(mockEditor, 'test text', mockSettings);

    expect(Notice).toHaveBeenCalledWith('Error summarizing text. Please check your API settings.');
    consoleErrorSpy.mockRestore();
  });

  it('should construct the correct request body', async () => {
    const mockResponse = {
      headers: new Headers({ 'content-type': 'application/json' }),
      json: vi.fn().mockResolvedValue({ summary: 'This is a summary.' }),
    };
    (mockAIService.summarize as any).mockResolvedValue(mockResponse);

    const text = 'This is a long text to be summarized.';
    await summarizeOperation.execute(mockEditor, text, mockSettings);

    const expectedBody: SummarizeRequest = {
      payload: {
        text: text,
        maxLength: 150,
      },
      config: {
        provider: 'test-provider',
        model: 'test-model',
        temperature: 0.7,
        stream: false,
      },
    };

    expect(mockAIService.summarize).toHaveBeenCalledWith(expectedBody);
  });
});