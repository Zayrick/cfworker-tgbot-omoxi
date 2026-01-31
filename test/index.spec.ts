import { env, createExecutionContext, waitOnExecutionContext, SELF } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import worker from '../src/index';

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe('tgbot-omoxi worker', () => {
	it('responds with metadata (unit style)', async () => {
		const request = new IncomingRequest('http://example.com/');
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(await response.json()).toMatchInlineSnapshot(`
			{
			  "commands": [
			    {
			      "description": "解释缩写（能不能好好说话）",
			      "id": "nbnhhsh",
			      "triggers": [
			        "/nbnhhsh",
			      ],
			    },
			    {
			      "description": "小六壬占卜（/sm）",
			      "id": "sm",
			      "triggers": [
			        "/sm",
			        "/算命",
			      ],
			    },
			  ],
			  "name": "tgbot-omoxi",
			  "ok": true,
			  "routes": {
			    "registerWebhook": "/<safePath>/registerWebhook",
			    "unregisterWebhook": "/<safePath>/unRegisterWebhook",
			    "webhook": "/<safePath>/endpoint",
			  },
			}
		`);
	});

	it('responds with metadata (integration style)', async () => {
		const response = await SELF.fetch('https://example.com/');
		expect(await response.json()).toMatchInlineSnapshot(`
			{
			  "commands": [
			    {
			      "description": "解释缩写（能不能好好说话）",
			      "id": "nbnhhsh",
			      "triggers": [
			        "/nbnhhsh",
			      ],
			    },
			    {
			      "description": "小六壬占卜（/sm）",
			      "id": "sm",
			      "triggers": [
			        "/sm",
			        "/算命",
			      ],
			    },
			  ],
			  "name": "tgbot-omoxi",
			  "ok": true,
			  "routes": {
			    "registerWebhook": "/<safePath>/registerWebhook",
			    "unregisterWebhook": "/<safePath>/unRegisterWebhook",
			    "webhook": "/<safePath>/endpoint",
			  },
			}
		`);
	});
});
