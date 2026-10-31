import path from "node:path";
import fs from "node:fs/promises";
import { input, select, confirm } from "@inquirer/prompts";
import { FOLDERS, buildFiles } from "../templates.js";

const NAME_RE = /^[a-z0-9][a-z0-9-_]*$/;
const NAME_HINT = "Use lowercase letters, numbers, - or _";

const exists = (p) =>
  fs
    .stat(p)
    .then(() => true)
    .catch(() => false);

async function isNonEmptyDir(dir) {
  try {
    return (await fs.readdir(dir)).length > 0;
  } catch {
    return false;
  }
}

// Merge generated package.json into an existing one without overwriting
// anything the user already has. Returns the merged object and a change log.
function mergePackageJson(existing, generated) {
  const merged = { ...existing };
  const notes = [];

  if (merged.type !== "module") {
    notes.push(
      `set "type": "module" (was ${merged.type ? `"${merged.type}"` : "unset"})`
    );
    merged.type = "module";
  }

  for (const key of ["scripts", "dependencies", "devDependencies"]) {
    const add = generated[key] || {};
    const current = { ...(merged[key] || {}) };
    const added = [];
    const kept = [];
    for (const [k, v] of Object.entries(add)) {
      if (k in current) kept.push(k);
      else {
        current[k] = v;
        added.push(k);
      }
    }
    merged[key] = current;
    if (added.length) notes.push(`${key}: added ${added.join(", ")}`);
    if (kept.length) notes.push(`${key}: kept your existing ${kept.join(", ")}`);
  }

  return { merged, notes };
}

export async function init(nameArg, opts) {
  const inPlace = nameArg === ".";
  let name = inPlace ? path.basename(process.cwd()).toLowerCase() : nameArg;
  let lang = opts.lang;

  if (!name) {
    name = await input({
      message: "Project name:",
      default: "server",
      validate: (v) => NAME_RE.test(v) || NAME_HINT,
    });
  }
  if (!NAME_RE.test(name)) {
    throw new Error(`Invalid project name "${name}". ${NAME_HINT}`);
  }

  if (!lang) {
    lang = await select({
      message: "Language:",
      choices: [
        { name: "JavaScript", value: "js" },
        { name: "TypeScript", value: "ts" },
      ],
    });
  }
  if (!["js", "ts"].includes(lang)) {
    throw new Error(`Invalid language "${lang}". Use js or ts.`);
  }

  const dest = inPlace ? process.cwd() : path.resolve(process.cwd(), name);
  const nonEmpty = await isNonEmptyDir(dest);

  if (nonEmpty && !inPlace) {
    throw new Error(
      `Folder "${name}" already exists and is not empty. ` +
        `Use "iron-server init ." from inside it to add the structure in place.`
    );
  }

  if (inPlace && nonEmpty && !opts.yes) {
    const ok = await confirm({
      message:
        "This folder is not empty. Add the structure without overwriting existing files?",
      default: true,
    });
    if (!ok) {
      console.log("Cancelled. Nothing was changed.");
      return;
    }
  }

  const destExisted = await exists(dest);
  const createdFiles = [];
  const createdDirs = [];
  const skipped = [];
  let mergeNotes = [];

  async function mkdirTracked(dir) {
    // record each directory level we actually create
    const missing = [];
    let cur = dir;
    while (!(await exists(cur))) {
      missing.unshift(cur);
      cur = path.dirname(cur);
    }
    await fs.mkdir(dir, { recursive: true });
    createdDirs.push(...missing);
  }

  try {
    await mkdirTracked(dest);

    const files = buildFiles({ name, lang });

    // Folders
    for (const folder of FOLDERS) {
      const dir = path.join(dest, folder);
      const had = await exists(dir);
      await mkdirTracked(dir);
      if (!had) {
        const keep = path.join(dir, ".gitkeep");
        await fs.writeFile(keep, "");
        createdFiles.push(keep);
      }
    }

    // Files
    for (const [relPath, content] of Object.entries(files)) {
      const full = path.join(dest, relPath);
      await mkdirTracked(path.dirname(full));

      if (await exists(full)) {
        if (relPath === "package.json") {
          const existing = JSON.parse(await fs.readFile(full, "utf8"));
          const generated = JSON.parse(content);
          const { merged, notes } = mergePackageJson(existing, generated);
          await fs.writeFile(full, JSON.stringify(merged, null, 2) + "\n");
          mergeNotes = notes;
        } else {
          skipped.push(relPath);
        }
        continue;
      }

      await fs.writeFile(full, content);
      createdFiles.push(full);
      // folder now has a real file, drop the placeholder we created
      const keep = path.join(path.dirname(full), ".gitkeep");
      if (createdFiles.includes(keep)) {
        await fs.rm(keep, { force: true });
        createdFiles.splice(createdFiles.indexOf(keep), 1);
      }
    }
  } catch (err) {
    // clean up only what this run created
    for (const f of createdFiles) await fs.rm(f, { force: true });
    for (const d of createdDirs.reverse()) {
      await fs.rmdir(d).catch(() => {});
    }
    if (!destExisted) await fs.rm(dest, { recursive: true, force: true });
    throw err;
  }

  console.log(
    `\n${inPlace ? "Initialized" : "Created"} ${name} (${lang === "ts" ? "TypeScript" : "JavaScript"})\n`
  );

  if (mergeNotes.length) {
    console.log("package.json was merged:");
    for (const n of mergeNotes) console.log("  - " + n);
    console.log("");
  }
  if (skipped.length) {
    console.log("Skipped (already exist, left untouched):");
    for (const s of skipped) console.log("  - " + s);
    console.log("");
  }
  if (inPlace && (await exists(path.join(dest, "index.js")))) {
    console.log(
      `Note: your entry point is now server.${lang}. index.js is unused and can be deleted.\n`
    );
  }

  console.log("Next steps:");
  if (!inPlace) console.log(`  cd ${name}`);
  console.log("  npm install");
  console.log("  copy .env.sample .env     (macOS/Linux: cp .env.sample .env)");
  console.log("  npm run dev\n");
}
