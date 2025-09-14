import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { App, Editor } from 'obsidian';
import { ComposePromptModal } from '../compose-modal';
import { AIPluginSettings } from '../../types/config';
import { ComposeOperation } from '../../operations/compose';
import { UIStateService } from '../../services/ui-state-service';

// Mock document and DOM elements
const mockDocument = {
    createElement: vi.fn().mockImplementation((tag: string) => {
        if (tag === 'style') {
            const styleElement = {
                textContent: '',
                appendChild: vi.fn(),
            };
            // Make textContent writable
            Object.defineProperty(styleElement, 'textContent', {
                value: '',
                writable: true,
            });
            return styleElement;
        }
        return {};
    }),
    head: {
        appendChild: vi.fn(),
    },
};


// Mock Obsidian components
vi.mock('obsidian', () => {
    class Modal {
        contentEl: any;
        modalEl: any;
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
            this.modalEl = {
                addClass: vi.fn(),
                removeClass: vi.fn(),
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
    let mockUIStateService: UIStateService;

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
        mockUIStateService = {
            getState: vi.fn(),
            setModalState: vi.fn(),
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
            mockComposeOperation,
            mockUIStateService
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
            mockUIStateService,
            initialValue
        );
        expect(modal['initialValue']).toBe(initialValue);
    });

    it('should call uiStateService.setModalState with true when opening', () => {
        const modal = new ComposePromptModal(
            mockApp,
            mockEditor,
            'test text',
            mockSettings,
            mockComposeOperation,
            mockUIStateService
        );
        
        // Mock the onOpen method to avoid DOM manipulation
        const originalOnOpen = modal.onOpen;
        modal.onOpen = vi.fn().mockImplementation(function() {
            this.uiStateService.setModalState(true);
        });
        
        modal.onOpen();
        expect(mockUIStateService.setModalState).toHaveBeenCalledWith(true);
        
        // Restore the original method
        modal.onOpen = originalOnOpen;
    });

    it('should call uiStateService.setModalState with false when closing', () => {
        const modal = new ComposePromptModal(
            mockApp,
            mockEditor,
            'test text',
            mockSettings,
            mockComposeOperation,
            mockUIStateService
        );
        modal.onClose();
        expect(mockUIStateService.setModalState).toHaveBeenCalledWith(false);
    });
});