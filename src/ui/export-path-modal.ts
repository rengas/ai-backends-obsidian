import { App, Modal, Setting, TextComponent } from 'obsidian';

export class ExportPathModal extends Modal {
    private fileName: string;
    private extension: string;
    private content: string;
    public onExportComplete: (path: string | null) => void;

    constructor(
        app: App,
        defaultFileName: string,
        extension: string,
        content: string
    ) {
        super(app);
        this.fileName = defaultFileName;
        this.extension = extension;
        this.content = content;
        this.onExportComplete = () => {};
    }

    onOpen(): void {
        const { contentEl } = this;
        contentEl.empty();

        contentEl.createEl('h2', { text: 'Export Configuration' });

        // File path input
        new Setting(contentEl)
            .setName('File name')
            .setDesc('Enter the name for the exported file')
            .addText((text: TextComponent) => {
                text.setValue(this.fileName)
                    .setPlaceholder(`Enter file name`)
                    .onChange((value: string) => {
                        this.fileName = value;
                    });
            });

        // Show current path info
        const pathInfo = contentEl.createDiv();
        pathInfo.style.marginBottom = '1em';
        pathInfo.style.padding = '0.5em';
        pathInfo.style.background = 'var(--background-secondary)';
        pathInfo.style.borderRadius = '4px';
        pathInfo.style.fontSize = '0.9em';
        pathInfo.textContent = `The file will be saved in .ai-backends as: ${this.fileName}.${this.extension}`;

        // Buttons
        const buttonContainer = contentEl.createDiv();
        buttonContainer.style.display = 'flex';
        buttonContainer.style.justifyContent = 'flex-end';
        buttonContainer.style.gap = '1em';
        buttonContainer.style.marginTop = '2em';

        // Cancel button
        const cancelButton = buttonContainer.createEl('button', { text: 'Cancel' });
        cancelButton.style.padding = '0.5em 1em';
        cancelButton.style.borderRadius = '4px';
        cancelButton.style.border = '1px solid var(--background-modifier-border)';
        cancelButton.style.background = 'var(--background-primary)';
        cancelButton.style.cursor = 'pointer';
        cancelButton.onclick = () => {
            this.close();
        };

        // Export button
        const exportButton = buttonContainer.createEl('button', { text: 'Export' });
        exportButton.style.padding = '0.5em 1em';
        exportButton.style.borderRadius = '4px';
        exportButton.style.border = 'none';
        exportButton.style.background = 'var(--interactive-accent)';
        exportButton.style.color = 'var(--text-on-accent)';
        exportButton.style.cursor = 'pointer';
        exportButton.onclick = async () => {
            await this.exportFile();
        };

        // Handle Enter key
        const handleKeyPress = (event: KeyboardEvent) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                this.exportFile();
            } else if (event.key === 'Escape') {
                event.preventDefault();
                this.close();
            }
        };

        contentEl.addEventListener('keydown', handleKeyPress);
        this.scope.register([], 'keydown', handleKeyPress);
    }

    private async exportFile(): Promise<void> {
        try {
            // Ensure filename has the correct extension
            let finalFileName = this.fileName;
            if (!finalFileName.endsWith(`.${this.extension}`)) {
                finalFileName = `${finalFileName}.${this.extension}`;
            }

            // Create the file in the .ai-backends directory
            const configDir = 'ai-backends';
            const filePath = `${configDir}/${finalFileName}`;
            
            // Check if .ai-backends directory exists, create if it doesn't
            try {
                await this.app.vault.createFolder(configDir);
            } catch (folderError) {
                // If folder already exists, ignore the error
                if (!folderError.message.includes('already exists')) {
                    throw folderError;
                }
            }

            // Create the file in the .ai-backends directory
            await this.app.vault.create(filePath, this.content);
            
            // Close the modal and call the callback
            this.close();
            this.onExportComplete(filePath);
        } catch (error) {
            console.error('Failed to export file:', error);
            
            // Show error message in the modal
            const errorDiv = this.contentEl.createDiv();
            errorDiv.style.color = 'var(--text-error)';
            errorDiv.style.padding = '1em';
            errorDiv.style.background = 'var(--background-modifier-error)';
            errorDiv.style.borderRadius = '4px';
            errorDiv.style.marginTop = '1em';
            errorDiv.textContent = `Failed to export: ${error.message}`;
            
            // Remove error message after 3 seconds
            setTimeout(() => {
                errorDiv.remove();
            }, 3000);
        }
    }

    onClose(): void {
        const { contentEl } = this;
        contentEl.empty();
        this.onExportComplete(null);
    }
}
