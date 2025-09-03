import { App, Modal, Setting, TextAreaComponent, ButtonComponent, Notice } from 'obsidian';
import { Editor } from 'obsidian';
import { AIPluginSettings } from '../types/config';
import { ComposeOperation } from '../operations/compose';

export class ComposePromptModal extends Modal {
    private editor: Editor;
    private settings: AIPluginSettings;
    private composeOperation: ComposeOperation;
    private promptInput: TextAreaComponent;
    private submitButton: ButtonComponent;
    private initialValue: string;

    constructor(
        app: App,
        editor: Editor,
        selectedText: string,
        settings: AIPluginSettings,
        composeOperation: ComposeOperation,
        initialValue: string = ''
    ) {
        super(app);
        this.editor = editor;
        this.settings = settings;
        this.composeOperation = composeOperation;
        this.initialValue = selectedText || initialValue;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

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
        const { contentEl } = this;
        contentEl.empty();
    }
}

export class ComposeSuggestionsModal extends Modal {
    private editor: Editor;
    private selectedText: string;
    private suggestions: string[];
    private cursorPos: { line: number; ch: number };

    constructor(
        app: App, 
        editor: Editor, 
        selectedText: string, 
        suggestions: string[],
        cursorPos: { line: number; ch: number }
    ) {
        super(app);
        this.editor = editor;
        this.selectedText = selectedText;
        this.suggestions = suggestions;
        this.cursorPos = cursorPos;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        contentEl.createEl('h3', { text: 'Choose a suggestion' });

        if (this.suggestions.length === 0) {
            contentEl.createEl('p', { text: 'No suggestions were generated. Please try again.' });
            new ButtonComponent(contentEl)
                .setButtonText('Close')
                .onClick(() => this.close());
            return;
        }

        // Create suggestion containers
        this.suggestions.forEach((suggestion, index) => {
            const suggestionContainer = contentEl.createDiv('compose-suggestion');
            suggestionContainer.style.cssText = `
                border: 1px solid var(--background-modifier-border);
                border-radius: 6px;
                padding: 15px;
                margin-bottom: 15px;
                background: var(--background-primary);
            `;

            // Suggestion header
            const header = suggestionContainer.createDiv('compose-suggestion-header');
            header.style.cssText = `
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 10px;
            `;

            header.createEl('h4', { 
                text: `Option ${index + 1}`,
                attr: { style: 'margin: 0;' }
            });

            // Insert button
            new ButtonComponent(header)
                .setButtonText('Insert')
                .setCta()
                .onClick(() => this.insertSuggestion(suggestion));

            // Suggestion text
            const textEl = suggestionContainer.createEl('div', { 
                text: suggestion,
                cls: 'compose-suggestion-text'
            });
            textEl.style.cssText = `
                line-height: 1.5;
                color: var(--text-normal);
                white-space: pre-wrap;
            `;

            // Add hover effect
            suggestionContainer.addEventListener('mouseenter', () => {
                suggestionContainer.style.background = 'var(--background-secondary)';
            });
            suggestionContainer.addEventListener('mouseleave', () => {
                suggestionContainer.style.background = 'var(--background-primary)';
            });
        });

        // Bottom buttons
        const buttonContainer = contentEl.createDiv('compose-bottom-buttons');
        buttonContainer.style.cssText = `
            display: flex;
            justify-content: space-between;
            margin-top: 20px;
            padding-top: 15px;
            border-top: 1px solid var(--background-modifier-border);
        `;

        new ButtonComponent(buttonContainer)
            .setButtonText('Cancel')
            .onClick(() => this.close());

        // Generate more button
        new ButtonComponent(buttonContainer)
            .setButtonText('Generate More')
            .onClick(() => {
                // TODO: Implement regenerate functionality if needed
                new Notice('Regenerate functionality coming soon');
            });
    }

    private insertSuggestion(suggestion: string) {
        // Replace the selected text with the suggestion
        if (this.selectedText) {
            this.editor.replaceSelection(suggestion);
        } else {
            // If no text was selected, insert at cursor position
            this.editor.setCursor(this.cursorPos);
            this.editor.replaceRange(suggestion, this.cursorPos);
        }

        new Notice('Text inserted successfully');
        this.close();
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
