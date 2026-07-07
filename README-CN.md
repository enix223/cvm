# cvm

Claude Code 设置配置管理器 — 快速切换 Claude Code 配置。

## 安装

```bash
npm install -g @cloudesk/cvm
```

## 使用方法

```
cvm profile add <name>       添加新配置（交互式提示）
cvm profile update <name>    更新已有配置（字段选择器）
cvm profile list             列出所有配置（* 表示当前激活）
cvm profile activate <name>  切换到指定配置（全局）
cvm profile show <name>      查看配置详情
cvm profile current          打印当前激活的配置名称
cvm profile duplicate <src> <dst> 复制配置
cvm profile delete <name>    删除配置
cvm use <name>               将配置合并到 .claude/settings.local.json（本地）
```

## 配置文件

配置存储为 `~/.claude/settings-<name>.json`。激活配置时会将其合并到 `~/.claude/settings.json`，Claude Code 启动时会读取该文件。

每个配置包含以下环境变量：

- `ANTHROPIC_AUTH_TOKEN`
- `ANTHROPIC_BASE_URL`
- `ANTHROPIC_MODEL`
- `ANTHROPIC_DEFAULT_OPUS_MODEL`
- `ANTHROPIC_DEFAULT_SONNET_MODEL`
- `ANTHROPIC_DEFAULT_HAIKU_MODEL`
- `CLAUDE_CODE_SUBAGENT_MODEL`
- `CLAUDE_CODE_EFFORT_LEVEL`

典型使用场景：在不同的 API 端点（自定义代理、不同区域）或不同的模型配置之间切换，无需手动编辑文件。

### 全局 vs 本地

- **`cvm profile activate <name>`** — 将配置合并到 `~/.claude/settings.json`（全局，适用于所有项目）。如果文件已存在，配置值会覆盖匹配的键，同时保留其他已有键。
- **`cvm use <name>`** — 将配置合并到当前目录的 `.claude/settings.local.json`（本地，仅限当前项目）。如果文件已存在，配置值会覆盖匹配的键，同时保留其他已有键。

## 项目结构

```
src/
├── index.ts                    # 入口文件
├── lib/
│   ├── fields.ts               # 环境变量字段定义
│   ├── validation.ts           # 配置名称验证
│   └── profile-manager.ts      # ProfileManager 类（所有文件系统操作）
└── commands/
    ├── profile.ts              # profile 子命令（add, update, list, delete, duplicate, activate, show, current）
    └── use.ts                  # use 顶级命令
```

## 开发

```bash
npm run build       # 编译到 dist/
npm run dev         # 开发模式运行（例如 npm run dev -- profile list）
npm test            # 运行测试
npm run lint        # 使用 eslint 检查
npm run format      # 使用 prettier 格式化
```

## 更新日志

### v1.3.0

- `cvm profile update` 更新活跃配置时，会自动同步更改到 `settings.json`。

### v1.2.0

- 新增 `cvm profile duplicate <source> <dest>` 命令，复制已有配置。

### v1.1.2

- `cvm profile activate` 和 `cvm use` 现在会合并配置文件中的**所有**顶层键（如 `mcpServers`、`permissions`），而不仅仅是 `env`。嵌套对象会深度合并；数组会拼接。

### v1.1.1

- `cvm profile activate` 现在合并到 `settings.json` 而非替换 — 已有的键（如 `permissions`）和非配置的环境变量会被保留。

### v1.1.0

- 新增 `cvm use <name>` 命令，将配置合并到 `.claude/settings.local.json`（项目级覆盖）。
- 添加 MIT 许可证。
- 添加中文 README。

### v1.0.0

- 初始版本：`cvm profile` 子命令（add、update、list、delete、activate、show、current）。
