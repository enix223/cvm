import * as fs from "fs";
import * as path from "path";
import * as os from "os";

export class ProfileManager {
  readonly dir: string;
  readonly settingsFile: string;
  readonly activeFile: string;

  constructor(dir?: string) {
    this.dir = dir ?? path.join(os.homedir(), ".claude");
    this.settingsFile = path.join(this.dir, "settings.json");
    this.activeFile = path.join(this.dir, ".cvm-active");
  }

  getProfilePath(name: string): string {
    return path.join(this.dir, `settings-${name}.json`);
  }

  ensureDir(): void {
    if (!fs.existsSync(this.dir)) {
      fs.mkdirSync(this.dir, { recursive: true });
    }
  }

  readActiveProfile(): string | null {
    try {
      // Prefer the .cvm-active marker file (fast path)
      if (fs.existsSync(this.activeFile)) {
        const name = fs.readFileSync(this.activeFile, "utf-8").trim();
        if (name && fs.existsSync(this.getProfilePath(name))) {
          return name;
        }
      }

      // Fallback: compare settings.json content against each profile (migration path)
      if (fs.existsSync(this.settingsFile)) {
        const activeContent = fs.readFileSync(this.settingsFile, "utf-8");
        const files = fs.readdirSync(this.dir);
        for (const f of files) {
          if (f.startsWith("settings-") && f.endsWith(".json")) {
            const profileContent = fs.readFileSync(path.join(this.dir, f), "utf-8");
            if (profileContent === activeContent) {
              const name = f.slice("settings-".length, -".json".length);
              // Cache for next time
              this.writeActiveProfile(name);
              return name;
            }
          }
        }
      }
    } catch {
      // ignore read errors
    }
    return null;
  }

  writeActiveProfile(name: string): void {
    fs.writeFileSync(this.activeFile, name + "\n");
  }

  listProfiles(): string[] {
    this.ensureDir();
    const files = fs.readdirSync(this.dir);
    return files
      .filter((f) => f.startsWith("settings-") && f.endsWith(".json"))
      .map((f) => f.slice("settings-".length, -".json".length))
      .sort();
  }

  readProfile(name: string): Record<string, string> | null {
    const profilePath = this.getProfilePath(name);
    if (!fs.existsSync(profilePath)) return null;
    const data = JSON.parse(fs.readFileSync(profilePath, "utf-8"));
    return data.env ?? {};
  }

  writeProfile(name: string, env: Record<string, string>): void {
    this.ensureDir();
    const profilePath = this.getProfilePath(name);
    fs.writeFileSync(profilePath, JSON.stringify({ env }, null, 2) + "\n");
  }

  deleteProfileFile(name: string): boolean {
    const profilePath = this.getProfilePath(name);
    if (!fs.existsSync(profilePath)) return false;
    // Check active status BEFORE deleting — readActiveProfile needs the file to exist
    const wasActive = this.readActiveProfile() === name;
    fs.unlinkSync(profilePath);
    if (wasActive) {
      try {
        fs.unlinkSync(this.activeFile);
      } catch {
        // ignore
      }
    }
    return true;
  }

  activateProfile(name: string): boolean {
    this.ensureDir();
    const profilePath = this.getProfilePath(name);
    if (!fs.existsSync(profilePath)) return false;

    const profileData = JSON.parse(fs.readFileSync(profilePath, "utf-8"));
    const profileEnv = (profileData.env as Record<string, string>) ?? {};

    let existingData: Record<string, unknown> = {};
    if (fs.existsSync(this.settingsFile)) {
      try {
        existingData = JSON.parse(fs.readFileSync(this.settingsFile, "utf-8"));
      } catch {
        // corrupt file — start fresh
      }
    }

    const existingEnv = (existingData.env as Record<string, string>) ?? {};
    const mergedEnv = { ...existingEnv, ...profileEnv };
    const merged = { ...existingData, env: mergedEnv };
    fs.writeFileSync(this.settingsFile, JSON.stringify(merged, null, 2) + "\n");
    this.writeActiveProfile(name);
    return true;
  }

  mergeIntoLocal(name: string, localDir: string): Record<string, string> | null {
    const profileEnv = this.readProfile(name);
    if (profileEnv === null) return null;

    const localSettingsPath = path.join(localDir, ".claude", "settings.local.json");
    let existingData: Record<string, unknown> = {};

    if (fs.existsSync(localSettingsPath)) {
      try {
        existingData = JSON.parse(fs.readFileSync(localSettingsPath, "utf-8"));
      } catch {
        // corrupt file — start fresh
      }
    } else {
      const localClaudeDir = path.join(localDir, ".claude");
      if (!fs.existsSync(localClaudeDir)) {
        fs.mkdirSync(localClaudeDir, { recursive: true });
      }
    }

    const existingEnv = (existingData.env as Record<string, string>) ?? {};
    const mergedEnv = { ...existingEnv, ...profileEnv };
    const merged = { ...existingData, env: mergedEnv };
    fs.writeFileSync(localSettingsPath, JSON.stringify(merged, null, 2) + "\n");
    return mergedEnv;
  }
}
