import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Editor, Notice } from 'obsidian';
import { KeywordsOperation } from '../keywords';
import { AIService } from '../../services/ai-service';
import { ConfigService } from '../../services/config-service';
import { AIPluginSettings } from '../../types/config';
import { KeywordsRequest } from 'src/types/requests';

// Mock services
vi.mock('../../services/ai-service');
vi.mock('../../services/config-service');

// Mock Obsidian components
vi.mock('obsidian', () => ({
  Editor: vi.fn(),
  Notice: vi.fn(),
}));

describe('KeywordsOperation', () => {
  let keywordsOperation: KeywordsOperation;
  let mockAIService: AIService;
  let mockConfigService: ConfigService;
  let mockEditor: Editor;
  let mockSettings: AIPluginSettings;

  beforeEach(() => {
    vi.clearAllMocks();

    mockAIService = { extractKeywords: vi.fn() } as any;
    mockConfigService = { getConfig: vi.fn() } as any;
    mockEditor = {
      getCursor: vi.fn().mockReturnValue({ line: 0, ch: 0 }),
      setCursor: vi.fn(),
      replaceRange: vi.fn(),
    } as any;
      mockSettings = {
          apiUrl: 'https://api.example.com',
          configFilePath: '',
          keywords: {
            provider: 'test-provider',
            model: 'test-model',
            temperature: 0.5,
            stream: false,
            maxKeywords: 5,
          },
      };

    keywordsOperation = new KeywordsOperation(mockAIService);

    (mockConfigService.getConfig as any).mockReturnValue({
      keywords: {
        provider: 'test-provider',
        model: 'test-model',
        temperature: 0.5,
        stream: false,
        maxKeywords: 5,
      },
    });
  });

  it('should show notice if config is missing', async () => {
    (mockConfigService.getConfig as any).mockReturnValue(null);
    await keywordsOperation.execute(mockEditor, 'test text', mockSettings);
    expect(Notice).toHaveBeenCalledWith('Please configure the keywords settings in the plugin settings first');
  });

  it('should show notice if API URL is missing', async () => {
    mockSettings.apiUrl = '';
    await keywordsOperation.execute(mockEditor, 'test text', mockSettings);
    expect(Notice).toHaveBeenCalledWith('Please configure the keywords settings in the plugin settings first');
  });

  it('should extract and display keywords', async () => {
    const mockResponse = {
      json: vi.fn().mockResolvedValue({ keywords: ['keyword1', 'keyword2'] }),
    };
    (mockAIService.extractKeywords as any).mockResolvedValue(mockResponse);

    await keywordsOperation.execute(mockEditor, 'test text', mockSettings);

    expect(mockAIService.extractKeywords).toHaveBeenCalled();
    expect(mockEditor.replaceRange).toHaveBeenCalledWith('\n\n**Keywords:**\n- keyword1\n- keyword2', { line: 0, ch: 0 });
    expect(Notice).toHaveBeenCalledWith('Keywords extracted successfully');
  });

  it('should handle API errors gracefully', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    (mockAIService.extractKeywords as any).mockRejectedValue(new Error('API Error'));

    await keywordsOperation.execute(mockEditor, 'test text', mockSettings);

    expect(Notice).toHaveBeenCalledWith('Please configure the keywords settings in the plugin settings first');
    consoleErrorSpy.mockRestore();
  });

  it('should construct the correct request body', async () => {
    const mockResponse = {
      json: vi.fn().mockResolvedValue({ keywords: [] }),
    };
    (mockAIService.extractKeywords as any).mockResolvedValue(mockResponse);

    const text = 'This is a test text for keyword extraction.';
    await keywordsOperation.execute(mockEditor, text, mockSettings);

    const expectedBody: KeywordsRequest = {
      payload: {
        text: text,
        maxKeywords: 5,
      },
      config: {
        provider: 'test-provider',
        model: 'test-model',
        temperature: 0.5,
        stream: false,
      },
    };

    expect(mockAIService.extractKeywords).toHaveBeenCalledWith(expectedBody);
  });
});