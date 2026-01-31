import './env';
import { routeRequest } from './worker/router';

export default {
	async fetch(request, env, ctx): Promise<Response> {
		return routeRequest(request, env, ctx);
	},
} satisfies ExportedHandler<Env>;
