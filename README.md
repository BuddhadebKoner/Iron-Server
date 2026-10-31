# iron-server

Scaffold a clean, layered Node.js backend with one command. No more creating the same folders and files by hand for every new project.

```bash
npx @buddhadebkoner/iron-server init my-api
```

- Creates a ready-to-run **Express 5** server in **JavaScript or TypeScript**
- One folder per layer, one naming convention: `<name>.<layer>.<ext>`
- Works in a **new folder** or **inside an existing folder** (`init .`) without overwriting anything
- Never runs `npm install` for you and never writes a lockfile

---

## Table of contents

1. [Quick start](#quick-start)
2. [Installation options](#installation-options)
3. [Command reference](#command-reference)
4. [What gets generated](#what-gets-generated)
5. [Folder guide](#folder-guide)
6. [Naming convention](#naming-convention)
7. [JavaScript vs TypeScript](#javascript-vs-typescript)
8. [Using it in an existing folder](#using-it-in-an-existing-folder)
9. [Generated scripts](#generated-scripts)
10. [Docker and health check](#docker-and-health-check)
11. [Safety guarantees](#safety-guarantees)
12. [Troubleshooting](#troubleshooting)
13. [Roadmap](#roadmap)
14. [Contributing and releases](#contributing-and-releases)
15. [License](#license)

---

## Quick start

Requires **Node.js 18 or newer**.

```bash
# 1. Create the project
npx @buddhadebkoner/iron-server init my-api

# 2. Install dependencies (iron-server never does this for you)
cd my-api
npm install

# 3. Create your env file
cp .env.sample .env        # Windows PowerShell: copy .env.sample .env

# 4. Start in development mode
npm run dev
```

Open `http://localhost:5000/health`. You should see:

```json
{ "status": "ok" }
```

---

## Installation options

### Option 1: No install (recommended for trying it)

```bash
npx @buddhadebkoner/iron-server init my-api
```

Use `@latest` if you want to be sure you get the newest version and not a cached one:

```bash
npx --yes @buddhadebkoner/iron-server@latest init my-api
```

### Option 2: Global install (recommended for daily use)

```bash
npm i -g @buddhadebkoner/iron-server
iron-server init my-api
```

The short command is `iron-server`. Update with:

```bash
npm i -g @buddhadebkoner/iron-server@latest
```

> Do not install it as a dependency inside a project (`npm i @buddhadebkoner/iron-server`). It is a tool, not a library. Use `npx` or the global install.

---

## Command reference

```text
iron-server init [name] [options]
```

| Argument / option    | Description                                                                |
| -------------------- | -------------------------------------------------------------------------- |
| `[name]`             | Project folder to create. Lowercase letters, numbers, `-` and `_` only.    |
| `.` (as the name)    | Initialize the **current folder** instead of creating a new one.           |
| `-l, --lang <lang>`  | `js` or `ts`. Skips the language prompt.                                   |
| `-y, --yes`          | Skips the "folder is not empty" confirmation when using `init .`.          |
| `-V, --version`      | Print the version.                                                         |
| `-h, --help`         | Show help.                                                                 |

### Examples

```bash
iron-server init                      # asks for name and language
iron-server init my-api               # new folder, asks for language
iron-server init my-api --lang ts     # new TypeScript folder, no prompts
iron-server init .                    # current folder
iron-server init . --lang js --yes    # current folder, no prompts at all
```

When you use `init .`, the project name is taken from the folder name (lowercased). It must still match the allowed name pattern.

---

## What gets generated

### JavaScript

```text
my-api/
├── scripts/
├── src/
│   ├── chat/
│   ├── config/
│   │   └── env.config.js
│   ├── constants/
│   ├── controllers/
│   ├── jobs/
│   ├── middlewares/
│   ├── models/
│   ├── routes/
│   │   ├── health.routes.js
│   │   └── index.routes.js
│   ├── services/
│   ├── utils/
│   └── validators/
├── .dockerignore
├── .env.sample
├── .gitignore
├── .prettierrc
├── Dockerfile
├── healthcheck.js
├── package.json
└── server.js
```

### TypeScript

Same layout with `.ts` extensions, plus a `tsconfig.json`:

```text
my-api/
├── ...same folders...
├── healthcheck.ts
├── server.ts
└── tsconfig.json
```

Empty folders contain a `.gitkeep` so git keeps them. The placeholder is removed automatically once a folder has a real file.

### Starter files (so the project runs immediately)

| File                           | Purpose                                                              |
| ------------------------------ | -------------------------------------------------------------------- |
| `server.js` / `server.ts`      | Entry point: loads config, sets up Express, JSON and CORS, mounts routes, starts the server, shuts down cleanly on `SIGINT` and `SIGTERM` |
| `src/config/env.config.*`      | Loads `.env` with `dotenv` and exports `env.port` and `env.nodeEnv`  |
| `src/routes/index.routes.*`    | Route aggregator. Mount every new route file here                    |
| `src/routes/health.routes.*`   | `GET /health` returns `{ "status": "ok" }`                           |

### Dependencies written to the generated `package.json`

| Type              | JavaScript                  | TypeScript                                                                    |
| ----------------- | --------------------------- | ----------------------------------------------------------------------------- |
| `dependencies`    | `express`, `cors`, `dotenv` | `express`, `cors`, `dotenv`                                                   |
| `devDependencies` | `nodemon`, `prettier`       | `typescript`, `tsx`, `prettier`, `@types/node`, `@types/express`, `@types/cors` |

Versions are written as ranges. `npm install` resolves and locks them.

---

## Folder guide

Where each kind of code lives. The structure is flat on purpose: one folder per layer, no nesting by feature.

| Folder              | Put here                                                                                              |
| ------------------- | ----------------------------------------------------------------------------------------------------- |
| `scripts/`          | One-off tooling: seed data, migrations, maintenance scripts                                           |
| `src/chat/`         | Real-time code: Socket.io setup and event handlers                                                    |
| `src/config/`       | Configuration for the app and third-party services: env, CORS, Razorpay, Nodemailer, AI agent settings |
| `src/constants/`    | Enums, status codes, roles, event names, queue names                                                  |
| `src/controllers/`  | Request handlers. Keep them thin: read the request, call a service, send the response                 |
| `src/jobs/`         | Cron jobs and background workers                                                                      |
| `src/middlewares/`  | Auth guards, error handler, rate limiting, upload handling                                            |
| `src/models/`       | Database models (for example Mongoose schemas)                                                        |
| `src/routes/`       | Route definitions, one file per resource, mounted in `index.routes`                                   |
| `src/services/`     | Business logic, database access, calls to external APIs                                               |
| `src/utils/`        | Helpers: database connection, email templates, formatters, logger                                     |
| `src/validators/`   | Request validation schemas                                                                            |

### Typical request flow

```text
route  ->  middleware  ->  validator  ->  controller  ->  service  ->  model / external API
```

### Adding a new feature (example: users)

```text
src/routes/user.routes.js
src/controllers/user.controller.js
src/services/user.service.js
src/models/user.model.js
src/validators/user.validator.js
```

Then mount it in `src/routes/index.routes.js`:

```js
import userRoutes from "./user.routes.js";

router.use("/users", userRoutes);
```

---

## Naming convention

Files are named `<name>.<layer>.<ext>`, with kebab-case names.

| Layer       | Pattern                      | Example                        |
| ----------- | ---------------------------- | ------------------------------ |
| chat        | `<name>.chat.js`             | `notification.chat.js`         |
| config      | `<name>.config.js`           | `razorpay.config.js`           |
| constants   | `<name>.constants.js`        | `roles.constants.js`           |
| controllers | `<name>.controller.js`       | `user.controller.js`           |
| jobs        | `<name>.job.js`              | `cleanup.job.js`               |
| middlewares | `<name>.middleware.js`       | `auth.middleware.js`           |
| models      | `<name>.model.js`            | `user.model.js`                |
| routes      | `<name>.routes.js`           | `user.routes.js`               |
| services    | `<name>.service.js`          | `mail.service.js`              |
| utils       | `<name>.util.js`             | `email-templates.util.js`      |
| validators  | `<name>.validator.js`        | `user.validator.js`            |

With TypeScript, swap `.js` for `.ts`. Note that constants and routes use the plural suffix.

The convention means you always know what a file does from its name alone, and global search by suffix (`*.service.js`) lists a whole layer.

---

## JavaScript vs TypeScript

| Topic            | JavaScript                  | TypeScript                                           |
| ---------------- | --------------------------- | ---------------------------------------------------- |
| Module system    | ES modules (`"type": "module"`) | ES modules (`"type": "module"`, `NodeNext`)       |
| Dev server       | `nodemon server.js`         | `tsx watch server.ts`                                |
| Build            | not needed                  | `tsc` outputs to `dist/`                             |
| Production start | `node server.js`            | `node dist/server.js`                                |
| Type check       | n/a                         | `npm run typecheck`                                  |

### Important TypeScript detail

The project uses ES modules with `NodeNext` resolution. When you import your own files, **write the `.js` extension, even though the source file is `.ts`**:

```ts
import routes from "./src/routes/index.routes.js"; // correct
import routes from "./src/routes/index.routes";    // fails at runtime
```

This is how TypeScript works with native ES modules in Node. The generated files already follow this rule.

---

## Using it in an existing folder

```bash
cd my-existing-folder
iron-server init .
```

If the folder is not empty, you are asked to confirm (skip with `--yes`). Then:

| Situation                              | What happens                                                                 |
| -------------------------------------- | ---------------------------------------------------------------------------- |
| Folder or file already exists          | Left untouched and listed under "Skipped"                                    |
| `package.json` exists                  | **Merged**. Your name, version and existing scripts and dependencies are kept |
| `package.json` has no `"type"`         | Set to `"module"` (reported in the output)                                   |
| Same script or dependency already exists | Yours is kept, nothing is overwritten                                      |
| Your `index.js`                        | Not touched. The new entry point is `server.js`, so you can delete it        |

Running `init .` twice is safe. The second run changes nothing and reports what it skipped.

After merging, `"main"` in your `package.json` may still say `index.js`. It does not affect `npm run dev` or `npm start`, but you can change it to `server.js`.

---

## Generated scripts

JavaScript:

| Script           | Command                   |
| ---------------- | ------------------------- |
| `npm run dev`    | `nodemon server.js`       |
| `npm start`      | `node server.js`          |
| `npm run format` | `prettier --write .`      |

TypeScript:

| Script              | Command                   |
| ------------------- | ------------------------- |
| `npm run dev`       | `tsx watch server.ts`     |
| `npm run build`     | `tsc`                     |
| `npm start`         | `node dist/server.js`     |
| `npm run typecheck` | `tsc --noEmit`            |
| `npm run format`    | `prettier --write .`      |

### Environment variables

`.env.sample` is committed. Copy it to `.env` (which is git-ignored) and edit.

| Variable   | Default       | Description              |
| ---------- | ------------- | ------------------------ |
| `PORT`     | `5000`        | Port the server uses     |
| `NODE_ENV` | `development` | Runtime environment      |

---

## Docker and health check

A `Dockerfile` and `.dockerignore` are generated.

- **JavaScript:** single stage, installs production dependencies only, runs `node server.js`.
- **TypeScript:** two stages. The build stage installs everything and runs `tsc`. The final image contains only production dependencies and the compiled `dist/` folder.
- Both define a `HEALTHCHECK` that runs the generated health check script, which requests `GET /health` and exits `0` when it returns `200`, otherwise `1`.

```bash
docker build -t my-api .
docker run -p 5000:5000 --env-file .env my-api
```

You can also run the health check yourself while the server is running:

```bash
node healthcheck.js          # TypeScript projects: node dist/healthcheck.js after npm run build
echo $?                      # 0 means healthy
```

---

## Safety guarantees

| Scenario                                    | Behavior                                                         |
| ------------------------------------------- | ---------------------------------------------------------------- |
| Invalid project name                        | Clear error, nothing created                                     |
| Target folder exists and is not empty (new-folder mode) | Refuses, and points you to `init .`                  |
| `init .` in a non-empty folder              | Asks for confirmation first                                      |
| Existing files                              | Never overwritten (only `package.json` is merged)               |
| Generation fails midway                     | Removes only the files and folders that run created              |
| You press Ctrl+C                            | Exits cleanly                                                    |
| Dependencies                                | The tool never runs `npm install` and never writes a lockfile    |

---

## Troubleshooting

### `Cannot find package 'commander'`
You have a broken version (`0.1.0`). Update to `0.1.1` or later:

```bash
npx --yes @buddhadebkoner/iron-server@latest init my-api
# or, if installed globally:
npm i -g @buddhadebkoner/iron-server@latest
```

### `Invalid project name`
Use lowercase letters, numbers, `-` or `_`, starting with a letter or number. With `init .`, rename the folder if its name has capitals or spaces.

### `Folder "x" already exists and is not empty`
Either pick another name, or go into the folder and run `iron-server init .`.

### `npx iron-server` shows help but does nothing
That is expected. Run a command: `iron-server init my-api`.

### The generated server does not start
1. Did you run `npm install`? The tool does not do it for you.
2. Is port `5000` already in use? Change `PORT` in `.env`.
3. TypeScript: run `npm run typecheck` to see type errors.

### `Cannot find module` after `npm run build` (TypeScript)
Make sure every relative import ends in `.js` (see [JavaScript vs TypeScript](#javascript-vs-typescript)).

### Windows: `cp` is not recognized
Use `copy .env.sample .env` in PowerShell or Command Prompt.

---

## Roadmap

These are **planned** and not available yet:

- Choice of framework (Fastify alongside Express)
- Database adapters: MongoDB (Mongoose), PostgreSQL and MySQL (Prisma)
- Optional modules: authentication (JWT), request validation (Zod), Swagger docs, file upload, logging (Pino), Socket.io chat, cron jobs, Nodemailer, Razorpay and AI agent configuration
- `docker-compose.yml`
- Automated tests of every generated combination

Have a request? Open an issue.

---

## Contributing and releases

```bash
git clone <repo-url>
cd iron-server
npm install
npm link                 # makes the local code available as `iron-server`
iron-server init demo --lang ts
```

Project layout:

```text
bin/iron-server.js       executable entry (shebang)
src/index.js             Commander setup
src/commands/init.js     the init command (prompts, in-place merge, cleanup)
src/templates.js         folder list and file contents for JS and TS
```

Before every release:

```bash
npm pack --dry-run                           # check the file list and that dependencies are in package.json
npm version patch --no-git-tag-version       # or minor / major
npm publish --access public
```

Test the packed build in a clean folder with `npm pack` and `npx ./iron-server-x.y.z.tgz init demo` before publishing.

---

## License

MIT. See [LICENSE](./LICENSE).
