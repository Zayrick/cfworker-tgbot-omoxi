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
		 * Optional access control filter.
		 *
		 * - env_filter_mode: off | whitelist | blacklist
		 * - env_filter_list: comma-separated numeric IDs (can include negative group IDs)
		 */
		env_filter_mode?: string;
		env_filter_list?: string;

		/**
		 * /sm (算命) command-specific configuration
		 */
		env_sm_ai_api_endpoint?: string;
		env_sm_ai_api_key?: string;
		env_sm_ai_model_name?: string;
	}
}
