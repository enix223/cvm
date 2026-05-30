#!/usr/bin/env node
import { Command } from "commander";
import { registerProfileCommand } from "./commands/profile";

const program = new Command();

program
  .name("cvm")
  .description("Claude Code settings profile manager")
  .version("1.0.0");

registerProfileCommand(program);

program.parse();
