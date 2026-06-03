#!/usr/bin/env node
import { Command } from "commander";
import { registerProfileCommand } from "./commands/profile";
import { registerUseCommand } from "./commands/use";
import { readFileSync } from "fs";
import { resolve } from "path";

const pkg = JSON.parse(readFileSync(resolve(__dirname, "../package.json"), "utf-8"));

const program = new Command();

program.name("cvm").description("Claude Code settings profile manager").version(pkg.version);

registerProfileCommand(program);
registerUseCommand(program);

program.parse();
