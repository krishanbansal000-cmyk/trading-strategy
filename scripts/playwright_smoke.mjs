import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.join(ROOT, 'playwright-output');
const SERVER_URL = 'http://127.0.0.1:3000';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png'
};

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

function getContentType(filePath) {
  return MIME_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
}

async function serveStatic(req, res) {
  const requestPath = req.url === '/' ? '/index.html' : req.url;
  const filePath = path.join(ROOT, decodeURIComponent(requestPath.split('?')[0]));
  const normalized = path.normalize(filePath);
  if (!normalized.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  try {
    const data = await fs.readFile(normalized);
    res.writeHead(200, { 'Content-Type': getContentType(normalized) });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
}

async function createServer() {
  const server = http.createServer(async (req, res) => {
    await serveStatic(req, res);
  });

  await new Promise(resolve => server.listen(3000, '127.0.0.1', resolve));
  return server;
}

async function main() {
  await ensureDir(OUTPUT_DIR);
  const server = await createServer();

  try {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1600, height: 1100 } });

    await page.route('https://api.z.ai/**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json; charset=utf-8',
        body: JSON.stringify({
          id: 'chatcmpl-mocked',
          object: 'chat.completion',
          created: Math.floor(Date.now() / 1000),
          model: 'glm-4.7',
          choices: [
            {
              index: 0,
              finish_reason: 'stop',
              message: {
                role: 'assistant',
                content: 'Mocked frontend LangChain reply for gold. The local books, analysis files, strategy rules, and charting path are all wired correctly.'
              }
            }
          ],
          usage: {
            prompt_tokens: 120,
            completion_tokens: 34,
            total_tokens: 154
          }
        })
      });
    });

    await page.goto(SERVER_URL, { waitUntil: 'networkidle' });
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'dashboard-frontend-home.png'), fullPage: true });

    await page.waitForSelector('#thread-select');
    await page.fill('#api-key-input', 'zai-browser-test-key');
    await page.click('.agent-key-save');
    await page.fill('#chat-input', 'Show a compact gold chart, include the trend, and mention the strongest local file basis.');
    await page.click('.input-row button');
    await page.waitForFunction(() => {
      const messages = [...document.querySelectorAll('#chat-messages .msg-content')];
      return messages.some(node => /mocked frontend langchain reply/i.test(node.textContent || ''));
    }, { timeout: 30000 });
    await page.waitForSelector('.inline-chart-card canvas');
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'dashboard-frontend-chat.png'), fullPage: true });

    await browser.close();
  } finally {
    server.close();
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
