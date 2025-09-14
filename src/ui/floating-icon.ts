import { App, MarkdownView, Editor, Component, setTooltip } from 'obsidian';
import { AIContextMenu } from './ai-context-menu';
import { ComposePromptModal } from './compose-modal';
import { ComposeOperation } from '../operations/compose';
import { AIPluginSettings } from '../types/config';

export class FloatingIcon extends Component {
    private app: App;
    private aiContextMenu: AIContextMenu;
    private composeOperation: ComposeOperation;
    private settings: AIPluginSettings;
    private iconElement: HTMLElement;
    private isVisible: boolean = false;
    private currentEditor: Editor | null = null;
    private updatePositionThrottled: () => void;

    constructor(
        app: App,
        aiContextMenu: AIContextMenu,
        composeOperation: ComposeOperation,
        settings: AIPluginSettings
    ) {
        super();
        this.app = app;
        this.aiContextMenu = aiContextMenu;
        this.composeOperation = composeOperation;
        this.settings = settings;

        // Throttle position updates to improve performance
        this.updatePositionThrottled = this.throttle(() => {
            this.updateIconPosition();
        }, 50);
    }

    updateSettings(settings: AIPluginSettings): void {
        this.settings = settings;
    }

    onload(): void {
        // Create the floating icon element
        this.iconElement = document.createElement('div');
        this.iconElement.addClass('ai-floating-icon');
        this.iconElement.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 2-3 7h6l-3 7"></path></svg>';
        
        // Style the icon
        this.iconElement.style.cssText = `
            position: absolute;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background-color: var(--interactive-accent);
            color: var(--text-on-accent);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            z-index: 100;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
            transition: all 0.2s ease;
            opacity: 0;
            transform: scale(0.8);
            pointer-events: none;
        `;
        
        // Add hover effect
        this.iconElement.addEventListener('mouseenter', () => {
            this.iconElement.style.backgroundColor = 'var(--interactive-accent-hover)';
            this.iconElement.style.transform = 'scale(1.1)';
        });
        
        this.iconElement.addEventListener('mouseleave', () => {
            this.iconElement.style.backgroundColor = 'var(--interactive-accent)';
            this.iconElement.style.transform = 'scale(1)';
        });
        
        // Add click handler
        this.iconElement.addEventListener('click', (evt) => {
            this.handleIconClick(evt);
        });
        
        // Add tooltip
        setTooltip(this.iconElement, 'AI Backends', {
            delay: 500,
            placement: 'left'
        });
        
        // Add to document body
        document.body.appendChild(this.iconElement);
        
        // Register event listeners
        this.registerEvent(
            this.app.workspace.on('active-leaf-change', () => {
                this.handleEditorChange();
            })
        );
        
        this.registerEvent(
            this.app.workspace.on('editor-change', (editor) => {
                if (editor === this.currentEditor) {
                    this.updatePositionThrottled();
                }
            })
        );
        
        // Track cursor movement
        this.registerDomEvent(document, 'mousemove', (evt) => {
            this.handleMouseMove(evt);
        });
        
        // Initial setup
        this.handleEditorChange();
    }

    onunload(): void {
        if (this.iconElement && this.iconElement.parentNode) {
            this.iconElement.parentNode.removeChild(this.iconElement);
        }
    }

    private handleEditorChange(): void {
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
        
        if (activeView && activeView.editor) {
            this.currentEditor = activeView.editor;
            this.showIcon();
        } else {
            this.currentEditor = null;
            this.hideIcon();
        }
    }

    private handleMouseMove(evt: MouseEvent): void {
        if (!this.currentEditor) return;
        
        // Check if mouse is over the editor
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (!activeView) return;
        
        const editorEl = activeView.containerEl;
        const rect = editorEl.getBoundingClientRect();
        
        if (evt.clientX >= rect.left && evt.clientX <= rect.right &&
            evt.clientY >= rect.top && evt.clientY <= rect.bottom) {
            this.showIcon();
            this.updatePositionThrottled();
        } else {
            this.hideIcon();
        }
    }

    private updateIconPosition(): void {
        if (!this.currentEditor || !this.iconElement) return;
        
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (!activeView) return;
        
        const editorEl = activeView.containerEl;
        const rect = editorEl.getBoundingClientRect();
        
        // Get cursor position from the editor
        const cursor = this.currentEditor.getCursor();
        
        // Use a fixed line height for more consistent behavior
        const lineHeight = 24; // Fixed line height in pixels
        
        // Calculate the actual position of the cursor line
        // Add 2 to cursor.line to move the icon two lines below the file name heading
        const adjustedLine = Math.max(0, cursor.line + 5);
        const lineTop = adjustedLine * lineHeight;
        
        // Position the icon on the left side of the editor, at the same line as the cursor
        const iconLeft = rect.left + 300; // Fixed position on the left side with 45px offset (moved 25px to the right)
        const iconTop = rect.top + lineTop + (lineHeight / 2) - 16; // Center vertically with cursor line
        
        // Ensure icon stays within editor bounds
        const minTop = rect.top;
        const maxTop = rect.bottom - 40; // Account for icon height
        
        const finalTop = Math.max(minTop, Math.min(iconTop, maxTop));
        
        this.iconElement.style.left = `${iconLeft}px`;
        this.iconElement.style.top = `${finalTop}px`;
    }

    private showIcon(): void {
        if (!this.isVisible && this.iconElement) {
            this.isVisible = true;
            this.iconElement.style.opacity = '1';
            this.iconElement.style.transform = 'scale(1)';
            this.iconElement.style.pointerEvents = 'auto';
        }
    }

    private hideIcon(): void {
        if (this.isVisible && this.iconElement) {
            this.isVisible = false;
            this.iconElement.style.opacity = '0';
            this.iconElement.style.transform = 'scale(0.8)';
            this.iconElement.style.pointerEvents = 'none';
        }
    }

    private handleIconClick(evt: MouseEvent): void {
        if (!this.currentEditor) return;
        
        const selection = this.currentEditor.getSelection();
        
        if (selection.length > 0) {
            // If text is selected, show context menu
            this.aiContextMenu.showContextMenu(this.currentEditor, evt);
        } else {
            // If no text is selected, show compose modal
            new ComposePromptModal(
                this.app,
                this.currentEditor,
                selection,
                this.settings,
                this.composeOperation
            ).open();
        }
    }

    // Utility function to throttle function calls
    private throttle(func: () => void, limit: number): () => void {
        let inThrottle: boolean;
        return () => {
            if (!inThrottle) {
                func();
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        }
    }
}