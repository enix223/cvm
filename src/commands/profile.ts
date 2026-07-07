import { Command } from "commander";
import inquirer from "inquirer";
import * as fs from "fs";
import { FIELDS, SKIP } from "../lib/fields";
import { validateProfileName } from "../lib/validation";
import { ProfileManager } from "../lib/profile-manager";

// --- Interactive prompts (thin wrappers around inquirer) ---

async function promptFields(defaults: Record<string, string>): Promise<Record<string, string>> {
  const answers: Record<string, string> = {};
  for (const f of FIELDS) {
    const result = await inquirer.prompt([
      {
        type: "input",
        name: f.name,
        message: f.message,
        default: defaults[f.name] ?? f.default,
      },
    ]);
    answers[f.name] = result[f.name];
  }
  return answers;
}

async function promptFieldsSelective(
  defaults: Record<string, string>,
): Promise<Record<string, string> | typeof SKIP> {
  const { fields } = await inquirer.prompt([
    {
      type: "checkbox",
      name: "fields",
      message: "Select fields to update:",
      choices: FIELDS.map((f) => ({
        name: `${f.name}${defaults[f.name] ? ` (current: ${defaults[f.name]})` : ""}`,
        value: f.name,
        checked: false,
      })),
    },
  ]);

  if (fields.length === 0) {
    console.log("No fields selected. Nothing to update.");
    return SKIP;
  }

  const answers: Record<string, string> = {};
  for (const f of FIELDS) {
    if (fields.includes(f.name)) {
      const result = await inquirer.prompt([
        {
          type: "input",
          name: f.name,
          message: f.message,
          default: defaults[f.name] ?? f.default,
        },
      ]);
      answers[f.name] = result[f.name];
    } else {
      answers[f.name] = defaults[f.name] ?? "";
    }
  }
  return answers;
}

// --- Command implementations (use default ProfileManager) ---

const defaultManager = new ProfileManager();

async function addProfile(name: string): Promise<void> {
  const validation = validateProfileName(name);
  if (validation !== true) {
    console.error(`Invalid profile name: ${validation}`);
    process.exit(1);
  }

  defaultManager.ensureDir();
  const profilePath = defaultManager.getProfilePath(name);

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
  defaultManager.writeProfile(name, answers);
  console.log(`Profile "${name}" saved to ${profilePath}`);
}

async function updateProfile(name: string): Promise<void> {
  const validation = validateProfileName(name);
  if (validation !== true) {
    console.error(`Invalid profile name: ${validation}`);
    process.exit(1);
  }

  defaultManager.ensureDir();
  const current = defaultManager.readProfile(name);
  if (current === null) {
    console.error(`Profile "${name}" not found at ${defaultManager.getProfilePath(name)}`);
    process.exit(1);
  }
  const answers = await promptFieldsSelective(current);
  if (answers === SKIP) return;
  defaultManager.writeProfile(name, answers);
  console.log(`Profile "${name}" updated at ${defaultManager.getProfilePath(name)}`);

  // If this profile is active, sync changes to settings.json
  if (defaultManager.readActiveProfile() === name) {
    defaultManager.activateProfile(name);
    console.log(`Active profile updated. ${defaultManager.settingsFile} synced.`);
  }
}

function deleteProfile(name: string): void {
  if (!defaultManager.deleteProfileFile(name)) {
    console.error(`Profile "${name}" not found at ${defaultManager.getProfilePath(name)}`);
    process.exit(1);
  }
  console.log(`Profile "${name}" deleted.`);
}

async function duplicateProfile(source: string, dest: string): Promise<void> {
  const validation = validateProfileName(dest);
  if (validation !== true) {
    console.error(`Invalid profile name: ${validation}`);
    process.exit(1);
  }

  defaultManager.ensureDir();

  if (!defaultManager.readProfile(source)) {
    console.error(`Profile "${source}" not found at ${defaultManager.getProfilePath(source)}`);
    process.exit(1);
  }

  const destPath = defaultManager.getProfilePath(dest);
  if (fs.existsSync(destPath)) {
    const { overwrite } = await inquirer.prompt([
      {
        type: "confirm",
        name: "overwrite",
        message: `Profile "${dest}" already exists. Overwrite?`,
        default: false,
      },
    ]);
    if (!overwrite) {
      console.log("Cancelled.");
      return;
    }
  }

  defaultManager.duplicateProfile(source, dest);
  console.log(`Profile "${source}" duplicated as "${dest}".`);
}

function listProfiles(): void {
  const profiles = defaultManager.listProfiles();

  if (profiles.length === 0) {
    console.log("No profiles found.");
    return;
  }

  const activeProfile = defaultManager.readActiveProfile();

  for (const name of profiles) {
    const marker = name === activeProfile ? " *" : "  ";
    console.log(`${marker} ${name}`);
  }
  console.log("\n* = active");
}

function activateProfile(name: string): void {
  if (!defaultManager.activateProfile(name)) {
    console.error(`Profile "${name}" not found at ${defaultManager.getProfilePath(name)}`);
    process.exit(1);
  }
  console.log(`Profile "${name}" activated. ${defaultManager.settingsFile} updated.`);
}

function showProfile(name: string): void {
  defaultManager.ensureDir();
  const env = defaultManager.readProfile(name);
  if (env === null) {
    console.error(`Profile "${name}" not found at ${defaultManager.getProfilePath(name)}`);
    process.exit(1);
  }
  const active = defaultManager.readActiveProfile();

  console.log(`Profile: ${name}${active === name ? " (active)" : ""}\n`);
  for (const f of FIELDS) {
    const value = env[f.name] ?? "";
    const display = value ? value : "(not set)";
    console.log(`  ${f.name} = ${display}`);
  }
}

function showCurrent(): void {
  const active = defaultManager.readActiveProfile();
  if (active) {
    console.log(active);
  } else {
    console.log("No active profile.");
  }
}

// --- CLI registration ---

export function registerProfileCommand(program: Command): void {
  const profile = program.command("profile").description("Manage profiles");

  profile
    .command("add <name>")
    .description("Add a new profile")
    .action((name: string) => addProfile(name));

  profile
    .command("update <name>")
    .description("Update an existing profile")
    .action((name: string) => updateProfile(name));

  profile
    .command("list")
    .description("List all profiles")
    .action(() => listProfiles());

  profile
    .command("delete <name>")
    .description("Delete a profile")
    .action((name: string) => deleteProfile(name));

  profile
    .command("duplicate <source> <dest>")
    .description("Duplicate a profile")
    .action((source: string, dest: string) => duplicateProfile(source, dest));

  profile
    .command("activate <name>")
    .description("Activate a profile")
    .action((name: string) => activateProfile(name));

  profile
    .command("show <name>")
    .description("Show profile details")
    .action((name: string) => showProfile(name));

  profile
    .command("current")
    .description("Print the active profile name")
    .action(() => showCurrent());
}
