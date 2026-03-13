import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.join(ROOT, 'playwright-output');
const SERVER_URL = 'http://127.0.0.1:3000';

async function waitForHealth(url, timeoutMs = 30000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(`${url}/api/health`);
      if (response.ok) return;
    } catch {
      // Keep polling until timeout.
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error(`Timed out waiting for ${url}/api/health`);
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function main() {
  await ensureDir(OUTPUT_DIR);

  const server = spawn('node', ['server.js'], {
    cwd: ROOT,
    stdio: 'ignore'
  });

  try {
    await waitForHealth(SERVER_URL);

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1600, height: 1100 } });

    await page.goto(SERVER_URL, { waitUntil: 'networkidle' });
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'dashboard-local.png'), fullPage: true });

    await page.selectOption('#chat-mode-select', 'codex');
    await page.fill('#chat-input', 'Give a compact gold analysis and mention the local commodity file basis.');
    await page.click('.input-row button');
    await page.waitForFunction(() => {
      const messages = [...document.querySelectorAll('#chat-messages .msg-content')];
      return messages.some(node => /gold/i.test(node.textContent || '') && /local/i.test(node.textContent || ''));
    }, { timeout: 120000 });
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'dashboard-local-codex-chat.png'), fullPage: true });

    await page.goto('https://krishanbansal000-cmyk.github.io/trading-strategy/', { waitUntil: 'networkidle' });
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'dashboard-prod.png'), fullPage: true });

    await browser.close();
  } finally {
    server.kill('SIGTERM');
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
