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

  await send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });

  await send("Page.navigate", { url: "http://localhost:3000/admin/collections" });
  await new Promise((r) => setTimeout(r, 3000));

  console.log("Clicking Edit button on Season's Top Picks...");
  await send("Runtime.evaluate", {
    expression: `
      const editBtns = Array.from(document.querySelectorAll('button')).filter(b => b.textContent.trim() === 'Edit');
      console.log('Found edit buttons:', editBtns.length);
      if (editBtns[1]) editBtns[1].click();
    `,
  });
  await new Promise((r) => setTimeout(r, 1500));

  console.log("Clicking Live Strip Preview tab...");
  await send("Runtime.evaluate", {
    expression: `
      const tabs = Array.from(document.querySelectorAll('button')).filter(b => b.textContent.trim() === 'Live Strip Preview');
      if (tabs[0]) tabs[0].click();
    `,
  });
  await new Promise((r) => setTimeout(r, 3000));

  console.log("Capturing live strip preview...");
  const snap = await send("Page.captureScreenshot", {
    format: "png",
    clip: { x: 0, y: 0, width: 1440, height: 900, scale: 1 },
    captureBeyondViewport: false,
  });
  fs.writeFileSync(path.join(ARTIFACT_DIR, "admin-collections-strip-preview.png"), Buffer.from(snap.data, "base64"));
  console.log("✓ Saved admin-collections-strip-preview.png");

  ws.close();
  console.log("Done!");
}

run().catch((e) => {
  console.error("Error:", e);
  process.exit(1);
});
