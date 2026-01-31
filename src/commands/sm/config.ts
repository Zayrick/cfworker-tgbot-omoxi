export type SmConfig = {
	aiApiEndpoint: string;
	aiApiKey: string;
	aiModelName: string;
	aiSystemPrompt: string;
};

const DEFAULT_SYSTEM_PROMPT =
	'你是一位专业的占卜解读者。请基于用户提供的卦象与干支信息，用简洁、可执行的建议回答。避免虚假保证，必要时提醒理性看待。';

export function readSmConfig(env: Env): SmConfig | null {
	const aiApiEndpoint = env.env_sm_ai_api_endpoint?.trim();
	const aiApiKey = env.env_sm_ai_api_key?.trim();
	const aiModelName = env.env_sm_ai_model_name?.trim();
	const aiSystemPrompt = env.env_sm_ai_system_prompt?.trim() || DEFAULT_SYSTEM_PROMPT;

	if (!aiApiEndpoint || !aiApiKey || !aiModelName) return null;

	return {
		aiApiEndpoint,
		aiApiKey,
		aiModelName,
		aiSystemPrompt,
	};
}

