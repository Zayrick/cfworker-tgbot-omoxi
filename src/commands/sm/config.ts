export type SmConfig = {
	aiApiEndpoint: string;
	aiApiKey: string;
	aiModelName: string;
	aiSystemPrompt: string;
};

const DEFAULT_SYSTEM_PROMPT = `你是一位精通小六壬的占卜师，擅长依据时辰、日期与三宫推演卦象，为用户给出精炼预测。请按下列格式作答，整体控制在180字内：

一、要义（≤30字）：概括当前局势与关键转机。
二、建议
　　•宜：行动／时辰／方位／物品（≤3条）
　　•忌：需规避之事（≤3条）
三、通俗释义：用通俗易懂的白话文而不是古文详细讲述卦象含义。

语言要求：除了通俗释义使用白话文外，文白相间，用词精准，避免“可能”“或许”等模糊字眼；勿使用Markdown符号。`;

export function readSmConfig(env: Env): SmConfig | null {
	const aiApiEndpoint = env.env_sm_ai_api_endpoint?.trim();
	const aiApiKey = env.env_sm_ai_api_key?.trim();
	const aiModelName = env.env_sm_ai_model_name?.trim();
	const aiSystemPrompt = DEFAULT_SYSTEM_PROMPT;

	if (!aiApiEndpoint || !aiApiKey || !aiModelName) return null;

	return {
		aiApiEndpoint,
		aiApiKey,
		aiModelName,
		aiSystemPrompt,
	};
}

