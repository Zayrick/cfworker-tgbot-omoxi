import { getAllCards, type TarotCard } from 'tarotap';

export type TarotOrientation = 'upright' | 'reversed';

export type TarotDeckCard = TarotCard & {
	orientation: TarotOrientation;
};

export type TarotDraw = {
	number: number;
	card: TarotDeckCard;
};

export type TarotSpread = {
	beijingTime: Date;
	timeStr: string;
	deck: TarotDeckCard[];
	drawnNumbers: number[];
	draws: TarotDraw[];
};

const FULL_DECK_SIZE = 78;

function pad2(n: number): string {
	return String(n).padStart(2, '0');
}

function getBeijingTime(nowUTC = new Date()): Date {
	return new Date(nowUTC.getTime() + 8 * 60 * 60 * 1000);
}

function randomInt(maxExclusive: number): number {
	const values = crypto.getRandomValues(new Uint32Array(1));
	return values[0]! % maxExclusive;
}

function shuffleInPlace<T>(items: T[]): T[] {
	for (let i = items.length - 1; i > 0; i -= 1) {
		const j = randomInt(i + 1);
		[items[i], items[j]] = [items[j], items[i]];
	}
	return items;
}

export function getOrientationLabel(orientation: TarotOrientation): string {
	return orientation === 'upright' ? '正位' : '逆位';
}

export function createTarotSpread(nowUTC = new Date()): TarotSpread {
	const beijingTime = getBeijingTime(nowUTC);
	const baseDeck = getAllCards('zh');
	if (baseDeck.length !== FULL_DECK_SIZE) {
		throw new Error(`tarot deck size mismatch: expected ${FULL_DECK_SIZE}, got ${baseDeck.length}`);
	}

	const deck = shuffleInPlace(
		baseDeck.map(card => ({
			...card,
			orientation: randomInt(2) === 0 ? 'upright' : 'reversed',
		} satisfies TarotDeckCard)),
	);

	const numbers = shuffleInPlace(Array.from({ length: deck.length }, (_, index) => index + 1)).slice(0, 3);
	const draws = numbers.map(number => ({
		number,
		card: deck[number - 1]!,
	}));

	const timeStr = `${beijingTime.getFullYear()}年${beijingTime.getMonth() + 1}月${beijingTime.getDate()}日 ${pad2(
		beijingTime.getHours(),
	)}:${pad2(beijingTime.getMinutes())}`;

	return { beijingTime, timeStr, deck, drawnNumbers: numbers, draws };
}

export function buildTarotPrompt(params: {
	question: string;
	referenceText?: string;
	spread: TarotSpread;
}): string {
	const parts = [
		`所问之事：${params.question}`,
		params.referenceText ? `引用内容：${params.referenceText}` : '',
		'抽牌方式：已先生成完整78张乱序塔罗牌组，并为每张牌随机赋予正位或逆位，再从1到78中随机抽取3个不重复数字对应牌位。',
		`抽牌时间：${params.spread.timeStr}`,
		`抽到数字：${params.spread.drawnNumbers.join('、')}`,
		'对应牌：',
		...params.spread.draws.map(
			(draw, index) => `${index + 1}. 第${draw.number}号 ${draw.card.name}（${getOrientationLabel(draw.card.orientation)}）`,
		),
	];

	return parts.filter(Boolean).join('\n');
}
