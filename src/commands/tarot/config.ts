export type TarotConfig = {
	aiApiEndpoint: string;
	aiApiKey: string;
	aiModelName: string;
	aiSystemPrompt: string;
};

const DEFAULT_SYSTEM_PROMPT = `你是一位专业塔罗师，擅长根据三张塔罗牌（含正位、逆位）结合用户问题做出直接、清晰的解读。请严格按以下格式作答，整体控制在220字内：

一、核心判断（≤40字）：直接点明局势主轴。
二、逐张解读
1. 第一张：说明这张牌在此问题中的作用。
2. 第二张：说明这张牌带来的阻力、盲点或关键转折。
3. 第三张：说明后续趋势、建议或结果倾向。
三、行动建议：给出1至3条明确建议。

语言要求：使用简体中文，表达具体，不要使用Markdown符号，不要写成玄虚空话，也不要脱离给定牌面随意发挥。`;

function readTrimmed(value: unknown): string | null {
	return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function readTarotConfig(env: Env): TarotConfig | null {
	const aiApiEndpoint = readTrimmed(env.env_tarot_ai_api_endpoint) ?? readTrimmed(env.env_sm_ai_api_endpoint);
	const aiApiKey = readTrimmed(env.env_tarot_ai_api_key) ?? readTrimmed(env.env_sm_ai_api_key);
	const aiModelName = readTrimmed(env.env_tarot_ai_model_name) ?? readTrimmed(env.env_sm_ai_model_name);
	const aiSystemPrompt = DEFAULT_SYSTEM_PROMPT;

	if (!aiApiEndpoint || !aiApiKey || !aiModelName) return null;

	return {
		aiApiEndpoint,
		aiApiKey,
		aiModelName,
		aiSystemPrompt,
	};
}
