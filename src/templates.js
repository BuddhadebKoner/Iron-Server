// Folder skeleton (same for JS and TS)
export const FOLDERS = [
  "scripts",
  "src/chat",
  "src/config",
  "src/constants",
  "src/controllers",
  "src/jobs",
  "src/middlewares",
  "src/models",
  "src/routes",
  "src/services",
  "src/utils",
  "src/validators",
];

export function buildFiles({ name, lang }) {
  const ts = lang === "ts";
  const ext = ts ? "ts" : "js";

  const files = {};

  // ---------- root files ----------
  files["package.json"] = JSON.stringify(
    {
      name,
      version: "1.0.0",
      private: true,
      type: "module",
      scripts: ts
        ? {
            dev: "tsx watch server.ts",
            build: "tsc",
            start: "node dist/server.js",
            typecheck: "tsc --noEmit",
            format: "prettier --write .",
          }
        : {
            dev: "nodemon server.js",
            start: "node server.js",
            format: "prettier --write .",
          },
      dependencies: {
        cors: "^2.8.5",
        dotenv: "^16.4.5",
        express: "^5.1.0",
      },
      devDependencies: ts
        ? {
            "@types/cors": "^2.8.17",
            "@types/express": "^5.0.0",
            "@types/node": "^22.0.0",
            prettier: "^3.3.0",
            tsx: "^4.19.0",
            typescript: "^5.6.0",
          }
        : {
            nodemon: "^3.1.0",
            prettier: "^3.3.0",
          },
    },
    null,
    2
  ) + "\n";

  files[".gitignore"] = ["node_modules", "dist", ".env", "*.log", ""].join("\n");

  files[".dockerignore"] = [
    "node_modules",
    "dist",
    ".env",
    ".git",
    "*.log",
    "",
  ].join("\n");

  files[".prettierrc"] =
    JSON.stringify(
      {
        semi: true,
        singleQuote: false,
        trailingComma: "es5",
        printWidth: 80,
        tabWidth: 2,
      },
      null,
      2
    ) + "\n";

  files[".env.sample"] = ["PORT=5000", "NODE_ENV=development", ""].join("\n");

  files["Dockerfile"] = ts
    ? `FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD node dist/healthcheck.js
CMD ["node", "dist/server.js"]
`
    : `FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD node healthcheck.js
CMD ["node", "server.js"]
`;

  files[`healthcheck.${ext}`] = ts
    ? `import http from "node:http";

const port = Number(process.env.PORT) || 5000;

const req = http.get(
  { host: "127.0.0.1", port, path: "/health", timeout: 3000 },
  (res) => process.exit(res.statusCode === 200 ? 0 : 1)
);
req.on("error", () => process.exit(1));
req.on("timeout", () => {
  req.destroy();
  process.exit(1);
});
`
    : `import http from "node:http";

const port = Number(process.env.PORT) || 5000;

const req = http.get(
  { host: "127.0.0.1", port, path: "/health", timeout: 3000 },
  (res) => process.exit(res.statusCode === 200 ? 0 : 1)
);
req.on("error", () => process.exit(1));
req.on("timeout", () => {
  req.destroy();
  process.exit(1);
});
`;

  if (ts) {
    files["tsconfig.json"] =
      JSON.stringify(
        {
          compilerOptions: {
            target: "ES2022",
            module: "NodeNext",
            moduleResolution: "NodeNext",
            outDir: "dist",
            rootDir: ".",
            strict: true,
            esModuleInterop: true,
            skipLibCheck: true,
          },
          include: ["server.ts", "healthcheck.ts", "src"],
        },
        null,
        2
      ) + "\n";
  }

  // ---------- server ----------
  files[`server.${ext}`] = `import express from "express";
import cors from "cors";
import { env } from "./src/config/env.config.js";
import routes from "./src/routes/index.routes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/", routes);

const server = app.listen(env.port, () => {
  console.log("Server running on port " + env.port);
});

function shutdown(signal${ts ? ": string" : ""}) {
  console.log(signal + " received, shutting down");
  server.close(() => process.exit(0));
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
`;

  // ---------- src starters ----------
  files[`src/config/env.config.${ext}`] = `import "dotenv/config";

export const env = {
  port: Number(process.env.PORT) || 5000,
  nodeEnv: process.env.NODE_ENV || "development",
};
`;

  files[`src/routes/health.routes.${ext}`] = `import { Router } from "express";

const router = Router();

router.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

export default router;
`;

  files[`src/routes/index.routes.${ext}`] = `import { Router } from "express";
import healthRoutes from "./health.routes.js";

const router = Router();

router.use(healthRoutes);

export default router;
`;

  return files;
}
