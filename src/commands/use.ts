import { Command } from "commander";
import * as path from "path";
import { validateProfileName } from "../lib/validation";
import { ProfileManager } from "../lib/profile-manager";

const defaultManager = new ProfileManager();

function useProfile(name: string): void {
  const validation = validateProfileName(name);
  if (validation !== true) {
    console.error(`Invalid profile name: ${validation}`);
    process.exit(1);
  }

  const localDir = process.cwd();
  const merged = defaultManager.mergeIntoLocal(name, localDir);
  if (merged === null) {
    console.error(`Profile "${name}" not found at ${defaultManager.getProfilePath(name)}`);
    process.exit(1);
  }

  const localPath = path.join(localDir, ".claude", "settings.local.json");
  console.log(`Profile "${name}" merged into ${localPath}`);
}

export function registerUseCommand(program: Command): void {
  program
    .command("use <name>")
    .description("Merge a profile into .claude/settings.local.json in the current directory")
    .action((name: string) => useProfile(name));
}
