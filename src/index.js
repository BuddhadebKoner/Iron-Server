import { Command } from "commander";
import { readFile } from "node:fs/promises";
import { init } from "./commands/init.js";

const pkg = JSON.parse(
  await readFile(new URL("../package.json", import.meta.url), "utf8")
);

const program = new Command();

program
  .name("iron-server")
  .description(pkg.description)
  .version(pkg.version);

program
  .command("init [name]")
  .description(
    'Create a backend project. Use "." to initialize the current folder.'
  )
  .option("-l, --lang <lang>", "js or ts (skips the language prompt)")
  .option("-y, --yes", "skip the confirmation when the folder is not empty")
  .action(async (name, opts) => {
    try {
      await init(name, opts);
    } catch (err) {
      if (err?.name === "ExitPromptError") {
        console.log("\nCancelled. Nothing was created.");
        process.exit(0);
      }
      console.error("Error: " + err.message);
      process.exit(1);
    }
  });

await program.parseAsync(process.argv);
