export type ChatCompletionConfig = {
	apiEndpoint: string;
	apiKey: string;
	modelName: string;
	systemPrompt: string;
};

type ChatCompletionResponse = {
	choices?: Array<{
		message?: { content?: string };
	}>;
};

export async function callChatCompletion(config: ChatCompletionConfig, userPrompt: string): Promise<string> {
	const payload = {
		model: config.modelName,
		messages: [
			{ role: 'system', content: config.systemPrompt },
			{ role: 'user', content: userPrompt },
		],
		stream: false,
	};

	const response = await fetch(config.apiEndpoint, {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			authorization: `Bearer ${config.apiKey}`,
		},
		body: JSON.stringify(payload),
	});

	if (!response.ok) {
		throw new Error(`AI request failed: ${response.status}`);
	}

	const data = (await response.json()) as ChatCompletionResponse;
	const content = data.choices?.[0]?.message?.content?.trim() ?? '';
	if (!content) throw new Error('AI response missing content');
	return content;
}

