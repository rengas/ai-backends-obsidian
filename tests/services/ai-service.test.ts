import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AIService } from '../../src/services/ai-service'
import { AIPluginSettings } from '../../src/types/config'

// Mock fetch for testing
global.fetch = vi.fn()

describe('AIService', () => {
  let aiService: AIService
  let mockSettings: AIPluginSettings

  beforeEach(() => {
    mockSettings = {
      apiUrl: 'https://test-api.example.com',
      configFilePath: '/test/config.yml'
    }
    aiService = new AIService(mockSettings)
    vi.clearAllMocks()
  })

  it('should create an instance with settings', () => {
    expect(aiService).toBeDefined()
    expect(aiService).toBeInstanceOf(AIService)
  })

  it('should update settings', () => {
    const newSettings: AIPluginSettings = {
      apiUrl: 'https://new-api.example.com',
      configFilePath: '/new/config.yml'
    }

    // This should not throw an error
    expect(() => aiService.updateSettings(newSettings)).not.toThrow()
  })
})
