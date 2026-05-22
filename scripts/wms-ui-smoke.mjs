import { spawn } from "node:child_process";
import { mkdir, rm, stat } from "node:fs/promises";
import { join } from "node:path";

const port = process.env.WMS_UI_SMOKE_PORT ?? "3137";
const baseUrl = `http://127.0.0.1:${port}`;
const outputDir = join(process.cwd(), ".tmp", "wms-ui-smoke");
const chromePath =
  process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const pages = ["/login", "/wms", "/wms/tasks", "/wms/receiving", "/wms/picking", "/wms/settings"];
const viewports = [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "mobile", width: 390, height: 844 }
];

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer() {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 90_000) {
    try {
      const response = await fetch(`${baseUrl}/login`, { redirect: "manual" });
      if (response.status < 500) {
        return;
      }
    } catch {
      // Keep waiting while Next boots.
    }
    await wait(1000);
  }
  throw new Error("WMS UI smoke server did not start within 90 seconds.");
}

function runChrome(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(chromePath, args, { stdio: "pipe" });
    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("Chrome screenshot timed out."));
    }, 20_000);
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      clearTimeout(timeout);
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`Chrome exited with ${code}: ${stderr}`));
    });
  });
}

async function assertRoute(route) {
  const response = await fetch(`${baseUrl}${route}`, { redirect: "manual" });
  if (response.status >= 400) {
    throw new Error(`${route} returned HTTP ${response.status}`);
  }
}

async function capture(route, viewport) {
  const safeRoute = route === "/" ? "root" : route.replace(/^\//, "").replaceAll("/", "-");
  const screenshotPath = join(outputDir, `${viewport.name}-${safeRoute}.png`);
  await runChrome([
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    "--hide-scrollbars",
    "--run-all-compositor-stages-before-draw",
    "--force-device-scale-factor=1",
    "--timeout=5000",
    `--window-size=${viewport.width},${viewport.height}`,
    `--screenshot=${screenshotPath}`,
    `${baseUrl}${route}`
  ]);
  const info = await stat(screenshotPath);
  if (info.size < 10_000) {
    throw new Error(`${screenshotPath} looks too small to be a useful rendered page (${info.size} bytes).`);
  }
}

async function main() {
  await rm(outputDir, { recursive: true, force: true });
  await mkdir(outputDir, { recursive: true });

  const server = spawn("pnpm", ["exec", "next", "dev", "-H", "127.0.0.1", "-p", port], {
    env: { ...process.env, ALLOW_DEV_AUTH_FALLBACK: "true" },
    stdio: "pipe"
  });

  let serverOutput = "";
  server.stdout.on("data", (chunk) => {
    serverOutput += chunk.toString();
  });
  server.stderr.on("data", (chunk) => {
    serverOutput += chunk.toString();
  });

  try {
    await waitForServer();
    for (const route of pages) {
      await assertRoute(route);
      for (const viewport of viewports) {
        await capture(route, viewport);
      }
    }
    console.log(`WMS UI smoke passed. Screenshots: ${outputDir}`);
  } catch (error) {
    console.error(serverOutput.slice(-4000));
    throw error;
  } finally {
    server.kill("SIGTERM");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
