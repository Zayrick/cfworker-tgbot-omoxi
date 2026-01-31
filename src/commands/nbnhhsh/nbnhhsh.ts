export type NbnhhshTag = {
	name: string;
	trans?: string[] | null;
	inputting?: string[];
};

const API_GUESS_URL = 'https://lab.magiconch.com/api/nbnhhsh/guess';

export function extractAbbreviations(input: string): string[] {
	const matches = input.match(/[a-z0-9]{2,}/gi);
	return matches ? matches : [];
}

export async function guessNbnhhsh(text: string): Promise<NbnhhshTag[]> {
	const abbreviations = extractAbbreviations(text);
	if (abbreviations.length === 0) return [];

	const response = await fetch(API_GUESS_URL, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ text: abbreviations.join(',') }),
	});

	if (!response.ok) {
		throw new Error(`nbnhhsh guess failed: ${response.status}`);
	}

	const data = (await response.json()) as unknown;
	if (!Array.isArray(data)) return [];
	return data as NbnhhshTag[];
}

export type ArrangedTran = { text: string; sub?: string };

export function arrangeTrans(trans: string[]): ArrangedTran[] {
	return trans.map(tran => {
		const match = tran.match(/^(.+?)([（(](.+?)[）)])?$/);
		if (match?.[1] && match[3]) return { text: match[1], sub: match[3] };
		return { text: tran };
	});
}

