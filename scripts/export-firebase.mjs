import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distRoot = path.join(projectRoot, "dist");
const clientRoot = path.join(distRoot, "client");
const publishRoot = path.join(distRoot, "firebase");
const serverEntry = path.join(distRoot, "server", "index.js");

if (path.dirname(publishRoot) !== distRoot || path.basename(publishRoot) !== "firebase") {
  throw new Error(`Refusing to replace unexpected export directory: ${publishRoot}`);
}

await rm(publishRoot, { recursive: true, force: true });
await mkdir(publishRoot, { recursive: true });
await cp(clientRoot, publishRoot, { recursive: true });

const workerUrl = `${pathToFileURL(serverEntry).href}?firebase-export=${Date.now()}`;
const { default: worker } = await import(workerUrl);
const routes = [
  { pathname: "/", output: "index.html" },
  { pathname: "/architecture", output: "architecture.html" },
  { pathname: "/workflow", output: "workflow.html" },
  { pathname: "/agents", output: "agents.html" },
  { pathname: "/main-agents-run", output: "main-agents-run.html" },
  { pathname: "/case-simulation", output: "case-simulation.html" },
];

for (const route of routes) {
  const response = await worker.fetch(
    new Request(`https://localhost${route.pathname}`, {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );

  if (!response.ok) {
    throw new Error(`Static render failed for ${route.pathname}: HTTP ${response.status}`);
  }

  const html = await response.text();
  if (!html.includes("<html") || !html.includes("</html>")) {
    throw new Error(`Static render for ${route.pathname} did not return a complete document`);
  }

  await writeFile(path.join(publishRoot, route.output), html, "utf8");
}

console.log(`Firebase export ready: ${publishRoot}`);
