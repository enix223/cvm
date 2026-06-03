export interface Field {
  name: string;
  message: string;
  default?: string;
}

export const FIELDS: Field[] = [
  {
    name: "ANTHROPIC_AUTH_TOKEN",
    message: "ANTHROPIC_AUTH_TOKEN — Anthropic API key\n  e.g. sk-ant-api03-xxxx",
  },
  {
    name: "ANTHROPIC_BASE_URL",
    message: "ANTHROPIC_BASE_URL — Custom API endpoint\n  e.g. https://api.anthropic.com",
  },
  {
    name: "ANTHROPIC_MODEL",
    message: "ANTHROPIC_MODEL — Default model\n  e.g. claude-sonnet-4-6",
  },
  {
    name: "ANTHROPIC_DEFAULT_OPUS_MODEL",
    message: "ANTHROPIC_DEFAULT_OPUS_MODEL — Opus model override\n  e.g. claude-opus-4-7",
  },
  {
    name: "ANTHROPIC_DEFAULT_SONNET_MODEL",
    message: "ANTHROPIC_DEFAULT_SONNET_MODEL — Sonnet model override\n  e.g. claude-sonnet-4-6",
  },
  {
    name: "ANTHROPIC_DEFAULT_HAIKU_MODEL",
    message:
      "ANTHROPIC_DEFAULT_HAIKU_MODEL — Haiku model override\n  e.g. claude-haiku-4-5-20251001",
  },
  {
    name: "CLAUDE_CODE_SUBAGENT_MODEL",
    message: "CLAUDE_CODE_SUBAGENT_MODEL — Model for subagents\n  e.g. claude-haiku-4-5-20251001",
  },
  {
    name: "CLAUDE_CODE_EFFORT_LEVEL",
    message: "CLAUDE_CODE_EFFORT_LEVEL — Reasoning effort level\n  e.g. max",
    default: "max",
  },
];

export const SKIP = "__SKIP__";
