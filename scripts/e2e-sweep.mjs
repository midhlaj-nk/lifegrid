/* eslint-disable no-console */
// Full-feature sweep: login, seed demo data through the real UI,
// visit every route on desktop + mobile, collect console/page errors.
import { chromium, devices } from "playwright";
import fs from "fs";

const BASE = "http://localhost:3100";
const EMAIL = "irfan@cybrosys.com";
const PASSWORD = "test-password-123";
const SHOTS = "/tmp/e2e-shots";
fs.mkdirSync(SHOTS, { recursive: true });

const issues = [];
function track(page, label) {
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      const text = msg.text();
      // noise filter
      if (text.includes("favicon")) return;
      if (text.includes("Download the React DevTools")) return;
      issues.push(`[console:${label}] ${text.slice(0, 300)}`);
    }
  });
  page.on("pageerror", (err) =>
    issues.push(`[pageerror:${label}] ${String(err).slice(0, 300)}`)
  );
  page.on("response", (res) => {
    if (res.status() >= 500)
      issues.push(`[http${res.status()}:${label}] ${res.url()}`);
  });
}

async function login(page) {
  await page.goto(`${BASE}/sign-in`);
  await page.fill("#email", EMAIL);
  await page.fill("#password", PASSWORD);
  await page.click('button:has-text("Sign in")');
  await page.waitForURL(`${BASE}/`, { timeout: 15000 });
}

const browser = await chromium.launch();

// ---------- desktop pass ----------
{
  const ctx = await browser.newContext({ viewport: { width: 1380, height: 900 } });
  const page = await ctx.newPage();
  track(page, "desktop");

  await login(page);
  console.log("✓ login");

  // --- seed: task via Today quick add ---
  await page.goto(`${BASE}/today`);
  await page.fill('input[placeholder="Add a task…"]', "E2E demo task");
  await page.click('button:has-text("Add")');
  await page.waitForTimeout(800);
  console.log("✓ task created");

  // --- global quick-add with NL ---
  await page.keyboard.press("Control+k");
  await page.fill(
    'input[placeholder*="pay rent"]',
    "review e2e results tomorrow 9am !p2 #e2e"
  );
  await page.click('button:has-text("Add task")');
  await page.waitForTimeout(800);
  console.log("✓ NL quick add");

  // --- event ---
  await page.goto(`${BASE}/events`);
  await page.click('button:has-text("New event")');
  await page.fill('input[placeholder*="Event name"]', "E2E launch day");
  await page.fill('input[type="date"]', "2026-07-01");
  await page.click('button:has-text("Add event")');
  await page.waitForTimeout(800);
  console.log("✓ event created");

  // --- habit ---
  await page.goto(`${BASE}/habits`);
  await page.click('button:has-text("New habit")');
  await page.fill('input[placeholder*="Habit"]', "E2E meditation");
  await page.click('button:has-text("Add habit")');
  await page.waitForTimeout(800);
  console.log("✓ habit created");

  // --- goal ---
  await page.goto(`${BASE}/goals`);
  await page.click('button:has-text("New goal")');
  await page.fill('input[placeholder*="Goal"]', "E2E ship v2");
  await page.click('button:has-text("Add goal")');
  await page.waitForTimeout(800);
  console.log("✓ goal created");

  // --- note (page mode) ---
  await page.goto(`${BASE}/notes`);
  await page.click('button:has-text("New page")');
  await page.waitForURL(/\/notes\/.+/, { timeout: 10000 });
  await page.fill('input[placeholder="Untitled"]', "E2E meeting notes");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(800);
  const noteUrl = page.url();
  console.log("✓ note created");

  // canvas mode toggle
  await page.click('button:has-text("Canvas")');
  await page.waitForTimeout(3500); // excalidraw lazy load
  await page.screenshot({ path: `${SHOTS}/note-canvas.png` });
  await page.click('button:has-text("Page")');
  await page.waitForTimeout(1000);
  console.log("✓ canvas toggle");

  // --- sheet ---
  await page.goto(`${BASE}/sheets`);
  await page.click('button:has-text("New sheet")');
  await page.waitForURL(/\/sheets\/.+/, { timeout: 15000 });
  await page.waitForTimeout(6000); // univer load
  await page.screenshot({ path: `${SHOTS}/sheet-editor.png` });
  console.log("✓ sheet created");

  // --- finance: account + transaction ---
  await page.goto(`${BASE}/finance/accounts`);
  await page.click('button:has-text("New account")');
  await page.fill('input[placeholder*="Account name"]', "E2E Bank");
  await page.fill('input[placeholder*="opening balance"]', "50000");
  await page.click('form button:has-text("Add")');
  await page.waitForTimeout(800);
  await page.goto(`${BASE}/finance/transactions`);
  await page.fill('input[placeholder*="amount"]', "450");
  await page.fill('input[placeholder="Note (optional)"]', "E2E lunch");
  await page.click('form button:has-text("Add")');
  await page.waitForTimeout(800);
  console.log("✓ finance account + transaction");

  // --- vault: render check only. The vault belongs to the user (their
  // master password) — never mutate it from automation.
  await page.goto(`${BASE}/vault`);
  await page.waitForTimeout(2500);
  if (await page.isVisible('input[placeholder="Confirm master password"]')) {
    console.log("✓ vault shows setup view (uninitialized)");
  } else if (await page.isVisible('button:has-text("Unlock")')) {
    console.log("✓ vault locked view renders (user-owned, skipping)");
  } else {
    issues.push("[flow] vault rendered neither setup nor unlock view");
  }

  // --- dashboard edit mode ---
  await page.goto(`${BASE}/`);
  await page.click('button:has-text("Edit")');
  await page.waitForTimeout(400);
  await page.click('button:has-text("Done")');
  console.log("✓ dashboard edit toggle");

  // --- kanban: project + board ---
  await page.goto(`${BASE}/today`);
  // create project via sidebar plus
  await page.click('button[aria-label="New project"]');
  await page.fill('input[placeholder="Project name"]', "E2E Project");
  await page.click('button:has-text("Create project")');
  await page.waitForTimeout(800);
  await page.click('a:has-text("E2E Project")');
  await page.waitForURL(/\/project\/.+/);
  await page.click('a:has-text("Board")');
  await page.waitForURL(/\/board/);
  await page.click('button:has-text("Edit stages")');
  await page.fill('input[placeholder*="New stage"]', "Review");
  await page.click('form button:has-text("Add")');
  await page.click('button:has-text("Close")');
  await page.waitForTimeout(800);
  console.log("✓ kanban custom stage");

  // --- visit remaining routes ---
  const routes = [
    "/", "/apps", "/today", "/upcoming", "/inbox", "/completed",
    "/notes", "/calendar", "/events", "/habits", "/goals", "/vault",
    "/finance", "/finance/transactions", "/finance/accounts",
    "/finance/budgets", "/finance/subscriptions", "/finance/reports",
    "/finance/import", "/worklog", "/worklog/weekly", "/worklog/history",
    "/worklog/settings", "/assistant", "/insights", "/settings", "/sheets",
  ];
  for (const r of routes) {
    await page.goto(`${BASE}${r}`, { waitUntil: "networkidle" }).catch((e) =>
      issues.push(`[nav:${r}] ${String(e).slice(0, 120)}`)
    );
  }
  console.log("✓ desktop route sweep");
  await page.screenshot({ path: `${SHOTS}/desktop-dashboard.png` });
  await ctx.close();
}

// ---------- mobile pass ----------
{
  const ctx = await browser.newContext({ ...devices["iPhone 14"] });
  const page = await ctx.newPage();
  track(page, "mobile");
  await login(page);

  const routes = [
    "/", "/apps", "/today", "/notes", "/calendar", "/habits",
    "/finance", "/finance/transactions", "/vault", "/worklog", "/settings",
  ];
  for (const r of routes) {
    await page.goto(`${BASE}${r}`, { waitUntil: "networkidle" }).catch((e) =>
      issues.push(`[mobile-nav:${r}] ${String(e).slice(0, 120)}`)
    );
    await page.screenshot({
      path: `${SHOTS}/mobile${r.replace(/\//g, "_") || "_home"}.png`,
    });
    // horizontal overflow check — PWA polish
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth
    );
    if (overflow > 2) issues.push(`[overflow-x:${r}] ${overflow}px wider than viewport`);
  }
  console.log("✓ mobile sweep");
  await ctx.close();
}

await browser.close();

console.log("\n========== ISSUES ==========");
if (!issues.length) console.log("none 🎉");
else [...new Set(issues)].forEach((i) => console.log("•", i));
fs.writeFileSync("/tmp/e2e-issues.txt", [...new Set(issues)].join("\n"));
