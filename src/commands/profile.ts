import { Command } from "commander";
import inquirer from "inquirer";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const CLAUDE_DIR = path.join(os.homedir(), ".claude");
const SETTINGS_FILE = path.join(CLAUDE_DIR, "settings.json");

function getProfilePath(name: string): string {
  return path.join(CLAUDE_DIR, `settings-${name}.json`);
}

function ensureClaudeDir(): void {
  if (!fs.existsSync(CLAUDE_DIR)) {
    fs.mkdirSync(CLAUDE_DIR, { recursive: true });
  }
}

async function addProfile(name: string): Promise<void> {
  ensureClaudeDir();
  const profilePath = getProfilePath(name);

  if (fs.existsSync(profilePath)) {
    const { overwrite } = await inquirer.prompt([
      {
        type: "confirm",
        name: "overwrite",
        message: `Profile "${name}" already exists. Overwrite?`,
        default: false,
      },
    ]);
    if (!overwrite) {
      console.log("Cancelled.");
      return;
    }
  }

  const answers = await promptFields({});
  const settings = { env: answers };
  fs.writeFileSync(profilePath, JSON.stringify(settings, null, 2) + "\n");
  console.log(`Profile "${name}" saved to ${profilePath}`);
}

async function updateProfile(name: string): Promise<void> {
  const profilePath = getProfilePath(name);
  if (!fs.existsSync(profilePath)) {
    console.error(`Profile "${name}" not found at ${profilePath}`);
    process.exit(1);
  }
  const current = JSON.parse(fs.readFileSync(profilePath, "utf-8"));
  const answers = await promptFields(current.env ?? {});
  const settings = { env: answers };
  fs.writeFileSync(profilePath, JSON.stringify(settings, null, 2) + "\n");
  console.log(`Profile "${name}" updated at ${profilePath}`);
}

interface Field {
  name: string;
  message: string;
  default?: string;
}

const FIELDS: Field[] = [
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
    message: "ANTHROPIC_DEFAULT_HAIKU_MODEL — Haiku model override\n  e.g. claude-haiku-4-5-20251001",
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

async function promptFields(defaults: Record<string, string>): Promise<Record<string, string>> {
  const answers: Record<string, string> = {};
  for (const f of FIELDS) {
    const result = await inquirer.prompt([
      { type: "input", name: f.name, message: f.message, default: defaults[f.name] ?? f.default },
    ]);
    answers[f.name] = result[f.name];
  }
  return answers;
}

function deleteProfile(name: string): void {
  const profilePath = getProfilePath(name);
  if (!fs.existsSync(profilePath)) {
    console.error(`Profile "${name}" not found at ${profilePath}`);
    process.exit(1);
  }
  fs.unlinkSync(profilePath);
  console.log(`Profile "${name}" deleted.`);
}

function listProfiles(): void {
  ensureClaudeDir();
  const files = fs.readdirSync(CLAUDE_DIR);
  const profiles = files
    .filter((f) => f.startsWith("settings-") && f.endsWith(".json"))
    .map((f) => f.slice("settings-".length, -".json".length));

  if (profiles.length === 0) {
    console.log("No profiles found.");
    return;
  }

  let activeProfile: string | null = null;
  if (fs.existsSync(SETTINGS_FILE)) {
    try {
      const activeContent = fs.readFileSync(SETTINGS_FILE, "utf-8");
      for (const name of profiles) {
        const profileContent = fs.readFileSync(getProfilePath(name), "utf-8");
        if (profileContent === activeContent) {
          activeProfile = name;
          break;
        }
      }
    } catch {
      // ignore read errors
    }
  }

  for (const name of profiles.sort()) {
    const marker = name === activeProfile ? " *" : "  ";
    console.log(`${marker} ${name}`);
  }
  console.log("\n* = active");
}

function activateProfile(name: string): void {
  ensureClaudeDir();
  const profilePath = getProfilePath(name);
  if (!fs.existsSync(profilePath)) {
    console.error(`Profile "${name}" not found at ${profilePath}`);
    process.exit(1);
  }
  const content = fs.readFileSync(profilePath, "utf-8");
  fs.writeFileSync(SETTINGS_FILE, content);
  console.log(`Profile "${name}" activated. ${SETTINGS_FILE} updated.`);
}

export function registerProfileCommand(program: Command): void {
  const profile = program.command("profile").description("Manage profiles");

  profile
    .command("add <name>")
    .description("Add a new profile")
    .action((name: string) => addProfile(name));

  profile
    .command("list")
    .description("List all profiles")
    .action(() => listProfiles());

  profile
    .command("delete <name>")
    .description("Delete a profile")
    .action((name: string) => deleteProfile(name));

  profile
    .command("activate <name>")
    .description("Activate a profile")
    .action((name: string) => activateProfile(name));

  profile
    .command("update <name>")
    .description("Update an existing profile")
    .action((name: string) => updateProfile(name));
}
