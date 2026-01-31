# tgbot-omoxi（Cloudflare Workers × Telegram Bot）

合并自 `reference/Worker-TelegramBot`（`/sm` 占卜）与 `reference/Worker-TGBot_hbnhhsh`（`/nbnhhsh` 缩写解释）的单 Worker 版本。

## 路由

所有路由都会叠加 `env_safe_path`（可选）。例如 `env_safe_path=mysecret` 时，路径会变为 `/mysecret/...`。

- `POST /<safePath>/endpoint`：Telegram Webhook
  - 必须携带请求头：`X-Telegram-Bot-Api-Secret-Token: <env_bot_secret>`
- `GET /<safePath>/registerWebhook`：调用 Telegram `setWebhook`
- `GET /<safePath>/unRegisterWebhook`：清空 Telegram Webhook

## 环境变量规范

统一使用 `env_xxxx`；某个命令专属的使用 `env_<command>_xxxx`（例如 `/sm` -> `env_sm_xxxx`）。

### 必需（全局）

- `env_bot_token`：BotFather 的 Token
- `env_bot_secret`：Webhook secret（用于请求头校验）

### 可选（全局）

- `env_safe_path`：安全路径前缀
- `env_bot_username`：机器人用户名（不含 `@`），用于解析 `/cmd@BotName`
- `env_user_whitelist`：用户白名单（逗号分隔 ID）
- `env_group_whitelist`：群组白名单（逗号分隔 ID，群组 ID 通常为负数）
- `env_user_blacklist`：用户黑名单（逗号分隔 ID，优先级最高）

### `/sm` 专属（可选，但缺失会导致 `/sm` 提示未配置）

- `env_sm_ai_api_endpoint`
- `env_sm_ai_api_key`
- `env_sm_ai_model_name`

## 添加新命令（像加“控制器”一样）

1. 新建目录：`src/commands/<name>/`
2. 新建入口：`src/commands/<name>/index.ts` 并 `export default` 一个 `BotCommand`
3. 命令的所有逻辑/请求/配置都放在该目录内（例如 `config.ts` / `services.ts` / `xxx.ts`）
4. 直接 `npm run dev` / `npm run deploy` / `npm test`

命令列表由 `scripts/generate-commands.mjs` 在运行前自动生成到 `src/bot/commands/commands.generated.ts`（扫描 `src/commands/*/index.ts`）。
