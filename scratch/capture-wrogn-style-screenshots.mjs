import { spawn } from "child_process";
import http from "http";
import fs from "fs";
import path from "path";

const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const ARTIFACT_DIR = "/Users/naveenvadla/.gemini/antigravity/brain/b1abf0cf-33e0-4e24-8783-7a46b010abbf/screenshots";

if (!fs.existsSync(ARTIFACT_DIR)) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
}

async function capture() {
  const chrome = spawn(CHROME_PATH, [
    "--headless=new",
    "--remote-debugging-port=9222",
    "--no-sandbox",
    "--disable-gpu",
    "--window-size=1440,900"
  ]);

  await new Promise((r) => setTimeout(r, 1500));

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

  // 1. Desktop 1440px
  console.log("Navigating to desktop 1440px...");
  await send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 900,
    deviceScaleFactor: 2,
    mobile: false
  });
  await send("Page.navigate", { url: "http://localhost:3000/" });
  // Wait for preloader to finish and banner animations to settle
  await new Promise((r) => setTimeout(r, 4500));

  const shot1 = await send("Page.captureScreenshot", { format: "png" });
  if (shot1 && shot1.data) {
    fs.writeFileSync(path.join(ARTIFACT_DIR, "wrogn-style-1440px.png"), Buffer.from(shot1.data, "base64"));
    console.log("Saved wrogn-style-1440px.png");
  }

  // 2. Desktop Scrolled 120px
  await send("Runtime.evaluate", { expression: "window.scrollTo(0, 120);" });
  await new Promise((r) => setTimeout(r, 1200));
  const shotScrolled = await send("Page.captureScreenshot", { format: "png" });
  if (shotScrolled && shotScrolled.data) {
    fs.writeFileSync(path.join(ARTIFACT_DIR, "wrogn-style-scrolled.png"), Buffer.from(shotScrolled.data, "base64"));
    console.log("Saved wrogn-style-scrolled.png");
  }

  // 3. Mobile 375px
  console.log("Switching to mobile 375px...");
  await send("Runtime.evaluate", { expression: "window.scrollTo(0, 0);" });
  await send("Emulation.setDeviceMetricsOverride", {
    width: 375,
    height: 812,
    deviceScaleFactor: 2,
    mobile: true
  });
  await send("Page.navigate", { url: "http://localhost:3000/" });
  await new Promise((r) => setTimeout(r, 4500));

  const shotMobile = await send("Page.captureScreenshot", { format: "png" });
  if (shotMobile && shotMobile.data) {
    fs.writeFileSync(path.join(ARTIFACT_DIR, "wrogn-style-375px.png"), Buffer.from(shotMobile.data, "base64"));
    console.log("Saved wrogn-style-375px.png");
  }

  ws.close();
  chrome.kill();
  console.log("All screenshots captured successfully.");
}

capture().catch((err) => {
  console.error("Capture error:", err);
  process.exit(1);
});
