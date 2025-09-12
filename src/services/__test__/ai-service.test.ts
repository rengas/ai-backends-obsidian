import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AIService } from '../ai-service';
import { AIPluginSettings } from '../../types/config';

// Mock fetch globally
global.fetch = vi.fn() as any;
const mockFetch = vi.mocked(global.fetch);

describe('AIService', () => {
	let aiService: AIService;
	let mockSettings: AIPluginSettings;

	beforeEach(() => {
		mockSettings = {
			apiUrl: 'https://api.example.com',
			apiKey: 'test-api-key',
			configFilePath: 'config/ai-config.yaml'
		};
		aiService = new AIService(mockSettings);
		mockFetch.mockClear();
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	describe('makeRequest', () => {
		it('should include Authorization header if apiKey is present', async () => {
			const mockResponse = {
				ok: true,
				status: 200,
				text: vi.fn().mockResolvedValue('success')
			} as any;
			mockFetch.mockResolvedValue(mockResponse);

			await (aiService as any).makeRequest('/test', {}, false);

			expect(mockFetch).toHaveBeenCalledWith(expect.any(String), {
				method: 'POST',
				headers: expect.objectContaining({
					'Authorization': `Bearer ${mockSettings.apiKey}`
				}),
				body: JSON.stringify({})
			});
		});

		it('should not include Authorization header if apiKey is not present', async () => {
			mockSettings.apiKey = '';
			aiService.updateSettings(mockSettings);
			const mockResponse = {
				ok: true,
				status: 200,
				text: vi.fn().mockResolvedValue('success')
			} as any;
			mockFetch.mockResolvedValue(mockResponse);

			await (aiService as any).makeRequest('/test', {}, false);

			const headers = (mockFetch.mock.calls[0][1] as RequestInit).headers as Record<string, string>;
			expect(headers).not.toHaveProperty('Authorization');
		});
	});
});