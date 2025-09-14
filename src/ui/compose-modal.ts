import { App, Modal, Setting, TextAreaComponent, ButtonComponent, Notice } from 'obsidian';
import { Editor } from 'obsidian';
import { AIPluginSettings } from '../types/config';
import { ComposeOperation } from '../operations/compose';

import { UIStateService } from '../services/ui-state-service';
export class ComposePromptModal extends Modal {
    private editor: Editor;
    private settings: AIPluginSettings;
    private composeOperation: ComposeOperation;
    private promptInput: TextAreaComponent;
    private submitButton: ButtonComponent;
    private initialValue: string;
    private uiStateService: UIStateService;

    constructor(
        app: App,
        editor: Editor,
        selectedText: string,
        settings: AIPluginSettings,
        composeOperation: ComposeOperation,
        uiStateService: UIStateService,
        initialValue: string = ''
    ) {
        super(app);
        this.editor = editor;
        this.settings = settings;
        this.composeOperation = composeOperation;
        this.initialValue = selectedText || initialValue;
        this.uiStateService = uiStateService;
    }

    onOpen() {
        this.uiStateService.setModalState(true);
        const { contentEl, modalEl } = this;
        contentEl.empty();

        // Add animation styles
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeInScaleUp {
                from {
                    opacity: 0;
                    transform: scale(0.95);
                }
                to {
                    opacity: 1;
                    transform: scale(1);
                }
            }

            @keyframes fadeOutScaleDown {
                from {
                    opacity: 1;
                    transform: scale(1);
                }
                to {
                    opacity: 0;
                    transform: scale(0.95);
                }
            }

            .modal.compose-modal-opening {
                animation: fadeInScaleUp 0.2s ease-out forwards;
            }

            .modal.compose-modal-closing {
                animation: fadeOutScaleDown 0.2s ease-in forwards;
            }
        `;
        document.head.appendChild(style);
        requestAnimationFrame(() => {
            this.modalEl.addClass('compose-modal-opening');
        });


        // Create text area directly without Setting wrapper
        const textArea = contentEl.createEl('textarea', {
            placeholder: 'Enter your AI prompt here...'
        });
        textArea.value = this.initialValue;
        textArea.style.cssText = `
            width: 100%;
            height: 200px;
            min-height: 200px;
            resize: vertical;
            padding: 12px;
            border: 1px solid var(--background-modifier-border);
            border-radius: 6px;
            background: var(--background-primary);
            color: var(--text-normal);
            font-family: var(--font-text);
            font-size: 14px;
            line-height: 1.5;
            box-sizing: border-box;
            margin-bottom: 15px;
        `;

        // Store reference for later use
        this.promptInput = {
            getValue: () => textArea.value,
            inputEl: textArea,
            setDisabled: (disabled: boolean) => {
                textArea.disabled = disabled;
            }
        } as TextAreaComponent;

        // Auto-focus and select all if there's initial value
        setTimeout(() => {
            textArea.focus();
            if (this.initialValue) {
                textArea.setSelectionRange(0, this.initialValue.length);
            }
        }, 100);

        // Handle Ctrl+Enter / Cmd+Enter to submit
        textArea.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
                event.preventDefault();
                this.handleSubmit();
            }
        });

        // Create button container
        const buttonContainer = contentEl.createDiv('compose-modal-buttons');
        buttonContainer.style.cssText = `
            display: flex;
            justify-content: flex-end;
            gap: 12px;
        `;

        // Cancel button
        new ButtonComponent(buttonContainer)
            .setButtonText('Cancel')
            .onClick(() => this.close());

        // Submit button
        this.submitButton = new ButtonComponent(buttonContainer)
            .setButtonText('Generate')
            .setCta()
            .onClick(() => this.handleSubmit());
    }

    private async handleSubmit() {
        const prompt = this.promptInput.getValue().trim();

        if (!prompt) {
            new Notice('Please enter a prompt');
            this.promptInput.inputEl.focus();
            return;
        }

        // Disable the submit button and show loading state
        this.submitButton.setButtonText('Generating...');
        this.submitButton.setDisabled(true);
        this.promptInput.setDisabled(true);

        try {
            // Close this modal first
            this.close();

            // Execute the compose operation
            await this.composeOperation.execute(this.editor,prompt, this.settings);
        } catch (error) {
            console.error('Compose operation failed:', error);
            new Notice('Failed to generate suggestions. Please try again.');

            // Re-enable controls if the modal is still open
            this.submitButton.setButtonText('Generate');
            this.submitButton.setDisabled(false);
            this.promptInput.setDisabled(false);
        }
    }

    onClose() {
        this.uiStateService.setModalState(false);
        const { contentEl } = this;
        contentEl.empty();
    }

    close() {
        this.modalEl.removeClass('compose-modal-opening');
        this.modalEl.addClass('compose-modal-closing');
        setTimeout(() => {
            super.close();
        }, 200); // Match animation duration
    }
}
