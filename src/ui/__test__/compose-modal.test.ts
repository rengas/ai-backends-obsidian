import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { App, Editor } from 'obsidian';
import { ComposePromptModal, ComposeSuggestionsModal } from '../compose-modal';
import { AIPluginSettings } from '../../types/config';
import { ComposeOperation } from '../../operations/compose';

// Mock Obsidian components
vi.mock('obsidian', () => {
    class Modal {
        contentEl: any;
        constructor() {
            this.contentEl = {
                empty: vi.fn(),
                createEl: vi.fn().mockImplementation((tag, options) => ({
                    ...options,
                    style: {},
                    addEventListener: vi.fn(),
                    focus: vi.fn(),
                    setSelectionRange: vi.fn(),
                    value: '',
                    disabled: false,
                })),
                createDiv: vi.fn().mockImplementation(() => ({
                    style: {},
                })),
            };
        }
        open() {}
        close() {}
    }

    return {
        Modal,
        App: vi.fn(),
        Editor: vi.fn(),
        Notice: vi.fn(),
        Setting: vi.fn(() => ({
            setName: vi.fn().mockReturnThis(),
            addTextArea: vi.fn().mockReturnThis(),
        })),
        ButtonComponent: vi.fn(() => ({
            setButtonText: vi.fn().mockReturnThis(),
            setCta: vi.fn().mockReturnThis(),
            onClick: vi.fn().mockReturnThis(),
            setDisabled: vi.fn().mockReturnThis(),
        })),
        TextAreaComponent: vi.fn(() => ({
            inputEl: {
                focus: vi.fn(),
            },
            getValue: vi.fn(),
            setValue: vi.fn(),
        })),
    };
});

describe('ComposePromptModal', () => {
    let mockApp: App;
    let mockEditor: Editor;
    let mockSettings: AIPluginSettings;
    let mockComposeOperation: ComposeOperation;

    beforeEach(() => {
        mockApp = {} as App;
        mockEditor = {
            getSelection: vi.fn(),
        } as any;
        mockSettings = {
            apiUrl: 'test-api',
            configFilePath: 'test-path',
        };
        mockComposeOperation = {
            execute: vi.fn(),
        } as any;
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    it('should set initial value from selected text', () => {
        const selectedText = 'This is the selected text.';
        const modal = new ComposePromptModal(
            mockApp,
            mockEditor,
            selectedText,
            mockSettings,
            mockComposeOperation
        );
        expect(modal['initialValue']).toBe(selectedText);
    });

    it('should fall back to initialValue if selected text is empty', () => {
        const initialValue = 'This is the initial value.';
        const modal = new ComposePromptModal(
            mockApp,
            mockEditor,
            '',
            mockSettings,
            mockComposeOperation,
            initialValue
        );
        expect(modal['initialValue']).toBe(initialValue);
    });
});

describe('ComposeSuggestionsModal', () => {
    let mockApp: App;
    let mockEditor: Editor;

    beforeEach(() => {
        mockApp = {} as App;
        mockEditor = {
            replaceSelection: vi.fn(),
            setCursor: vi.fn(),
            replaceRange: vi.fn(),
        } as any;
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    it('should replace selection when text is selected', () => {
        const suggestions = ['suggestion 1'];
        const modal = new ComposeSuggestionsModal(
            mockApp,
            mockEditor,
            'selected text',
            suggestions,
            { line: 0, ch: 0 }
        );
        modal['insertSuggestion'](suggestions[0]);
        expect(mockEditor.replaceSelection).toHaveBeenCalledWith(suggestions[0]);
    });

    it('should insert at cursor position when no text is selected', () => {
        const suggestions = ['suggestion 1'];
        const cursorPos = { line: 5, ch: 10 };
        const modal = new ComposeSuggestionsModal(
            mockApp,
            mockEditor,
            '',
            suggestions,
            cursorPos
        );
        modal['insertSuggestion'](suggestions[0]);
        expect(mockEditor.setCursor).toHaveBeenCalledWith(cursorPos);
        expect(mockEditor.replaceRange).toHaveBeenCalledWith(suggestions[0], cursorPos);
    });
});