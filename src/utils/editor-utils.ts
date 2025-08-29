import { Editor } from 'obsidian';

export function appendToEndOfDocument(editor: Editor, text: string): void {
	const lastLine = editor.lastLine();
	const lastLineContent = editor.getLine(lastLine);
	const endOfDocument = { line: lastLine, ch: lastLineContent.length };
	editor.setCursor(endOfDocument);
	editor.replaceRange(text, endOfDocument, endOfDocument);
}

export function getCursorPosition(editor: Editor): { line: number; ch: number } {
	return editor.getCursor();
}

export function setCursorToEnd(editor: Editor): void {
	const lastLine = editor.lastLine();
	const lastLineContent = editor.getLine(lastLine);
	editor.setCursor({ line: lastLine, ch: lastLineContent.length });
}
