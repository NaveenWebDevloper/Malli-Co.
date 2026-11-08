import { spawn } from "child_process";
import http from "http";
import fs from "fs";

const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const ARTIFACT_DIR = "/Users/naveenvadla/.gemini/antigravity/brain/b1abf0cf-33e0-4e24-8783-7a46b010abbf/screenshots";

async function run() {
  const chrome = spawn(CHROME_PATH, [
    "--headless=new",
    "--remote-debugging-port=9222",
    "--no-sandbox",
    "--disable-gpu",
    "--window-size=1440,900"
  ]);

  await new Promise((r) => setTimeout(r, 1500));

  function cdpGet(path) {
    return new Promise((resolve, reject) => {
      http.get(`http://127.0.0.1:9222${path}`, (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => resolve(JSON.parse(data)));
      }).on("error", reject);
    });
  }

  const tabs = await cdpGet("/json");
  const wsUrl = tabs[0].webSocketDebuggerUrl;
  const WebSocket = (await import("ws")).default;
  const ws = new WebSocket(wsUrl);

  let idCounter = 1;
  const pending = new Map();

  ws.on("message", (msg) => {
    const res = JSON.parse(msg);
    if (res.id && pending.has(res.id)) {
      pending.get(res.id)(res.result);
      pending.delete(res.id);
    }
  });

  await new Promise((r) => ws.on("open", r));

  function send(method, params = {}) {
    return new Promise((resolve) => {
      const id = idCounter++;
      pending.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  await send("Page.enable");
  await send("Page.navigate", { url: "http://localhost:3000" });
  await new Promise((r) => setTimeout(r, 3500));

  // Dismiss any nextjs portal dev overlay
  await send("Runtime.evaluate", {
    expression: `
      document.querySelectorAll('nextjs-portal').forEach(el => el.remove());
    `
  });

  const res = await send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(`${ARTIFACT_DIR}/hero-vaportype-1440px.png`, Buffer.from(res.data, "base64"));
  console.log("Captured hero-vaportype-1440px.png");

  ws.close();
  chrome.kill();
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});

