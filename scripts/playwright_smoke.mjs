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

async function waitForPage(url, timeoutMs = 30000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Keep polling until the static server is ready.
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function main() {
  await ensureDir(OUTPUT_DIR);

  const server = spawn('python3', ['-m', 'http.server', '3000', '--bind', '127.0.0.1'], {
    cwd: ROOT,
    stdio: 'ignore'
  });

  try {
    await waitForPage(SERVER_URL);

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1600, height: 1100 } });

    await page.route('https://api.z.ai/api/coding/paas/v4/chat/completions', async route => {
      const request = route.request();
      const payload = request.postDataJSON();
      const userMessage = payload?.messages?.[payload.messages.length - 1]?.content || '';
      const mockedText = [
        'Gold remains in a timing-window setup rather than an exact turn date.',
        'Local file support: the gold analysis file and the selected books still favor waiting for stronger Sun support.',
        'Practical view: accumulate only on controlled weakness and wait for price confirmation before sizing up.',
        `Echoed prompt basis: ${String(userMessage).slice(0, 120)}`
      ].join('\n\n');

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'mocked-chat',
          object: 'chat.completion',
          choices: [
            {
              index: 0,
              message: {
                role: 'assistant',
                content: mockedText
              },
              finish_reason: 'stop'
            }
          ]
        })
      });
    });

    await page.goto(SERVER_URL, { waitUntil: 'networkidle' });
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'dashboard-static-home.png'), fullPage: true });

    await page.fill('#api-key-input', 'test-key');
    await page.click('.agent-key-save');
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'dashboard-static-key.png'), fullPage: true });

    await page.fill('#chat-input', 'Give a compact gold analysis and mention the local commodity file basis.');
    await page.click('.input-row button');
    await page.waitForFunction(() => {
      const messages = [...document.querySelectorAll('#chat-messages .msg-content')];
      return messages.some(node => /gold remains/i.test(node.textContent || ''));
    }, { timeout: 30000 });
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'dashboard-static-chat.png'), fullPage: true });

    await browser.close();
  } finally {
    server.kill('SIGTERM');
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
