import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { validateProfileName } from "../lib/validation";
import { ProfileManager } from "../lib/profile-manager";

describe("validateProfileName", () => {
  it("accepts valid names", () => {
    expect(validateProfileName("my-profile")).toBe(true);
    expect(validateProfileName("work")).toBe(true);
    expect(validateProfileName("dev_2")).toBe(true);
    expect(validateProfileName("A-B_C1")).toBe(true);
  });

  it("rejects names with special characters", () => {
    expect(typeof validateProfileName("../evil")).toBe("string");
    expect(typeof validateProfileName("my profile")).toBe("string");
    expect(typeof validateProfileName("a.b")).toBe("string");
    expect(typeof validateProfileName("")).toBe("string");
    expect(typeof validateProfileName("a/b")).toBe("string");
  });

  it("rejects the reserved name 'settings'", () => {
    expect(validateProfileName("settings")).not.toBe(true);
  });
});

describe("ProfileManager", () => {
  let tmpDir: string;
  let pm: ProfileManager;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "cvm-test-"));
    pm = new ProfileManager(tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe("ensureDir", () => {
    it("creates the directory if missing", () => {
      const subDir = path.join(tmpDir, "nested");
      const nested = new ProfileManager(subDir);
      nested.ensureDir();
      expect(fs.existsSync(subDir)).toBe(true);
    });

    it("does not throw if directory already exists", () => {
      pm.ensureDir();
      pm.ensureDir(); // second call
      expect(fs.existsSync(tmpDir)).toBe(true);
    });
  });

  describe("writeProfile / readProfile", () => {
    it("round-trips profile data", () => {
      const env = { ANTHROPIC_AUTH_TOKEN: "sk-test", ANTHROPIC_MODEL: "claude-sonnet-4-6" };
      pm.writeProfile("work", env);
      const result = pm.readProfile("work");
      expect(result).toEqual(env);
    });

    it("returns null for non-existent profile", () => {
      expect(pm.readProfile("nope")).toBeNull();
    });

    it("creates the directory on write if missing", () => {
      const subDir = path.join(tmpDir, "auto-create");
      const auto = new ProfileManager(subDir);
      auto.writeProfile("test", { KEY: "value" });
      expect(auto.readProfile("test")).toEqual({ KEY: "value" });
    });
  });

  describe("listProfiles", () => {
    it("returns empty array when no profiles exist", () => {
      expect(pm.listProfiles()).toEqual([]);
    });

    it("lists profile names sorted", () => {
      pm.writeProfile("zebra", {});
      pm.writeProfile("alpha", {});
      pm.writeProfile("middle", {});
      expect(pm.listProfiles()).toEqual(["alpha", "middle", "zebra"]);
    });

    it("ignores non-profile files", () => {
      pm.writeProfile("real", {});
      fs.writeFileSync(path.join(tmpDir, "other.json"), "{}");
      fs.writeFileSync(path.join(tmpDir, "settings.json"), "{}");
      expect(pm.listProfiles()).toEqual(["real"]);
    });
  });

  describe("deleteProfileFile", () => {
    it("deletes an existing profile", () => {
      pm.writeProfile("doomed", {});
      expect(pm.deleteProfileFile("doomed")).toBe(true);
      expect(pm.readProfile("doomed")).toBeNull();
    });

    it("returns false for non-existent profile", () => {
      expect(pm.deleteProfileFile("nope")).toBe(false);
    });

    it("clears active marker if deleting the active profile", () => {
      pm.writeProfile("active-one", {});
      pm.activateProfile("active-one");
      expect(pm.readActiveProfile()).toBe("active-one");

      pm.deleteProfileFile("active-one");
      // Active marker should be gone
      expect(fs.existsSync(pm.activeFile)).toBe(false);
    });
  });

  describe("duplicateProfile", () => {
    it("copies profile data from source to dest", () => {
      const env = { ANTHROPIC_AUTH_TOKEN: "sk-test", ANTHROPIC_MODEL: "opus" };
      pm.writeProfile("source", env);

      expect(pm.duplicateProfile("source", "dest")).toBe(true);
      expect(pm.readProfile("dest")).toEqual(env);
    });

    it("returns false for non-existent source", () => {
      expect(pm.duplicateProfile("nope", "dest")).toBe(false);
    });

    it("creates an independent copy", () => {
      pm.writeProfile("src", { KEY: "original" });
      pm.duplicateProfile("src", "copy");

      pm.writeProfile("copy", { KEY: "modified" });
      expect(pm.readProfile("src")).toEqual({ KEY: "original" });
    });

    it("overwrites existing destination profile", () => {
      pm.writeProfile("src", { KEY: "new" });
      pm.writeProfile("dst", { KEY: "old" });

      pm.duplicateProfile("src", "dst");
      expect(pm.readProfile("dst")).toEqual({ KEY: "new" });
    });
  });

  describe("activateProfile / readActiveProfile", () => {
    it("activates a profile and writes settings.json", () => {
      const env = { ANTHROPIC_AUTH_TOKEN: "sk-123" };
      pm.writeProfile("prod", env);

      expect(pm.activateProfile("prod")).toBe(true);

      const settingsContent = JSON.parse(fs.readFileSync(pm.settingsFile, "utf-8"));
      expect(settingsContent.env).toEqual(env);
      expect(pm.readActiveProfile()).toBe("prod");
    });

    it("returns false for non-existent profile", () => {
      expect(pm.activateProfile("nope")).toBe(false);
    });

    it("tracks active profile across calls", () => {
      pm.writeProfile("a", {});
      pm.writeProfile("b", {});
      pm.activateProfile("a");
      expect(pm.readActiveProfile()).toBe("a");
      pm.activateProfile("b");
      expect(pm.readActiveProfile()).toBe("b");
    });

    it("preserves existing non-env keys in settings.json", () => {
      pm.writeProfile("p1", { TOKEN: "abc" });
      // Pre-populate settings.json with permissions and an unrelated env key
      fs.writeFileSync(
        pm.settingsFile,
        JSON.stringify(
          { permissions: { allow: ["Bash(git:*)"], }, env: { MODEL: "opus" } },
          null,
          2,
        ) + "\n",
      );

      pm.activateProfile("p1");

      const result = JSON.parse(fs.readFileSync(pm.settingsFile, "utf-8"));
      expect(result.permissions).toEqual({ allow: ["Bash(git:*)"], });
      // profile env wins over existing env key
      expect(result.env).toEqual({ MODEL: "opus", TOKEN: "abc" });
    });

    it("merges mcpServers from profile with existing mcpServers", () => {
      // Profile with mcpServers manually added
      const profilePath = pm.getProfilePath("work");
      fs.writeFileSync(
        profilePath,
        JSON.stringify(
          {
            env: { ANTHROPIC_AUTH_TOKEN: "sk-new" },
            mcpServers: { serverA: { command: "node", args: ["a.js"] } },
          },
          null,
          2,
        ) + "\n",
      );

      // Existing settings with different mcpServers
      fs.writeFileSync(
        pm.settingsFile,
        JSON.stringify(
          {
            env: { EXISTING: "val" },
            mcpServers: { serverB: { command: "python", args: ["b.py"] } },
          },
          null,
          2,
        ) + "\n",
      );

      pm.activateProfile("work");

      const result = JSON.parse(fs.readFileSync(pm.settingsFile, "utf-8"));
      // Both servers should be present
      expect(result.mcpServers.serverA).toEqual({ command: "node", args: ["a.js"] });
      expect(result.mcpServers.serverB).toEqual({ command: "python", args: ["b.py"] });
      // Env merged too
      expect(result.env).toEqual({ EXISTING: "val", ANTHROPIC_AUTH_TOKEN: "sk-new" });
    });

    it("profile mcpServers keys override existing mcpServers keys", () => {
      const profilePath = pm.getProfilePath("work");
      fs.writeFileSync(
        profilePath,
        JSON.stringify(
          {
            env: {},
            mcpServers: { shared: { command: "new-cmd", args: [] } },
          },
          null,
          2,
        ) + "\n",
      );

      fs.writeFileSync(
        pm.settingsFile,
        JSON.stringify(
          {
            env: {},
            mcpServers: { shared: { command: "old-cmd", args: ["old"] } },
          },
          null,
          2,
        ) + "\n",
      );

      pm.activateProfile("work");

      const result = JSON.parse(fs.readFileSync(pm.settingsFile, "utf-8"));
      // Profile wins on scalar conflict; arrays concatenate
      expect(result.mcpServers.shared).toEqual({ command: "new-cmd", args: ["old"] });
    });

    it("concatenates arrays from profile and existing settings", () => {
      const profilePath = pm.getProfilePath("p1");
      fs.writeFileSync(
        profilePath,
        JSON.stringify(
          {
            env: {},
            permissions: { allow: ["Bash(npm test *)"] },
          },
          null,
          2,
        ) + "\n",
      );

      fs.writeFileSync(
        pm.settingsFile,
        JSON.stringify(
          {
            env: {},
            permissions: { allow: ["Bash(git:*)"] },
          },
          null,
          2,
        ) + "\n",
      );

      pm.activateProfile("p1");

      const result = JSON.parse(fs.readFileSync(pm.settingsFile, "utf-8"));
      // Arrays are concatenated
      expect(result.permissions.allow).toEqual(["Bash(git:*)", "Bash(npm test *)"]);
    });

    it("falls back to content comparison when .cvm-active is missing", () => {
      pm.writeProfile("legacy", { KEY: "val" });
      // Manually write settings.json using same format as writeProfile
      fs.writeFileSync(
        pm.settingsFile,
        JSON.stringify({ env: { KEY: "val" } }, null, 2) + "\n",
      );

      // Remove .cvm-active if it exists
      if (fs.existsSync(pm.activeFile)) fs.unlinkSync(pm.activeFile);

      expect(pm.readActiveProfile()).toBe("legacy");
      // Should have cached it
      expect(fs.readFileSync(pm.activeFile, "utf-8").trim()).toBe("legacy");
    });
  });

  describe("getProfilePath", () => {
    it("returns correct path", () => {
      expect(pm.getProfilePath("work")).toBe(path.join(tmpDir, "settings-work.json"));
    });
  });

  describe("mergeIntoLocal", () => {
    let localDir: string;

    beforeEach(() => {
      localDir = fs.mkdtempSync(path.join(os.tmpdir(), "cvm-local-"));
    });

    afterEach(() => {
      fs.rmSync(localDir, { recursive: true, force: true });
    });

    it("creates settings.local.json when it does not exist", () => {
      pm.writeProfile("work", { ANTHROPIC_AUTH_TOKEN: "sk-123" });
      const merged = pm.mergeIntoLocal("work", localDir);

      expect(merged).toEqual({ ANTHROPIC_AUTH_TOKEN: "sk-123" });

      const localPath = path.join(localDir, ".claude", "settings.local.json");
      expect(fs.existsSync(localPath)).toBe(true);
      const content = JSON.parse(fs.readFileSync(localPath, "utf-8"));
      expect(content.env).toEqual({ ANTHROPIC_AUTH_TOKEN: "sk-123" });
    });

    it("merges profile into existing settings.local.json", () => {
      pm.writeProfile("work", { ANTHROPIC_AUTH_TOKEN: "sk-new", ANTHROPIC_MODEL: "opus" });

      const localClaude = path.join(localDir, ".claude");
      fs.mkdirSync(localClaude, { recursive: true });
      fs.writeFileSync(
        path.join(localClaude, "settings.local.json"),
        JSON.stringify({ env: { ANTHROPIC_AUTH_TOKEN: "sk-old", CUSTOM_KEY: "keep" } }, null, 2) + "\n",
      );

      const merged = pm.mergeIntoLocal("work", localDir);

      expect(merged).toEqual({
        ANTHROPIC_AUTH_TOKEN: "sk-new", // overwritten by profile
        ANTHROPIC_MODEL: "opus",        // added from profile
        CUSTOM_KEY: "keep",             // preserved from existing
      });
    });

    it("preserves non-env keys (e.g. permissions)", () => {
      pm.writeProfile("work", { ANTHROPIC_AUTH_TOKEN: "sk-123" });

      const localClaude = path.join(localDir, ".claude");
      fs.mkdirSync(localClaude, { recursive: true });
      fs.writeFileSync(
        path.join(localClaude, "settings.local.json"),
        JSON.stringify({
          permissions: { allow: ["Bash(npm test *)"] },
          env: { EXISTING: "val" },
        }, null, 2) + "\n",
      );

      pm.mergeIntoLocal("work", localDir);

      const localPath = path.join(localDir, ".claude", "settings.local.json");
      const content = JSON.parse(fs.readFileSync(localPath, "utf-8"));
      expect(content.permissions).toEqual({ allow: ["Bash(npm test *)"] });
      expect(content.env).toEqual({
        EXISTING: "val",
        ANTHROPIC_AUTH_TOKEN: "sk-123",
      });
    });

    it("returns null for non-existent profile", () => {
      expect(pm.mergeIntoLocal("nope", localDir)).toBeNull();
    });

    it("creates .claude directory if missing", () => {
      pm.writeProfile("test", { KEY: "val" });
      pm.mergeIntoLocal("test", localDir);
      expect(fs.existsSync(path.join(localDir, ".claude"))).toBe(true);
    });

    it("merges non-env keys (e.g. mcpServers) into local settings", () => {
      // Profile with mcpServers manually added
      const profilePath = pm.getProfilePath("work");
      fs.writeFileSync(
        profilePath,
        JSON.stringify(
          {
            env: { ANTHROPIC_AUTH_TOKEN: "sk-123" },
            mcpServers: { myServer: { command: "node", args: ["server.js"] } },
          },
          null,
          2,
        ) + "\n",
      );

      const localClaude = path.join(localDir, ".claude");
      fs.mkdirSync(localClaude, { recursive: true });
      fs.writeFileSync(
        path.join(localClaude, "settings.local.json"),
        JSON.stringify(
          {
            env: { EXISTING: "val" },
            mcpServers: { otherServer: { command: "python", args: ["run.py"] } },
          },
          null,
          2,
        ) + "\n",
      );

      pm.mergeIntoLocal("work", localDir);

      const localPath = path.join(localDir, ".claude", "settings.local.json");
      const content = JSON.parse(fs.readFileSync(localPath, "utf-8"));
      // Both servers present
      expect(content.mcpServers.myServer).toEqual({ command: "node", args: ["server.js"] });
      expect(content.mcpServers.otherServer).toEqual({ command: "python", args: ["run.py"] });
      // Env merged
      expect(content.env).toEqual({ EXISTING: "val", ANTHROPIC_AUTH_TOKEN: "sk-123" });
    });
  });
});
