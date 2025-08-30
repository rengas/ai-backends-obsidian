import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AIService } from '../../src/services/ai-service';

// Mock fetch globally
global.fetch = vi.fn() as any;
const mockFetch = vi.mocked(global.fetch);

describe('AIService - makeRequest', () => {
  let aiService: AIService;
  const mockSettings = {
    apiUrl: 'https://api.example.com',
    configFilePath: 'config/ai-config.yaml'
  };

  beforeEach(() => {
    aiService = new AIService(mockSettings);
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('successful requests', () => {
    it('should make POST request with correct URL and headers for non-streaming', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue('success')
      } as any;
      mockFetch.mockResolvedValue(mockResponse);

      const endpoint = '/chat/completions';
      const requestBody = { message: 'Hello' };

      await (aiService as any).makeRequest(endpoint, requestBody, false);

      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Origin': 'app://obsidian.md',
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
    });

    it('should make POST request with streaming headers when isStreaming is true', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue('success')
      } as any;
      mockFetch.mockResolvedValue(mockResponse);

      const endpoint = '/chat/completions';
      const requestBody = { message: 'Hello', stream: true };

      await (aiService as any).makeRequest(endpoint, requestBody, true);

      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Origin': 'app://obsidian.md',
          'Accept': 'text/event-stream, application/x-ndjson, application/json'
        },
        body: JSON.stringify(requestBody)
      });
    });

    it('should return response when request is successful', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue('success')
      } as any;
      mockFetch.mockResolvedValue(mockResponse);

      const result = await (aiService as any).makeRequest('/test', { data: 'test' }, false);

      expect(result).toBe(mockResponse);
    });

    it('should handle different request body types correctly', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue('success')
      } as any;
      mockFetch.mockResolvedValue(mockResponse);

      const complexRequestBody = {
        messages: [{ role: 'user', content: 'Hello' }],
        model: 'gpt-4',
        temperature: 0.7,
        max_tokens: 1000,
        metadata: { userId: '123', nested: { data: true } }
      };

      await (aiService as any).makeRequest('/chat', complexRequestBody, false);

      expect(mockFetch).toHaveBeenCalledWith(expect.any(String), {
        method: 'POST',
        headers: expect.any(Object),
        body: JSON.stringify(complexRequestBody)
      });
    });
  });

  describe('error handling', () => {
    it('should throw error when response is not ok (4xx status)', async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        text: vi.fn().mockResolvedValue('Bad Request - Invalid parameters')
      } as any;
      mockFetch.mockResolvedValue(mockResponse);

      await expect(
          (aiService as any).makeRequest('/test', { data: 'test' }, false)
      ).rejects.toThrow('HTTP error! status: 400 - Bad Request - Invalid parameters');

      expect(mockResponse.text).toHaveBeenCalled();
    });

    it('should throw error when response is not ok (5xx status)', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        text: vi.fn().mockResolvedValue('Internal Server Error')
      } as any;
      mockFetch.mockResolvedValue(mockResponse);

      await expect(
          (aiService as any).makeRequest('/test', { data: 'test' }, false)
      ).rejects.toThrow('HTTP error! status: 500 - Internal Server Error');
    });

    it('should throw error when response is not ok (401 Unauthorized)', async () => {
      const mockResponse = {
        ok: false,
        status: 401,
        text: vi.fn().mockResolvedValue('Unauthorized - Invalid API key')
      } as any;
      mockFetch.mockResolvedValue(mockResponse);

      await expect(
          (aiService as any).makeRequest('/chat', { message: 'Hello' }, false)
      ).rejects.toThrow('HTTP error! status: 401 - Unauthorized - Invalid API key');
    });

    it('should handle network errors from fetch', async () => {
      mockFetch.mockRejectedValue(new Error('Network error: Failed to fetch'));

      await expect(
          (aiService as any).makeRequest('/test', { data: 'test' }, false)
      ).rejects.toThrow('Network error: Failed to fetch');
    });

    it('should handle timeout errors from fetch', async () => {
      mockFetch.mockRejectedValue(new Error('Request timeout'));

      await expect(
          (aiService as any).makeRequest('/test', { data: 'test' }, false)
      ).rejects.toThrow('Request timeout');
    });

    it('should handle error when response.text() fails', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        text: vi.fn().mockRejectedValue(new Error('Failed to read response'))
      } as any;
      mockFetch.mockResolvedValue(mockResponse);

      await expect(
          (aiService as any).makeRequest('/test', { data: 'test' }, false)
      ).rejects.toThrow('Failed to read response');
    });
  });

  describe('URL construction', () => {
    it('should correctly concatenate API URL with endpoint', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue('success')
      } as any;
      mockFetch.mockResolvedValue(mockResponse);

      await (aiService as any).makeRequest('/v1/chat/completions', { test: true }, false);

      expect(mockFetch).toHaveBeenCalledWith(
          'https://api.example.com/v1/chat/completions',
          expect.any(Object)
      );
    });

    it('should handle endpoint without leading slash', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue('success')
      } as any;
      mockFetch.mockResolvedValue(mockResponse);

      await (aiService as any).makeRequest('chat/completions', { test: true }, false);

      expect(mockFetch).toHaveBeenCalledWith(
          'https://api.example.com/chat/completions',
          expect.any(Object)
      );
    });

    it('should work with different API URLs', async () => {
      const customSettings = {
        apiUrl: 'https://custom-api.example.com/api',
        configFilePath: 'config/custom-config.yaml'
      };
      const customAiService = new AIService(customSettings);

      const mockResponse = {
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue('success')
      } as any;
      mockFetch.mockResolvedValue(mockResponse);

      await (customAiService as any).makeRequest('/test', { data: 'test' }, false);

      expect(mockFetch).toHaveBeenCalledWith(
          'https://custom-api.example.com/api/test',
          expect.any(Object)
      );
    });
  });

  describe('JSON serialization', () => {
    it('should handle empty request body', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue('success')
      } as any;
      mockFetch.mockResolvedValue(mockResponse);

      await (aiService as any).makeRequest('/test', {}, false);

      expect(mockFetch).toHaveBeenCalledWith(expect.any(String), {
        method: 'POST',
        headers: expect.any(Object),
        body: JSON.stringify({})
      });
    });

    it('should handle null values in request body', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue('success')
      } as any;
      mockFetch.mockResolvedValue(mockResponse);

      const requestBody = { message: 'Hello', metadata: null, optional: undefined };

      await (aiService as any).makeRequest('/test', requestBody, false);

      expect(mockFetch).toHaveBeenCalledWith(expect.any(String), {
        method: 'POST',
        headers: expect.any(Object),
        body: JSON.stringify(requestBody)
      });
    });

    it('should handle arrays in request body', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue('success')
      } as any;
      mockFetch.mockResolvedValue(mockResponse);

      const requestBody = {
        messages: [
          { role: 'system', content: 'You are a helpful assistant' },
          { role: 'user', content: 'Hello' }
        ],
        options: ['option1', 'option2']
      };

      await (aiService as any).makeRequest('/test', requestBody, false);

      expect(mockFetch).toHaveBeenCalledWith(expect.any(String), {
        method: 'POST',
        headers: expect.any(Object),
        body: JSON.stringify(requestBody)
      });
    });
  });
});