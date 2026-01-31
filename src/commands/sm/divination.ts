import { Lunar } from 'lunar-javascript';
import { generateHexagram } from './hexagram';

export type Divination = {
	beijingTime: Date;
	ganzhi: string;
	hexagram: string;
	timeStr: string;
};

function pad2(n: number): string {
	return String(n).padStart(2, '0');
}

function getFullBazi(date: Date): string {
	const lunar = Lunar.fromDate(date);
	return `${lunar.getYearInGanZhi()}年 ${lunar.getMonthInGanZhi()}月 ${lunar.getDayInGanZhi()}日 ${lunar.getTimeInGanZhi()}时`;
}

function getBeijingTime(nowUTC = new Date()): Date {
	return new Date(nowUTC.getTime() + 8 * 60 * 60 * 1000);
}

export function createDivination(nowUTC = new Date()): Divination {
	const beijingTime = getBeijingTime(nowUTC);
	const ganzhi = getFullBazi(beijingTime);

	const randomArray = crypto.getRandomValues(new Uint32Array(3));
	const hexagram = generateHexagram(Array.from(randomArray, n => (n % 6) + 1));

	const timeStr = `${beijingTime.getFullYear()}年${beijingTime.getMonth() + 1}月${beijingTime.getDate()}日 ${pad2(
		beijingTime.getHours(),
	)}:${pad2(beijingTime.getMinutes())}`;

	return { beijingTime, ganzhi, hexagram, timeStr };
}

export function buildDivinationPrompt(params: {
	question: string;
	referenceText?: string;
	divination: Divination;
}): string {
	const base = `所问之事：${params.question}\n所得之卦：${params.divination.hexagram}\n所占之时：${params.divination.ganzhi}\n所测之刻：${params.divination.timeStr}`;
	return params.referenceText ? `${params.referenceText}\n${base}` : base;
}

