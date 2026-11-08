import { spawn } from "child_process";
import http from "http";
import fs from "fs";
import path from "path";

const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const ARTIFACT_DIR = "/Users/naveenvadla/.gemini/antigravity/brain/b1abf0cf-33e0-4e24-8783-7a46b010abbf/screenshots";
const USER_DATA_DIR = "/tmp/chrome-malli-admin-session";

if (!fs.existsSync(USER_DATA_DIR)) {
  fs.mkdirSync(USER_DATA_DIR, { recursive: true });
}

async function capture() {
  const chrome = spawn(CHROME_PATH, [
    "--headless=new",
    "--remote-debugging-port=9222",
    `--user-data-dir=${USER_DATA_DIR}`,
    "--no-sandbox",
    "--disable-gpu",
    "--window-size=1440,900"
  ]);

  await new Promise((r) => setTimeout(r, 2000));

  function cdpGet(p) {
    return new Promise((resolve, reject) => {
      http.get(`http://127.0.0.1:9222${p}`, (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => resolve(JSON.parse(data)));
      }).on("error", reject);
    });
  }

  const tabs = await cdpGet("/json");
  const wsUrl = tabs[0].webSocketDebuggerUrl;
  const ws = new WebSocket(wsUrl);

  let idCounter = 1;
  const pending = new Map();

  ws.addEventListener("message", (event) => {
    const res = JSON.parse(event.data);
    if (res.id && pending.has(res.id)) {
      pending.get(res.id)(res.result);
      pending.delete(res.id);
    }
  });

  await new Promise((r) => ws.addEventListener("open", r, { once: true }));

  function send(method, params = {}) {
    return new Promise((resolve) => {
      const id = idCounter++;
      pending.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  await send("Page.enable");
  await send("Runtime.enable");

  await send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 900,
    deviceScaleFactor: 2,
    mobile: false
  });

  // Navigate to login
  console.log("Navigating to /login...");
  await send("Page.navigate", { url: "http://localhost:3000/login?callbackUrl=/admin/campaigns" });
  await new Promise((r) => setTimeout(r, 4500));

  console.log("Focusing and typing credentials...");
  await send("Runtime.evaluate", {
    expression: `
      const email = document.querySelector('input[type="email"]');
      if (email) email.focus();
    `
  });
  await send("Input.insertText", { text: "admin@malliandco.com" });
  await new Promise((r) => setTimeout(r, 200));

  await send("Runtime.evaluate", {
    expression: `
      const pass = document.querySelector('input[type="password"]');
      if (pass) pass.focus();
    `
  });
  await send("Input.insertText", { text: "MalliAdminSecure2026!" });
  await new Promise((r) => setTimeout(r, 200));

  console.log("Clicking Sign In...");
  await send("Runtime.evaluate", {
    expression: `
      const btn = document.querySelector('button[type="submit"]');
      if (btn) btn.click();
    `
  });

  await new Promise((r) => setTimeout(r, 4500));

  console.log("Navigating to /admin/campaigns...");
  await send("Page.navigate", { url: "http://localhost:3000/admin/campaigns" });
  await new Promise((r) => setTimeout(r, 4500));

  const shotList = await send("Page.captureScreenshot", { format: "png" });
  if (shotList && shotList.data) {
    fs.writeFileSync(path.join(ARTIFACT_DIR, "admin-campaigns-table.png"), Buffer.from(shotList.data, "base64"));
    console.log("Saved admin-campaigns-table.png");
  }

  ws.close();
  chrome.kill();
  console.log("Done.");
}

capture().catch((err) => {
  console.error("Capture error:", err);
  process.exit(1);
});
