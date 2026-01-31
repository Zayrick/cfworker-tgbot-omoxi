export function chunkByParagraphs(text: string, maxChunkSize: number): string[] {
	const paragraphs = text.split('\n\n');
	const chunks: string[] = [];
	let current = '';

	for (const paragraph of paragraphs) {
		const candidate = current ? `${current}\n\n${paragraph}` : paragraph;
		if (candidate.length > maxChunkSize) {
			if (current) chunks.push(current);
			current = paragraph;
		} else {
			current = candidate;
		}
	}

	if (current) chunks.push(current);
	return chunks.length > 0 ? chunks : [''];
}

