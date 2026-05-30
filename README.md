# cvm

Claude Code settings profile manager — quickly switch between Claude Code configurations.

## Installation

```bash
npm install -g @cloudesk/cvm
```

## Usage

```
cvm profile add <name>       Add a new profile (interactive prompts)
cvm profile update <name>    Update a existing profile (interactive prompts)
cvm profile list             List all profiles
cvm profile activate <name>  Switch to a profile
cvm profile delete <name>    Delete a profile
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
