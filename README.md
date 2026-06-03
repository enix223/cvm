# cvm

Claude Code settings profile manager — quickly switch between Claude Code configurations.

## Installation

```bash
npm install -g @cloudesk/cvm
```

## Usage

```
cvm profile add <name>       Add a new profile (interactive prompts)
cvm profile update <name>    Update an existing profile (field picker)
cvm profile list             List all profiles (* = active)
cvm profile activate <name>  Switch to a profile (global)
cvm profile show <name>      Show profile details
cvm profile current          Print the active profile name
cvm profile delete <name>    Delete a profile
cvm use <name>               Merge a profile into .claude/settings.local.json (local)
```

## Profiles

Profiles are stored as `~/.claude/settings-<name>.json`. Activating a profile copies it to `~/.claude/settings.json`, which Claude Code reads at startup.

Each profile captures these environment variables:

- `ANTHROPIC_AUTH_TOKEN`
- `ANTHROPIC_BASE_URL`
- `ANTHROPIC_MODEL`
- `ANTHROPIC_DEFAULT_OPUS_MODEL`
- `ANTHROPIC_DEFAULT_SONNET_MODEL`
- `ANTHROPIC_DEFAULT_HAIKU_MODEL`
- `CLAUDE_CODE_SUBAGENT_MODEL`
- `CLAUDE_CODE_EFFORT_LEVEL`

Typical use case: switching between different API endpoints (custom proxy, different regions) or different model configurations without editing files by hand.

### Global vs Local

- **`cvm profile activate <name>`** — Copies the profile to `~/.claude/settings.json` (global, applies to all projects).
- **`cvm use <name>`** — Merges the profile into `.claude/settings.local.json` in the current directory (local, project-specific). If the file already exists, profile values overwrite matching keys while preserving other existing keys.

## Project Structure

```
src/
├── index.ts                    # Entry point
├── lib/
│   ├── fields.ts               # Environment variable field definitions
│   ├── validation.ts           # Profile name validation
│   └── profile-manager.ts      # ProfileManager class (all filesystem operations)
└── commands/
    ├── profile.ts              # profile subcommands (add, update, list, delete, activate, show, current)
    └── use.ts                  # use top-level command
```

## Development

```bash
npm run build       # Compile to dist/
npm run dev         # Run in development (e.g. npm run dev -- profile list)
npm test            # Run tests
npm run lint        # Lint with eslint
npm run format      # Format with prettier
```
