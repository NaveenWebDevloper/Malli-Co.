import { spawn } from "child_process";
import http from "http";
import fs from "fs";
import path from "path";

const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const ARTIFACT_DIR = "/Users/naveenvadla/.gemini/antigravity/brain/b1abf0cf-33e0-4e24-8783-7a46b010abbf/screenshots";
const USER_DATA_DIR = "/tmp/chrome-malli-admin-session";

if (!fs.existsSync(ARTIFACT_DIR)) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
}

async function capture() {
  const chrome = spawn(CHROME_PATH, [
    "--headless=new",
    "--remote-debugging-port=9223",
    `--user-data-dir=${USER_DATA_DIR}`,
    "--no-sandbox",
    "--disable-gpu",
    "--window-size=1440,900",
  ]);

  await new Promise((r) => setTimeout(r, 2000));

  function cdpGet(p) {
    return new Promise((resolve, reject) => {
      http
        .get(`http://127.0.0.1:9223${p}`, (res) => {
          let data = "";
          res.on("data", (c) => (data += c));
          res.on("end", () => resolve(JSON.parse(data)));
        })
        .on("error", reject);
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
    mobile: false,
  });

  // Navigate to login
  console.log("Navigating to /admin/collections...");
  await send("Page.navigate", { url: "http://localhost:3000/login?callbackUrl=/admin/collections" });
  await new Promise((r) => setTimeout(r, 3000));

  // Check if login form is present
  const checkLogin = await send("Runtime.evaluate", {
    expression: `!!document.querySelector('input[type="email"]')`,
  });

  if (checkLogin.result?.value) {
    console.log("Submitting login credentials...");
    await send("Runtime.evaluate", {
      expression: `
        const email = document.querySelector('input[type="email"]');
        if (email) email.focus();
      `,
    });
    await send("Input.insertText", { text: "admin@malliandco.com" });
    await new Promise((r) => setTimeout(r, 200));

    await send("Runtime.evaluate", {
      expression: `
        const pass = document.querySelector('input[type="password"]');
        if (pass) pass.focus();
      `,
    });
    await send("Input.insertText", { text: "MalliAdminSecure2026!" });
    await new Promise((r) => setTimeout(r, 200));

    await send("Runtime.evaluate", {
      expression: `
        const btn = document.querySelector('button[type="submit"]');
        if (btn) btn.click();
      `,
    });
    await new Promise((r) => setTimeout(r, 4500));
  } else {
    console.log("Already authenticated or redirecting...");
    await new Promise((r) => setTimeout(r, 2000));
  }

  // Ensure we are at /admin/collections
  await send("Page.navigate", { url: "http://localhost:3000/admin/collections" });
  await new Promise((r) => setTimeout(r, 4000));

  console.log("Capturing admin collections grid...");
  const snap1 = await send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(
    path.join(ARTIFACT_DIR, "admin-collections-dashboard.png"),
    Buffer.from(snap1.data, "base64"),
  );
  console.log("✓ Saved admin-collections-dashboard.png");

  // Click "+ Create Collection"
  console.log("Opening Create Collection modal...");
  await send("Runtime.evaluate", {
    expression: `
      const buttons = Array.from(document.querySelectorAll('button'));
      const createBtn = buttons.find(b => b.textContent.includes('Create Collection'));
      if (createBtn) createBtn.click();
    `,
  });
  await new Promise((r) => setTimeout(r, 1500));

  console.log("Capturing modal state...");
  const snap2 = await send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(
    path.join(ARTIFACT_DIR, "admin-collections-modal.png"),
    Buffer.from(snap2.data, "base64"),
  );
  console.log("✓ Saved admin-collections-modal.png");

  ws.close();
  chrome.kill();
  console.log("All captures complete!");
}

capture().catch((e) => {
  console.error("Capture failed:", e);
  process.exit(1);
});

