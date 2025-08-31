import { CommandsManager } from '../commands';
import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';

vi.mock('obsidian', () => ({
    Notice: vi.fn(),
    TFile: vi.fn()
}));

// Mock js-yaml
vi.mock('js-yaml', () => ({
    load: vi.fn()
}));

import {SummarizeOperation} from "../../operations/summarize";
import {TranslateOperation} from "../../operations/translate";
import {KeywordsOperation} from "../../operations/keywords";
import {RewriteOperation} from "../../operations/rewrite";
import { AIPluginSettings } from '../../types/config';

describe('Commands', () => {
    let mockSettings: AIPluginSettings = {
        configFilePath: 'config/ai-config.yaml',
        apiUrl: 'http://localhost:3000'
    };
    let mockSummarizeOperation: SummarizeOperation
    let mockTranslateOperation: TranslateOperation
    let mockKeywordsOperation: KeywordsOperation
    let mockRewriterOperation: RewriteOperation
    beforeEach(() => {
         const mockConfigService: any = {
             getConfig: vi.fn().mockReturnValue({
                 summarize: {
                     provider: 'test',
                     model: 'test',
                     maxLength: 200,
                     temperature: 0.5,
                     stream: false
                 }
             })
         };
         const mockAiService: any = {
             summarize: vi.fn().mockResolvedValue({
                 headers: {
                     get: vi.fn()
                 },
                 json: vi.fn().mockResolvedValue({ summary: 'test summary' })
             })
         };
         mockSummarizeOperation =  new SummarizeOperation(mockAiService, {} as any, mockConfigService);
         mockTranslateOperation = new TranslateOperation({} as any, {} as any, {} as any);
         mockKeywordsOperation =  new KeywordsOperation({} as any, {} as any);
         mockRewriterOperation = new RewriteOperation({} as any, {} as any,{} as any);
         vi.spyOn(mockSummarizeOperation, 'execute');
    });

    afterEach(() => {
        vi.resetAllMocks();
    });


    it('should register commands successfully', () => {
        // 2. Pass the mocks into the constructor
        const commandList = new CommandsManager(
            mockSummarizeOperation,
            mockTranslateOperation,
            mockKeywordsOperation,
            mockRewriterOperation,
            mockSettings
        );
        // The rest of your test remains the same
        expect(commandList.getCommands().length).toBeGreaterThan(0);
    });

    it('should handle command execution by calling the correct operation', async () => {
        // Arrange: Create an instance with our mocks
        const commandList = new CommandsManager(
            mockSummarizeOperation,
            mockTranslateOperation,
            mockKeywordsOperation,
            mockRewriterOperation,
            mockSettings
        );
        const mockEditor: any = {
            getSelection: vi.fn().mockReturnValue('test selection'),
            lastLine: vi.fn().mockReturnValue(0),
            getLine: vi.fn().mockReturnValue(''),
            setCursor: vi.fn(),
            replaceRange: vi.fn()
        };
        const mockView: any = {};

        // 3. Find a command on the INSTANCE, not the class
        const summarizeCommand = commandList
            .getCommands()
            .find(cmd => cmd.id === 'summarize-selection'); // Assuming a command with id 'summarize' exists
  // 4. Execute the command
  await summarizeCommand?.editorCallback(mockEditor, mockView);
        // Mock console methods
        vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.spyOn(console, 'error').mockImplementation(() => {});
        // Assert: Verify that the correct mock operation was called
        expect(mockSummarizeOperation.execute).toHaveBeenCalled();
        expect(mockSummarizeOperation.execute).toHaveBeenCalledTimes(1);
    });
});