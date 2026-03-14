import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.join(ROOT, 'playwright-output');
const SERVER_URL = 'http://127.0.0.1:3000';
const require = createRequire(import.meta.url);
const { handler } = require(path.join(ROOT, 'netlify/functions/agent.js'));

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
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
  process.env.MOCK_ZAI = '1';

  const server = http.createServer(async (req, res) => {
    if (req.method === 'POST' && req.url === '/.netlify/functions/agent') {
      let body = '';
      req.on('data', chunk => {
        body += chunk;
      });
      req.on('end', async () => {
        const result = await handler({
          httpMethod: 'POST',
          body
        });
        res.writeHead(result.statusCode || 200, result.headers || { 'Content-Type': 'application/json' });
        res.end(result.body || '');
      });
      return;
    }

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

    await page.goto(SERVER_URL, { waitUntil: 'networkidle' });
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'dashboard-netlify-home.png'), fullPage: true });

    await page.waitForSelector('#thread-select');
    await page.fill('#chat-input', 'Show a compact gold chart, include the trend, and mention the strongest local file basis.');
    await page.click('.input-row button');
    await page.waitForFunction(() => {
      const messages = [...document.querySelectorAll('#chat-messages .msg-content')];
      return messages.some(node => /mocked netlify agent reply/i.test(node.textContent || ''));
    }, { timeout: 30000 });
    await page.waitForSelector('.inline-chart-card canvas');
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'dashboard-netlify-chat.png'), fullPage: true });

    await browser.close();
  } finally {
    server.close();
    delete process.env.MOCK_ZAI;
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
