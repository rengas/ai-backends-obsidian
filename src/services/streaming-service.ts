import { Editor, Notice } from 'obsidian';
import { StreamChunk } from '../types/responses';
import { appendToEndOfDocument } from '../utils/editor-utils';

export class StreamingService {
	async handleStreamingResponse(
		response: Response, 
		editor: Editor, 
		headerText: string, 
		successMessage: string
	): Promise<void> {
		const reader = response.body!.getReader();
		const decoder = new TextDecoder();

		// Insert header at the end of document
		appendToEndOfDocument(editor, headerText);

		let buffer = '';
		let totalContent = '';

		try {
			while (true) {
				const { done, value } = await reader.read();
				if (done) {
					break;
				}

				// Decode chunk and add to buffer
				const chunk = decoder.decode(value, { stream: true });
				buffer += chunk;

				// Try different line endings
				const lines = buffer.split(/\r?\n/);
				buffer = lines.pop() || ''; // Keep incomplete line in buffer

				for (const line of lines) {
					if (line.trim() === '') continue;

					try {
						let jsonStr = line;

						// Handle SSE format
						if (line.startsWith('data: ')) {
							jsonStr = line.slice(6).trim();
						} else if (line.startsWith('event:') || line.startsWith('id:') || line.startsWith('retry:')) {
							// Skip other SSE fields
							continue;
						}

						// Skip SSE end marker
						if (jsonStr === '[DONE]' || jsonStr === 'data: [DONE]') {
							continue;
						}

						// Skip empty or non-JSON lines
						if (!jsonStr || (!jsonStr.startsWith('{') && !jsonStr.startsWith('['))) {
							continue;
						}

						const streamData: StreamChunk = JSON.parse(jsonStr);

						// Try different possible field names for content
						const content = streamData.content || streamData.text || streamData.delta || streamData.chunk || streamData.message;

						if (content) {
							totalContent += content;

							// Small delay to ensure UI updates
							await new Promise(resolve => setTimeout(resolve, 10));

							// Get current position and append content
							const lastLine = editor.lastLine();
							const lastLineContent = editor.getLine(lastLine);
							const appendPosition = { line: lastLine, ch: lastLineContent.length };

							// Append content directly
							editor.replaceRange(content, appendPosition, appendPosition);

							// Ensure visibility
							const newLastLine = editor.lastLine();
							editor.setCursor({ line: newLastLine, ch: editor.getLine(newLastLine).length });
							editor.scrollIntoView({ from: { line: newLastLine, ch: 0 }, to: { line: newLastLine, ch: 0 } }, true);
						}

						if (streamData.done) {
							new Notice(successMessage);
							return;
						}
					} catch (parseError) {
						// Skip malformed JSON chunks
					}
				}
			}

			// Process any remaining data in buffer
			if (buffer.trim()) {
				try {
					let jsonStr = buffer.trim();
					if (jsonStr.startsWith('data: ')) {
						jsonStr = jsonStr.slice(6).trim();
					}
					if (jsonStr !== '[DONE]' && jsonStr.startsWith('{')) {
						const streamData: StreamChunk = JSON.parse(jsonStr);
						const content = streamData.content || streamData.text || streamData.delta || streamData.chunk || streamData.message;
						if (content) {
							totalContent += content;
							const lastLine = editor.lastLine();
							const lastLineContent = editor.getLine(lastLine);
							const appendPosition = { line: lastLine, ch: lastLineContent.length };
							editor.replaceRange(content, appendPosition, appendPosition);
						}
					}
				} catch (e) {
					// Skip if final buffer can't be parsed
				}
			}
		} catch (streamError) {
			new Notice('Error during streaming: ' + streamError.message);
		} finally {
			reader.releaseLock();
		}

		new Notice(successMessage);
	}
}
