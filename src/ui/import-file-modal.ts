import { App, Modal, Setting, TextComponent, DropdownComponent } from 'obsidian';
import { TFile } from 'obsidian';

export class ImportFileModal extends Modal {
    private extension: string;
    public onImportComplete: (filePath: string | null, fileContent: string | null) => void;
    private selectedFile: TFile | null = null;

    constructor(
        app: App,
        extension: string
    ) {
        super(app);
        this.extension = extension;
        this.onImportComplete = () => {};
    }

    onOpen(): void {
        const { contentEl } = this;
        contentEl.empty();

        contentEl.createEl('h2', { text: 'Import Configuration' });

        // File selector dropdown
        const files = this.app.vault.getFiles().filter(file => 
            file.name.endsWith(`.${this.extension}`) && file.path.startsWith('ai-backends/')
        );

        if (files.length === 0) {
            const noFilesMsg = contentEl.createDiv();
            noFilesMsg.style.padding = '1em';
            noFilesMsg.style.background = 'var(--background-modifier-error)';
            noFilesMsg.style.color = 'var(--text-normal)';
            noFilesMsg.style.borderRadius = '4px';
            noFilesMsg.textContent = `No .${this.extension} files found in ai-backends directory.`;
            return;
        }

        new Setting(contentEl)
            .setName('Select file')
            .setDesc(`Choose a .${this.extension} file to import`)
            .addDropdown(dropdown => {
                files.forEach(file => {
                    dropdown.addOption(file.path, file.name);
                });
                dropdown.setValue(files[0].path);
                dropdown.onChange((value: string) => {
                    this.selectedFile = files.find(f => f.path === value) || null;
                });
                // Set initial selected file
                this.selectedFile = files[0];
            });

        // Show file info
        const fileInfo = contentEl.createDiv();
        fileInfo.style.marginBottom = '1em';
        fileInfo.style.padding = '0.5em';
        fileInfo.style.background = 'var(--background-secondary)';
        fileInfo.style.borderRadius = '4px';
        fileInfo.style.fontSize = '0.9em';
        fileInfo.textContent = `Selected file: ${this.selectedFile?.name || 'None'}`;

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

        // Import button
        const importButton = buttonContainer.createEl('button', { text: 'Import' });
        importButton.style.padding = '0.5em 1em';
        importButton.style.borderRadius = '4px';
        importButton.style.border = 'none';
        importButton.style.background = 'var(--interactive-accent)';
        importButton.style.color = 'var(--text-on-accent)';
        importButton.style.cursor = 'pointer';
        importButton.onclick = async () => {
            await this.importFile();
        };

        // Update file info when selection changes
        const updateFileInfo = () => {
            fileInfo.textContent = `Selected file: ${this.selectedFile?.name || 'None'}`;
        };

        // Handle Enter key
        const handleKeyPress = (event: KeyboardEvent) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                this.importFile();
            } else if (event.key === 'Escape') {
                event.preventDefault();
                this.close();
            }
        };

        contentEl.addEventListener('keydown', handleKeyPress);
    }

    private async importFile(): Promise<void> {
        try {
            if (!this.selectedFile) {
                throw new Error('No file selected');
            }

            // Read the file content
            const fileContent = await this.app.vault.read(this.selectedFile);
            
            // Close the modal and call the callback
            this.close();
            this.onImportComplete(this.selectedFile.path, fileContent);
        } catch (error) {
            console.error('Failed to import file:', error);
            
            // Show error message in the modal
            const errorDiv = this.contentEl.createDiv();
            errorDiv.style.color = 'var(--text-error)';
            errorDiv.style.padding = '1em';
            errorDiv.style.background = 'var(--background-modifier-error)';
            errorDiv.style.borderRadius = '4px';
            errorDiv.style.marginTop = '1em';
            errorDiv.textContent = `Failed to import: ${error.message}`;
            
            // Remove error message after 3 seconds
            setTimeout(() => {
                errorDiv.remove();
            }, 3000);
        }
    }

    onClose(): void {
        const { contentEl } = this;
        contentEl.empty();
        this.onImportComplete(null, null);
    }
}
