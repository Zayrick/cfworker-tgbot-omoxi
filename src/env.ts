export {};

declare global {
	interface Env {
		/**
		 * Allow command modules to add `env_<command>_*` without changing core types.
		 */
		[key: string]: unknown;

		/**
		 * Telegram Bot Token (from @BotFather)
		 */
		env_bot_token?: string;
		/**
		 * Webhook secret token (for X-Telegram-Bot-Api-Secret-Token validation)
		 */
		env_bot_secret?: string;

		/**
		 * Optional safe path prefix (e.g. "mysecret" -> routes become "/mysecret/...")
		 */
		env_safe_path?: string;
		/**
		 * Optional bot username (without "@") for parsing "/cmd@BotName"
		 */
		env_bot_username?: string;

		/**
		 * Optional access control filter (env-based fallback when D1 is unavailable).
		 *
		 * - env_filter_mode: off | whitelist | blacklist
		 * - env_filter_list: comma-separated numeric IDs (can include negative group IDs)
		 */
		env_filter_mode?: string;
		env_filter_list?: string;

		/**
		 * Admin Telegram user ID. Only this user can execute /admin commands.
		 */
		env_admin_id?: string;

		/**
		 * Cloudflare D1 database binding for persistent configuration.
		 */
		DB?: D1Database;

		/**
		 * /sm (算命) command-specific configuration
		 */
		env_sm_ai_api_endpoint?: string;
		env_sm_ai_api_key?: string;
		env_sm_ai_model_name?: string;
	}
}
