# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Dev Commands

- `npm run build` — Compile with tsup (CJS + .dts) to `dist/`
- `npm run dev` — Run CLI in development via tsx (e.g. `npm run dev -- profile list`)
- `npm test` — Run tests with vitest
- `npm run test:watch` — Run tests in watch mode
- `npm run lint` — Run eslint
- `npm run lint:fix` — Auto-fix lint issues
- `npm run format` — Format code with prettier

## Architecture

This is a small CLI (`cvm`) for managing Claude Code settings profiles.

### Source structure

- **`src/index.ts`** — Entry point. Sets up the commander program, reads version from `package.json`, registers commands.
- **`src/lib/`** — Shared, reusable modules:
  - `fields.ts` — `FIELDS` array (env var definitions), `Field` interface, `SKIP` sentinel
  - `validation.ts` — `validateProfileName()` function
  - `profile-manager.ts` — `ProfileManager` class (all filesystem operations)
- **`src/commands/`** — CLI command implementations:
  - `profile.ts` — `profile` subcommand group (add, update, list, delete, duplicate, activate, show, current)
  - `use.ts` — `use` top-level command

### ProfileManager class

Core logic lives in `ProfileManager` (`src/lib/profile-manager.ts`), which takes an optional directory in its constructor (defaults to `~/.claude`). This makes it testable with temp directories. The class handles: reading/writing profiles, duplicating profiles, active profile tracking, directory creation, profile deletion, and merging into local settings.

### Commands

`profile add`, `profile update`, `profile list`, `profile delete`, `profile duplicate`, `profile activate`, `profile show`, `profile current` — registered under the `profile` subcommand via `registerProfileCommand()`.

`use <name>` — Top-level command. Merges a profile into `.claude/settings.local.json` in the current working directory (project-local override). Shallow-merges env keys: profile values overwrite, existing keys not in the profile are preserved.

### Profile data

Profile data lives in `~/.claude/`:
- Each profile is stored as `~/.claude/settings-<name>.json` in Claude Code's native `settings.json` format (`{ "env": { ... } }`).
- Activating a profile copies its file to `~/.claude/settings.json`, which Claude Code reads at startup.
- Active profile is tracked via `~/.claude/.cvm-active` (fast path). Falls back to content comparison for migration from older versions.
- Profile names are validated: `[a-zA-Z0-9_-]+` only, "settings" is reserved.

## Dependencies

- **commander** — CLI framework
- **inquirer** — Interactive prompts for profile add/update flows

## Key Implementation Details

- `ProfileManager.ensureDir()` creates `~/.claude` on demand if missing. Called by all commands that touch the filesystem.
- `ProfileManager.mergeIntoLocal(name, localDir)` handles the `use` command logic: reads a profile, reads existing `.claude/settings.local.json` (if any), shallow-merges (profile wins), writes back. Preserves non-env keys (e.g. `permissions`). Creates `.claude/` in localDir if missing.
- The `FIELDS` array in `src/lib/fields.ts` defines the environment variables each profile captures. To add a new field, add an entry there.
- `update` uses a checkbox picker to select which fields to change, rather than prompting all fields.
- Tests import from `src/lib/` directly and use temp directories via `new ProfileManager(tmpDir)` — never touch the real `~/.claude`.
