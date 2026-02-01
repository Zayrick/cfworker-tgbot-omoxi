# tgbot-omoxi（Cloudflare Workers × Telegram Bot）

合并自 `reference/Worker-TelegramBot`（`/sm` 占卜）与 `reference/Worker-TGBot_hbnhhsh`（`/nbnhhsh` 缩写解释）的单 Worker 版本。

## 路由

所有路由都会叠加 `env_safe_path`（可选）。例如 `env_safe_path=mysecret` 时，路径会变为 `/mysecret/...`。

- `POST /<safePath>/endpoint`：Telegram Webhook
  - 必须携带请求头：`X-Telegram-Bot-Api-Secret-Token: <env_bot_secret>`
- `GET /<safePath>/registerWebhook`：调用 Telegram `setWebhook`
- `GET /<safePath>/unRegisterWebhook`：清空 Telegram Webhook

---

## 环境变量规范

统一使用 `env_xxxx`；某个命令专属的使用 `env_<command>_xxxx`（例如 `/sm` -> `env_sm_xxxx`）。

### 必需（全局）

| 变量 | 说明 |
|------|------|
| `env_bot_token` | BotFather 的 Token |
| `env_bot_secret` | Webhook secret（用于请求头校验） |

### 可选（全局）

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `env_safe_path` | 安全路径前缀 | 空 |
| `env_bot_username` | 机器人用户名（不含 `@`），用于解析 `/cmd@BotName` | 空 |
| `env_admin_id` | 管理员 Telegram 用户 ID（仅该用户可执行 `/admin` 命令） | 空（管理功能不可用） |
| `env_filter_mode` | 过滤模式（`off` / `whitelist` / `blacklist`），无 D1 时的静态回退 | `off` |
| `env_filter_list` | 过滤列表（逗号分隔 ID），无 D1 时的静态回退 | 空 |

> **过滤规则（env 静态回退）：**
> - `off`：不启用过滤（默认）
> - `blacklist`：命中列表中的用户 ID 或聊天/群组 ID 则拒绝处理
> - `whitelist`：仅当用户 ID 或聊天/群组 ID 命中列表才允许处理（列表为空则全部拒绝）

### `/sm` 专属（可选，但缺失会导致 `/sm` 提示未配置）

- `env_sm_ai_api_endpoint`
- `env_sm_ai_api_key`
- `env_sm_ai_model_name`

---

## Cloudflare D1 数据库

项目使用 Cloudflare D1 持久化管理员配置（黑白名单、自动删除等）。当 D1 不可用时，自动回退到环境变量中的静态 `env_filter_mode` / `env_filter_list`。

### 数据库表结构

| 表 | 说明 |
|----|------|
| `config` | 全局键值配置（如 `filter_mode`） |
| `access_list` | 按命令的黑白名单（`command_id` + `target_id`） |
| `auto_delete` | 按聊天的自动删除配置（`chat_id` + `delay_seconds`） |

`access_list` 中 `command_id = '*'` 表示全局条目，会对所有命令生效。

### 初始化步骤

```bash
# 1. 创建 D1 数据库
npx wrangler d1 create tgbot-omoxi-db

# 2. 将返回的 database_id 填入 wrangler.jsonc 的 d1_databases 配置

# 3. 执行建表脚本
npx wrangler d1 execute tgbot-omoxi-db --file=schema.sql

# 4. 设置管理员 ID（你的 Telegram 用户 ID）
npx wrangler secret put env_admin_id
```

---

## 管理员命令（`/admin`）

仅 `env_admin_id` 对应的用户可执行，对普通用户不可见（不出现在帮助文本和元数据接口中）。需要 D1 数据库可用。

### 子命令一览

| 命令 | 说明 |
|------|------|
| `/admin help` | 显示管理命令帮助 |
| `/admin mode <off\|whitelist\|blacklist>` | 设置过滤模式（持久化到 D1） |
| `/admin add <id> [command]` | 将用户/群组 ID 添加到名单。不指定 `command` 时同时添加到全局（`*`）和所有已注册命令 |
| `/admin remove <id> [command]` | 从名单移除。不指定 `command` 时从全局和所有命令中移除 |
| `/admin list [command]` | 查看名单。可选按命令过滤 |
| `/admin autodelete <seconds>` | 设置当前聊天中 Bot 回复的自动删除延迟（单位：秒，`0` = 关闭） |
| `/admin status` | 查看当前配置概况（过滤模式、名单条目数、本群自动删除设置） |

### 使用示例

```
# 切换到白名单模式
/admin mode whitelist

# 将用户 123456 添加到所有命令的白名单
/admin add 123456

# 仅允许用户 789 使用 /sm 命令
/admin add 789 sm

# 从名单中移除用户 123456（全局+所有命令）
/admin remove 123456

# 查看 sm 命令的名单
/admin list sm

# 在当前群聊中设置 Bot 回复 120 秒后自动删除
/admin autodelete 120

# 关闭当前群聊的自动删除
/admin autodelete 0

# 查看配置
/admin status
```

### 访问控制逻辑

1. 每条消息先做**全局检查**（`command_id = '*'`）
2. 匹配到具体命令后再做**命令级检查**（`command_id = 'sm'` 等）
3. 黑名单模式：命中任一条目即拒绝
4. 白名单模式：需要在对应条目中才允许

### 自动删除

- 管理员通过 `/admin autodelete <seconds>` 为当前聊天设置延迟
- Bot 发出的所有回复消息（包括帮助文本、未知命令提示等）会在指定秒数后自动删除
- 通过 `ctx.waitUntil` + `setTimeout` 实现，不阻塞请求响应

---

## 添加新命令（像加"控制器"一样）

1. 新建目录：`src/commands/<name>/`
2. 新建入口：`src/commands/<name>/index.ts` 并 `export default` 一个 `BotCommand`
3. 命令的所有逻辑/请求/配置都放在该目录内（例如 `config.ts` / `services.ts` / `xxx.ts`）
4. 直接 `npm run dev` / `npm run deploy` / `npm test`

命令列表由 `scripts/generate-commands.mjs` 在运行前自动生成到 `src/bot/generated/commands.generated.ts`（扫描 `src/commands/*/index.ts`）。

新命令会自动纳入访问控制体系：管理员通过 `/admin add <id> <command_id>` 即可为新命令单独配置黑白名单。

---

## 项目结构

```
src/
├── index.ts                          # Worker 入口
├── env.ts                            # 环境变量类型声明
├── config/
│   └── botConfig.ts                  # 配置解析与归一化
├── bot/
│   ├── index.ts                      # 公共导出
│   ├── context.ts                    # BotContext 类型（env, bot, telegram, db, adminId, waitUntil）
│   ├── core/
│   │   ├── bot.ts                    # 核心 Bot 类（分发、访问控制、自动删除）
│   │   ├── command.ts                # BotCommand 接口
│   │   ├── parseCommand.ts           # 命令解析器
│   │   └── accessControl.ts          # 访问控制（同步回退 + 异步 D1）
│   ├── generated/
│   │   └── commands.generated.ts     # 自动生成的命令导入
│   └── telegram/
│       ├── types.ts                  # Telegram API 类型
│       └── text.ts                   # 消息文本提取
├── commands/
│   ├── admin/                        # 管理员命令
│   │   └── index.ts
│   ├── sm/                           # 占卜命令
│   │   ├── index.ts
│   │   ├── config.ts
│   │   ├── ai.ts
│   │   ├── divination.ts
│   │   └── hexagram.ts
│   └── nbnhhsh/                      # 缩写解释命令
│       ├── index.ts
│       ├── nbnhhsh.ts
│       └── chunk.ts
├── services/
│   ├── telegram.ts                   # Telegram API 客户端
│   └── db.ts                         # D1 数据库操作层
├── utils/
│   └── html.ts                       # HTML 转义
└── worker/
    └── router.ts                     # HTTP 路由 & Webhook 处理
schema.sql                            # D1 建表脚本
```
