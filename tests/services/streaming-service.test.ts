// tests/services/streaming-service.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Obsidian dependencies
vi.mock('obsidian', () => ({
    Notice: vi.fn(),
    Editor: vi.fn()
}));

// Mock editor utils
vi.mock('../../src/utils/editor-utils', () => ({
    appendToEndOfDocument: vi.fn()
}));

// Import after mocks are set up
import { StreamingService } from '../../src/services/streaming-service';
import { Editor, Notice } from 'obsidian';
import { appendToEndOfDocument } from '../../src/utils/editor-utils';

describe('StreamingService', () => {
    let streamingService: StreamingService;
    let mockEditor: any;
    let mockNotice: any;

    beforeEach(() => {
        streamingService = new StreamingService();

        // Mock editor methods
        mockEditor = {
            lastLine: vi.fn().mockReturnValue(5),
            getLine: vi.fn().mockReturnValue('existing content'),
            replaceRange: vi.fn(),
            setCursor: vi.fn(),
            scrollIntoView: vi.fn()
        };

        // Mock Notice
        mockNotice = vi.fn();
        vi.mocked(Notice).mockImplementation(mockNotice);

        // Mock setTimeout for delays
        vi.stubGlobal('setTimeout', vi.fn((callback) => {
            callback();
            return 1;
        }));
    });

    afterEach(() => {
        vi.clearAllMocks();
        vi.unstubAllGlobals();
    });

    describe('handleStreamingResponse', () => {
        it('should handle SSE streaming with content field', async () => {
            const mockReader = {
                read: vi.fn()
                    .mockResolvedValueOnce({
                        done: false,
                        value: new TextEncoder().encode('data: {"content": "Hello "}\n')
                    })
                    .mockResolvedValueOnce({
                        done: false,
                        value: new TextEncoder().encode('data: {"content": "World!"}\n')
                    })
                    .mockResolvedValueOnce({
                        done: true,
                        value: undefined
                    }),
                releaseLock: vi.fn()
            };

            const mockResponse = {
                body: {
                    getReader: vi.fn().mockReturnValue(mockReader)
                }
            } as any;

            await streamingService.handleStreamingResponse(
                mockResponse,
                mockEditor,
                '\n\n**Summary:**\n\n',
                'Streaming completed'
            );

            expect(vi.mocked(appendToEndOfDocument)).toHaveBeenCalledWith(mockEditor, '\n\n**Summary:**\n\n');
            expect(mockEditor.replaceRange).toHaveBeenCalledWith('Hello ', expect.any(Object), expect.any(Object));
            expect(mockEditor.replaceRange).toHaveBeenCalledWith('World!', expect.any(Object), expect.any(Object));
            expect(mockEditor.setCursor).toHaveBeenCalled();
            expect(mockEditor.scrollIntoView).toHaveBeenCalled();
            expect(vi.mocked(Notice)).toHaveBeenCalledWith('Streaming completed');
            expect(mockReader.releaseLock).toHaveBeenCalled();
        });

        it('should handle streaming with text field', async () => {
            const mockReader = {
                read: vi.fn()
                    .mockResolvedValueOnce({
                        done: false,
                        value: new TextEncoder().encode('{"text": "Test content"}\n')
                    })
                    .mockResolvedValueOnce({
                        done: true,
                        value: undefined
                    }),
                releaseLock: vi.fn()
            };

            const mockResponse = {
                body: {
                    getReader: vi.fn().mockReturnValue(mockReader)
                }
            } as any;

            await streamingService.handleStreamingResponse(
                mockResponse,
                mockEditor,
                '\n\n**Test:**\n\n',
                'Test completed'
            );

            expect(mockEditor.replaceRange).toHaveBeenCalledWith('Test content', expect.any(Object), expect.any(Object));
            expect(vi.mocked(Notice)).toHaveBeenCalledWith('Test completed');
        });

        it('should handle streaming with delta field', async () => {
            const mockReader = {
                read: vi.fn()
                    .mockResolvedValueOnce({
                        done: false,
                        value: new TextEncoder().encode('{"delta": "Delta content"}\n')
                    })
                    .mockResolvedValueOnce({
                        done: true,
                        value: undefined
                    }),
                releaseLock: vi.fn()
            };

            const mockResponse = {
                body: {
                    getReader: vi.fn().mockReturnValue(mockReader)
                }
            } as any;

            await streamingService.handleStreamingResponse(
                mockResponse,
                mockEditor,
                '\n\n**Delta:**\n\n',
                'Delta completed'
            );

            expect(mockEditor.replaceRange).toHaveBeenCalledWith('Delta content', expect.any(Object), expect.any(Object));
        });

        it('should handle done flag in stream data', async () => {
            const mockReader = {
                read: vi.fn()
                    .mockResolvedValueOnce({
                        done: false,
                        value: new TextEncoder().encode('{"content": "Final content", "done": true}\n')
                    })
                    .mockResolvedValueOnce({
                        done: true,
                        value: undefined
                    }),
                releaseLock: vi.fn()
            };

            const mockResponse = {
                body: {
                    getReader: vi.fn().mockReturnValue(mockReader)
                }
            } as any;

            await streamingService.handleStreamingResponse(
                mockResponse,
                mockEditor,
                '\n\n**Final:**\n\n',
                'Process completed'
            );

            expect(mockEditor.replaceRange).toHaveBeenCalledWith('Final content', expect.any(Object), expect.any(Object));
            expect(vi.mocked(Notice)).toHaveBeenCalledWith('Process completed');
        });

        it('should skip SSE control messages', async () => {
            const mockReader = {
                read: vi.fn()
                    .mockResolvedValueOnce({
                        done: false,
                        value: new TextEncoder().encode('event: message\nid: 123\nretry: 1000\ndata: {"content": "Valid content"}\n')
                    })
                    .mockResolvedValueOnce({
                        done: true,
                        value: undefined
                    }),
                releaseLock: vi.fn()
            };

            const mockResponse = {
                body: {
                    getReader: vi.fn().mockReturnValue(mockReader)
                }
            } as any;

            await streamingService.handleStreamingResponse(
                mockResponse,
                mockEditor,
                '\n\n**Test:**\n\n',
                'Completed'
            );

            expect(mockEditor.replaceRange).toHaveBeenCalledWith('Valid content', expect.any(Object), expect.any(Object));
            expect(mockEditor.replaceRange).toHaveBeenCalledTimes(1);
        });

        it('should skip [DONE] markers', async () => {
            const mockReader = {
                read: vi.fn()
                    .mockResolvedValueOnce({
                        done: false,
                        value: new TextEncoder().encode('data: {"content": "Before done"}\ndata: [DONE]\n')
                    })
                    .mockResolvedValueOnce({
                        done: true,
                        value: undefined
                    }),
                releaseLock: vi.fn()
            };

            const mockResponse = {
                body: {
                    getReader: vi.fn().mockReturnValue(mockReader)
                }
            } as any;

            await streamingService.handleStreamingResponse(
                mockResponse,
                mockEditor,
                '\n\n**Test:**\n\n',
                'Completed'
            );

            expect(mockEditor.replaceRange).toHaveBeenCalledWith('Before done', expect.any(Object), expect.any(Object));
            expect(mockEditor.replaceRange).toHaveBeenCalledTimes(1);
        });

        it('should handle malformed JSON gracefully', async () => {
            const mockReader = {
                read: vi.fn()
                    .mockResolvedValueOnce({
                        done: false,
                        value: new TextEncoder().encode('invalid json\n{"content": "Valid content"}\n')
                    })
                    .mockResolvedValueOnce({
                        done: true,
                        value: undefined
                    }),
                releaseLock: vi.fn()
            };

            const mockResponse = {
                body: {
                    getReader: vi.fn().mockReturnValue(mockReader)
                }
            } as any;

            await streamingService.handleStreamingResponse(
                mockResponse,
                mockEditor,
                '\n\n**Test:**\n\n',
                'Completed'
            );

            expect(mockEditor.replaceRange).toHaveBeenCalledWith('Valid content', expect.any(Object), expect.any(Object));
            expect(mockEditor.replaceRange).toHaveBeenCalledTimes(1);
        });

        it('should handle streaming errors', async () => {
            const mockReader = {
                read: vi.fn().mockRejectedValue(new Error('Stream error')),
                releaseLock: vi.fn()
            };

            const mockResponse = {
                body: {
                    getReader: vi.fn().mockReturnValue(mockReader)
                }
            } as any;

            await streamingService.handleStreamingResponse(
                mockResponse,
                mockEditor,
                '\n\n**Test:**\n\n',
                'Completed'
            );

            expect(vi.mocked(Notice)).toHaveBeenCalledWith('Error during streaming: Stream error');
            expect(mockReader.releaseLock).toHaveBeenCalled();
        });

        it('should process remaining buffer content', async () => {
            const mockReader = {
                read: vi.fn()
                    .mockResolvedValueOnce({
                        done: false,
                        value: new TextEncoder().encode('{"content": "Partial')
                    })
                    .mockResolvedValueOnce({
                        done: false,
                        value: new TextEncoder().encode(' content"}')
                    })
                    .mockResolvedValueOnce({
                        done: true,
                        value: undefined
                    }),
                releaseLock: vi.fn()
            };

            const mockResponse = {
                body: {
                    getReader: vi.fn().mockReturnValue(mockReader)
                }
            } as any;

            await streamingService.handleStreamingResponse(
                mockResponse,
                mockEditor,
                '\n\n**Test:**\n\n',
                'Completed'
            );

            expect(mockEditor.replaceRange).toHaveBeenCalledWith('Partial content', expect.any(Object), expect.any(Object));
        });

        it('should handle empty or whitespace-only lines', async () => {
            const mockReader = {
                read: vi.fn()
                    .mockResolvedValueOnce({
                        done: false,
                        value: new TextEncoder().encode('\n\n  \n{"content": "Valid content"}\n\n')
                    })
                    .mockResolvedValueOnce({
                        done: true,
                        value: undefined
                    }),
                releaseLock: vi.fn()
            };

            const mockResponse = {
                body: {
                    getReader: vi.fn().mockReturnValue(mockReader)
                }
            } as any;

            await streamingService.handleStreamingResponse(
                mockResponse,
                mockEditor,
                '\n\n**Test:**\n\n',
                'Completed'
            );

            expect(mockEditor.replaceRange).toHaveBeenCalledWith('Valid content', expect.any(Object), expect.any(Object));
            expect(mockEditor.replaceRange).toHaveBeenCalledTimes(1);
        });
    });
});