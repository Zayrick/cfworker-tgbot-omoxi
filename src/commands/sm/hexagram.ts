export function generateHexagram(numbers: number[]): string {
	const words = ['大安', '留连', '速喜', '赤口', '小吉', '空亡'];
	if (!Array.isArray(numbers) || numbers.length !== 3) {
		throw new Error('numbers 参数必须为长度为 3 的数组');
	}
	const firstIndex = numbers[0] % 6 || 6;
	const secondIndex = (numbers[0] + numbers[1] - 1) % 6 || 6;
	const thirdIndex = (numbers[0] + numbers[1] + numbers[2] - 2) % 6 || 6;
	return `${words[firstIndex - 1]} ${words[secondIndex - 1]} ${words[thirdIndex - 1]}`;
}

