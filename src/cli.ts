#!/usr/bin/env node

import { Command } from "commander";
import { generateMigration } from "./commands/generateMigration";

const program = new Command();

program.name("bemi").description("CLI to Bemi utilities").version("0.1.0");

program.
  command("migration:generate").
  requiredOption("--path <path>", "Path to the migration file").
  description("Generate an SQL migration with PostgreSQL triggers in a Drizzle migration file").
  action((options) => { generateMigration(options) });

program.parseAsync(process.argv);
