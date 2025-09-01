import { Editor } from 'obsidian';

export function appendToEndOfDocument(editor: Editor, text: string): void {
	const lastLine = editor.lastLine();
	const lastLineContent = editor.getLine(lastLine);
	const endOfDocument = { line: lastLine, ch: lastLineContent.length };
	editor.setCursor(endOfDocument);
	editor.replaceRange(text, endOfDocument, endOfDocument);
}