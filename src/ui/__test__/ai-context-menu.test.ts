
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { App, Menu } from 'obsidian';
import { UIStateService } from '../../services/ui-state-service';

// Mock Obsidian components
vi.mock('obsidian', () => {
    const Menu = vi.fn();
    Menu.prototype.addItem = vi.fn().mockReturnThis();
    Menu.prototype.addSeparator = vi.fn().mockReturnThis();
    Menu.prototype.showAtPosition = vi.fn();
    Menu.prototype.setTitle = vi.fn().mockReturnThis();
    Menu.prototype.setIcon = vi.fn().mockReturnThis();
    Menu.prototype.setDisabled = vi.fn().mockReturnThis();
    Menu.prototype.onClick = vi.fn().mockReturnThis();
    Menu.prototype.setSubmenu = vi.fn().mockReturnValue(new Menu());

    return {
        Menu,
        Component: vi.fn(),
        App: vi.fn(),
        Editor: vi.fn(),
        Notice: vi.fn(),
        TFile: vi.fn(),
        Modal: vi.fn(),
        ActiveLeaf :vi.fn(),
    };
});

import { AIContextMenu } from '../ai-context-menu';
import { SummarizeOperation } from '../../operations/summarize';
import { TranslateOperation } from '../../operations/translate';
import { KeywordsOperation } from '../../operations/keywords';
import { RewriteOperation } from '../../operations/rewrite';
import { ComposeOperation } from '../../operations/compose';
import { AIPluginSettings } from '../../types/config';
import { TONES } from '../../types/tones';


describe('AIContextMenu', () => {
    let mockApp: App;
    let mockSummarizeOperation: SummarizeOperation;
    let mockTranslateOperation: TranslateOperation;
    let mockKeywordsOperation: KeywordsOperation;
    let mockRewriteOperation: RewriteOperation;
    let mockComposeOperation: ComposeOperation;
    let mockSettings: AIPluginSettings;
    let mockUIStateService: UIStateService;
    let contextMenu: AIContextMenu;

    beforeEach(() => {
        mockApp = {
            workspace: {
                activeLeaf: {
                    view: {
                        containerEl: {
                            getBoundingClientRect: () => ({
                                top: 0,
                                bottom: 0,
                                left: 0,
                                right: 0,
                                width: 0,
                                height: 0,
                                x: 0,
                                y: 0,
                                toJSON: () => ({})
                            }),
                        },
                    },
                },
            },
        } as any;
        mockSummarizeOperation = { execute: vi.fn() } as any;
        mockTranslateOperation = { execute: vi.fn() } as any;
        mockKeywordsOperation = { execute: vi.fn() } as any;
        mockRewriteOperation = {
            improveDescription: vi.fn(),
            improveWriting: vi.fn(),
            fixSpellingGrammar: vi.fn(),
            brainstorm: vi.fn(),
            makeShorter: vi.fn(),
            changeTone: vi.fn(),
        } as any;
        mockComposeOperation = { execute: vi.fn() } as any;
        mockSettings = {
            configFilePath: 'config/ai-config.yaml',
            apiUrl: 'http://localhost:3000',
            apiKey: ""
        };
        mockUIStateService = {
            getState: vi.fn(),
            setModalState: vi.fn(),
        } as any;

        contextMenu = new AIContextMenu(
            mockApp,
            mockSummarizeOperation,
            mockTranslateOperation,
            mockKeywordsOperation,
            mockRewriteOperation,
            mockComposeOperation,
            mockSettings,
            mockUIStateService
        );
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    it('should be defined', () => {
        expect(contextMenu).toBeDefined();
    });

    it('should create a menu with a title', () => {
        const mockEditor = {
            getSelection: vi.fn().mockReturnValue(''),
        } as any;

        contextMenu.showContextMenu(mockEditor);

        const mockMenuInstance = (vi.mocked(Menu) as any).mock.results[0].value;
        const firstItem = mockMenuInstance.addItem.mock.calls[0][0];

        const item: any = {
            setTitle: vi.fn().mockReturnThis(),
            setIcon: vi.fn().mockReturnThis(),
            setDisabled: vi.fn().mockReturnThis(),
        };
        firstItem(item);

        expect(item.setTitle).toHaveBeenCalledWith('AI Backends');
        expect(item.setIcon).toHaveBeenCalledWith('brain-circuit');
        expect(item.setDisabled).toHaveBeenCalledWith(true);
    });

    it('should show "Compose with AI" option when no text is selected', () => {
        const mockEditor = {
            getSelection: vi.fn().mockReturnValue(''),
        } as any;

        contextMenu.showContextMenu(mockEditor);

        const mockMenuInstance = (vi.mocked(Menu) as any).mock.results[0].value;
        const composeItemCall = mockMenuInstance.addItem.mock.calls[1][0];

        const item: any = {
            setTitle: vi.fn().mockReturnThis(),
            setIcon: vi.fn().mockReturnThis(),
            onClick: vi.fn(),
        };
        composeItemCall(item);

        expect(item.setTitle).toHaveBeenCalledWith('Compose with AI');
        expect(item.setIcon).toHaveBeenCalledWith('edit-3');
    });

    it('should show additional AI options when text is selected', () => {
        const mockEditor = {
            getSelection: vi.fn().mockReturnValue('some selected text'),
        } as any;

        contextMenu.showContextMenu(mockEditor);

        const mockMenuInstance = (vi.mocked(Menu) as any).mock.results[0].value;
        expect(mockMenuInstance.addItem).toHaveBeenCalledTimes(11);
        expect(mockMenuInstance.addSeparator).toHaveBeenCalledTimes(4);
    });

    it('should call summarize operation when "Summarize" is clicked', async () => {
        const mockEditor = {
            getSelection: vi.fn().mockReturnValue('some selected text'),
        } as any;

        contextMenu.showContextMenu(mockEditor);

        const mockMenuInstance = (vi.mocked(Menu) as any).mock.results[0].value;
        const summarizeItemCall = mockMenuInstance.addItem.mock.calls[2][0];

        const item: any = {
            setTitle: vi.fn().mockReturnThis(),
            setIcon: vi.fn().mockReturnThis(),
            onClick: vi.fn(),
        };
        summarizeItemCall(item);

        const onClickCallback = item.onClick.mock.calls[0][0];
        await onClickCallback();

        expect(mockSummarizeOperation.execute).toHaveBeenCalledWith(
            mockEditor,
            'some selected text',
            mockSettings
        );
    });

    it('should call translate operation with a specific language when a language is selected from the submenu', async () => {
        const mockEditor = {
            getSelection: vi.fn().mockReturnValue('some selected text'),
        } as any;

        contextMenu.showContextMenu(mockEditor);

        const mockMenuInstance = (vi.mocked(Menu) as any).mock.results[0].value;
        const translateItemCall = mockMenuInstance.addItem.mock.calls[10][0];

        const subMenu = new Menu();
        vi.spyOn(subMenu, 'addItem');

        const item: any = {
            setTitle: vi.fn().mockReturnThis(),
            setIcon: vi.fn().mockReturnThis(),
            setSubmenu: vi.fn().mockReturnValue(subMenu),
        };
        translateItemCall(item);

        // Simulate clicking the first popular language (Spanish)
        const languageItemCall = (subMenu.addItem as any).mock.calls[2][0];
        const languageItem: any = {
            setTitle: vi.fn().mockReturnThis(),
            onClick: vi.fn(),
        };
        languageItemCall(languageItem);
        const onClickCallback = languageItem.onClick.mock.calls[0][0];
        await onClickCallback();

        expect(mockTranslateOperation.execute).toHaveBeenCalledWith(
            mockEditor,
            'some selected text',
            mockSettings,
            'es' // POPULAR_LANGUAGES[0].code
        );
    });

    it('should call keywords operation when "Extract Keywords" is clicked', async () => {
        const mockEditor = {
            getSelection: vi.fn().mockReturnValue('some selected text'),
        } as any;

        contextMenu.showContextMenu(mockEditor);

        const mockMenuInstance = (vi.mocked(Menu) as any).mock.results[0].value;
        const keywordsItemCall = mockMenuInstance.addItem.mock.calls[3][0];

        const item: any = {
            setTitle: vi.fn().mockReturnThis(),
            setIcon: vi.fn().mockReturnThis(),
            onClick: vi.fn(),
        };
        keywordsItemCall(item);

        const onClickCallback = item.onClick.mock.calls[0][0];
        await onClickCallback();

        expect(mockKeywordsOperation.execute).toHaveBeenCalledWith(
            mockEditor,
            'some selected text',
            mockSettings
        );
    });

    it('should call rewrite operation when "Improve description" is clicked', async () => {
        const mockEditor = {
            getSelection: vi.fn().mockReturnValue('some selected text'),
        } as any;

        contextMenu.showContextMenu(mockEditor);

        const mockMenuInstance = (vi.mocked(Menu) as any).mock.results[0].value;
        const improveDescriptionItemCall = mockMenuInstance.addItem.mock.calls[4][0];

        const item: any = {
            setTitle: vi.fn().mockReturnThis(),
            setIcon: vi.fn().mockReturnThis(),
            onClick: vi.fn(),
        };
        improveDescriptionItemCall(item);

        const onClickCallback = item.onClick.mock.calls[0][0];
        await onClickCallback();

        expect(mockRewriteOperation.improveDescription).toHaveBeenCalledWith(
            mockEditor,
            'some selected text',
            mockSettings
        );
    });

    it('should call rewrite operation when "Improve writing" is clicked', async () => {
        const mockEditor = {
            getSelection: vi.fn().mockReturnValue('some selected text'),
        } as any;

        contextMenu.showContextMenu(mockEditor);

        const mockMenuInstance = (vi.mocked(Menu) as any).mock.results[0].value;
        const improveWritingItemCall = mockMenuInstance.addItem.mock.calls[5][0];

        const item: any = {
            setTitle: vi.fn().mockReturnThis(),
            setIcon: vi.fn().mockReturnThis(),
            onClick: vi.fn(),
        };
        improveWritingItemCall(item);

        const onClickCallback = item.onClick.mock.calls[0][0];
        await onClickCallback();

        expect(mockRewriteOperation.improveWriting).toHaveBeenCalledWith(
            mockEditor,
            'some selected text',
            mockSettings
        );
    });

    it('should call rewrite operation when "Fix spelling & grammar" is clicked', async () => {
        const mockEditor = {
            getSelection: vi.fn().mockReturnValue('some selected text'),
        } as any;

        contextMenu.showContextMenu(mockEditor);

        const mockMenuInstance = (vi.mocked(Menu) as any).mock.results[0].value;
        const fixSpellingGrammarItemCall = mockMenuInstance.addItem.mock.calls[6][0];

        const item: any = {
            setTitle: vi.fn().mockReturnThis(),
            setIcon: vi.fn().mockReturnThis(),
            onClick: vi.fn(),
        };
        fixSpellingGrammarItemCall(item);

        const onClickCallback = item.onClick.mock.calls[0][0];
        await onClickCallback();

        expect(mockRewriteOperation.fixSpellingGrammar).toHaveBeenCalledWith(
            mockEditor,
            'some selected text',
            mockSettings
        );
    });

    it('should call rewrite operation when "Brainstorm" is clicked', async () => {
        const mockEditor = {
            getSelection: vi.fn().mockReturnValue('some selected text'),
        } as any;

        contextMenu.showContextMenu(mockEditor);

        const mockMenuInstance = (vi.mocked(Menu) as any).mock.results[0].value;
        const brainstormItemCall = mockMenuInstance.addItem.mock.calls[7][0];

        const item: any = {
            setTitle: vi.fn().mockReturnThis(),
            setIcon: vi.fn().mockReturnThis(),
            onClick: vi.fn(),
        };
        brainstormItemCall(item);

        const onClickCallback = item.onClick.mock.calls[0][0];
        await onClickCallback();

        expect(mockRewriteOperation.brainstorm).toHaveBeenCalledWith(
            mockEditor,
            'some selected text',
            mockSettings
        );
    });

    it('should call rewrite operation when "Make shorter" is clicked', async () => {
        const mockEditor = {
            getSelection: vi.fn().mockReturnValue('some selected text'),
        } as any;

        contextMenu.showContextMenu(mockEditor);

        const mockMenuInstance = (vi.mocked(Menu) as any).mock.results[0].value;
        const makeShorterItemCall = mockMenuInstance.addItem.mock.calls[8][0];

        const item: any = {
            setTitle: vi.fn().mockReturnThis(),
            setIcon: vi.fn().mockReturnThis(),
            onClick: vi.fn(),
        };
        makeShorterItemCall(item);

        const onClickCallback = item.onClick.mock.calls[0][0];
        await onClickCallback();

        expect(mockRewriteOperation.makeShorter).toHaveBeenCalledWith(
            mockEditor,
            'some selected text',
            mockSettings
        );
    });

    it('should call rewrite operation with the correct tone when a tone is selected', async () => {
        const mockEditor = {
            getSelection: vi.fn().mockReturnValue('some selected text'),
        } as any;

        contextMenu.showContextMenu(mockEditor);

        const mockMenuInstance = (vi.mocked(Menu) as any).mock.results[0].value;
        const changeToneItemCall = mockMenuInstance.addItem.mock.calls[9][0];

        const subMenu = new Menu();
        vi.spyOn(subMenu, 'addItem');

        const item: any = {
            setTitle: vi.fn().mockReturnThis(),
            setIcon: vi.fn().mockReturnThis(),
            setSubmenu: vi.fn().mockReturnValue(subMenu),
        };
        changeToneItemCall(item);

        const toneItemCall = (subMenu.addItem as any).mock.calls[0][0];
        const toneItem: any = {
            setTitle: vi.fn().mockReturnThis(),
            onClick: vi.fn(),
        };
        toneItemCall(toneItem);
        const onClickCallback = toneItem.onClick.mock.calls[0][0];
        await onClickCallback();

        expect(mockRewriteOperation.changeTone).toHaveBeenCalledWith(
            mockEditor,
            'some selected text',
            TONES[0],
            mockSettings
        );
    });

    it('should have uiStateService property', () => {
        expect(contextMenu['uiStateService']).toBe(mockUIStateService);
    });

});