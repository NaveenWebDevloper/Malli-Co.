import fs from "fs";
import path from "path";
import http from "http";

const ARTIFACT_DIR = "/Users/naveenvadla/.gemini/antigravity/brain/b1abf0cf-33e0-4e24-8783-7a46b010abbf/screenshots";

async function cdpGet(p) {
  return new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:9222${p}`, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => resolve(JSON.parse(data)));
    }).on("error", reject);
  });
}

async function run() {
  const tabs = await cdpGet("/json");
  const adminTab = tabs.find((t) => t.url.includes("localhost:3000") || t.title.includes("Admin"));
  if (!adminTab) {
    console.error("No admin tab found:", tabs);
    process.exit(1);
  }

  console.log("Found admin tab:", adminTab.title, adminTab.url);
  const ws = new WebSocket(adminTab.webSocketDebuggerUrl);

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

  // Set explicit device metrics override
  await send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });

  await send("Emulation.setVisibleSize", {
    width: 1440,
    height: 900,
  });

  // Navigate to /admin/collections
  console.log("Navigating to http://localhost:3000/admin/collections...");
  await send("Page.navigate", { url: "http://localhost:3000/admin/collections" });
  await new Promise((r) => setTimeout(r, 6500));

  console.log("Capturing collections dashboard screenshot...");
  const snap1 = await send("Page.captureScreenshot", {
    format: "png",
    clip: { x: 0, y: 0, width: 1440, height: 900, scale: 1 },
    captureBeyondViewport: false,
  });
  fs.writeFileSync(path.join(ARTIFACT_DIR, "admin-collections-dashboard.png"), Buffer.from(snap1.data, "base64"));
  console.log("✓ Saved admin-collections-dashboard.png");

  // Click "+ Create Collection"
  console.log("Clicking Create Collection button...");
  await send("Runtime.evaluate", {
    expression: `
      const buttons = Array.from(document.querySelectorAll('button'));
      const createBtn = buttons.find(b => b.textContent.includes('Create Collection'));
      if (createBtn) createBtn.click();
    `,
  });
  await new Promise((r) => setTimeout(r, 1500));

  console.log("Capturing create collection modal screenshot...");
  const snap2 = await send("Page.captureScreenshot", {
    format: "png",
    clip: { x: 0, y: 0, width: 1440, height: 900, scale: 1 },
    captureBeyondViewport: false,
  });
  fs.writeFileSync(path.join(ARTIFACT_DIR, "admin-collections-modal.png"), Buffer.from(snap2.data, "base64"));
  console.log("✓ Saved admin-collections-modal.png");

  ws.close();
  console.log("Done!");
}

run().catch((e) => {
  console.error("Error:", e);
  process.exit(1);
});
