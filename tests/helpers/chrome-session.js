import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { extensionRoot } from "../helpers.js";

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
].filter(Boolean);

export function findBrowser() {
  return CHROME_CANDIDATES.find((candidate) => existsSync(candidate));
}

async function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(port);
      });
    });
    server.on("error", reject);
  });
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }
  return response.json();
}

async function waitForDebugger(port, attempts = 40) {
  let lastError;

  for (let i = 0; i < attempts; i += 1) {
    try {
      return await fetchJson(`http://127.0.0.1:${port}/json/version`);
    } catch (error) {
      lastError = error;
      await delay(250);
    }
  }

  throw lastError ?? new Error("Chrome DevTools endpoint did not start");
}

function connectCdp(webSocketDebuggerUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(webSocketDebuggerUrl);
    let nextId = 0;
    const pending = new Map();
    const events = [];

    ws.addEventListener("message", (event) => {
      const message = JSON.parse(String(event.data));

      if (message.method) {
        events.push(message);
      }

      if (message.id == null || !pending.has(message.id)) {
        return;
      }

      const { resolve: resolveMessage, reject: rejectMessage } = pending.get(
        message.id
      );
      pending.delete(message.id);

      if (message.error) {
        rejectMessage(new Error(message.error.message));
        return;
      }

      resolveMessage(message.result);
    });

    ws.addEventListener("open", () => {
      resolve({
        events,
        send(method, params = {}, sessionId) {
          const id = (nextId += 1);
          return new Promise((resolveMessage, rejectMessage) => {
            pending.set(id, { resolve: resolveMessage, reject: rejectMessage });
            const payload = { id, method, params };
            if (sessionId) {
              payload.sessionId = sessionId;
            }
            ws.send(JSON.stringify(payload));
          });
        },
        close() {
          ws.close();
        },
      });
    });

    ws.addEventListener("error", reject);
  });
}

function startBrowser({ browserPath, userDataDir, port }) {
  return spawn(
    browserPath,
    [
      `--user-data-dir=${userDataDir}`,
      `--remote-debugging-port=${port}`,
      "--remote-allow-origins=*",
      "--enable-unsafe-extension-debugging",
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-sync",
      "--disable-features=Translate,MediaRouter",
    ],
    {
      stdio: "ignore",
      windowsHide: true,
    }
  );
}

async function stopBrowser(child) {
  if (!child.pid) {
    return;
  }

  await new Promise((resolve) => {
    const killer = spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], {
      stdio: "ignore",
      windowsHide: true,
    });
    killer.on("exit", resolve);
    killer.on("error", resolve);
  });

  await delay(1000);
}

async function removeDir(dir) {
  let lastError;

  for (let i = 0; i < 8; i += 1) {
    try {
      await rm(dir, { recursive: true, force: true });
      return;
    } catch (error) {
      lastError = error;
      await delay(250);
    }
  }

  if (lastError) {
    console.warn(`Could not delete temp profile ${dir}: ${lastError.message}`);
  }
}

export async function withLoadedExtension(run) {
  const browserPath = findBrowser();
  if (!browserPath) {
    throw new Error(
      "Chrome or Edge was not found. Install Chrome or set CHROME_PATH."
    );
  }

  const userDataDir = await mkdtemp(join(tmpdir(), "prompt-enhancer-chrome-"));
  const port = await getFreePort();
  const child = startBrowser({ browserPath, userDataDir, port });
  let cdp;

  try {
    const version = await waitForDebugger(port);
    cdp = await connectCdp(version.webSocketDebuggerUrl);
    await cdp.send("Target.setDiscoverTargets", { discover: true });

    const { id } = await cdp.send("Extensions.loadUnpacked", {
      path: extensionRoot,
    });

    await run({ cdp, extensionId: id });
  } finally {
    cdp?.close();
    await stopBrowser(child);
    await removeDir(userDataDir);
  }
}

export async function waitForTarget(cdp, predicate, attempts = 20) {
  let lastTargets = [];

  for (let i = 0; i < attempts; i += 1) {
    const fromEvents = cdp.events
      .filter((event) => event.method === "Target.targetCreated")
      .map((event) => event.params?.targetInfo)
      .find(predicate);

    if (fromEvents) {
      return fromEvents;
    }

    const { targetInfos } = await cdp.send("Target.getTargets");
    lastTargets = targetInfos;
    const match = targetInfos.find(predicate);
    if (match) {
      return match;
    }

    await delay(200);
  }

  throw new Error(
    `Timed out waiting for Chrome target. Targets: ${JSON.stringify(lastTargets)}`
  );
}
