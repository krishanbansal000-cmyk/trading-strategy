const express = require('express');
const fs = require('node:fs/promises');
const path = require('node:path');
const { spawn } = require('node:child_process');

const ROOT = __dirname;
const REFERENCE_ROOT = path.resolve(ROOT, '../reference');
const REPORT_FILE = path.join(REFERENCE_ROOT, '2026-03-11_gold_silver_astro_report.md');
const BOOKS_DIR = path.join(REFERENCE_ROOT, 'books');
const COMMODITY_REPORT_FILES = {
  gold: path.join(ROOT, 'gold_analysis_2026-03-13.md'),
  silver: path.join(ROOT, 'silver_analysis_2026-03-13.md'),
  copper: path.join(ROOT, 'copper_analysis_2026-03-13.md'),
  bitcoin: path.join(ROOT, 'bitcoin_analysis_2026-03-13.md')
};
const COMMODITY_TO_SYMBOL = {
  gold: 'TATAGOLD.NS',
  silver: 'GROWWSLVR.NS',
  copper: 'HINDCOPPER.NS',
  bitcoin: 'BTC-USD'
};
const ENABLE_DANGEROUS_TERMINAL = /^(1|true|yes)$/i.test(process.env.ENABLE_DANGEROUS_TERMINAL || '');
const CODEX_MODEL = process.env.CODEX_MODEL || 'gpt-5.3-codex-spark';

const BOOKS = {
  general: {
    name: 'Financial Astrology',
    summary: 'General financial astrology guidance for commodities, timing, and portfolio positioning.'
  },
  gann: {
    name: 'W.D. Gann Methods',
    summary: 'Time-cycle, geometric angle, and anniversary-date thinking for market timing.'
  },
  vedic: {
    name: 'Vedic Astrology',
    summary: 'Nakshatras, planetary strengths, transit logic, and Vedic timing principles.'
  },
  personal: {
    name: 'Your Birth Chart',
    summary: 'User birth chart for Aug 29 2000, 9:39PM IST, Gurugram, focused on wealth and trading traits.'
  }
};

const COMMODITY_GUIDANCE = {
  gold: 'Tata Gold ETF is treated as Sun-linked. Bullish windows emphasize Aries and Leo solar periods. Avoid Libra windows.',
  silver: 'Groww Silver ETF is treated as Moon-linked. Bullish windows emphasize Taurus Moon and full-moon strength. Avoid Scorpio Moon.',
  copper: 'Hindustan Copper is treated as Venus-linked. Strong recovery windows emphasize April 1-25 and Venus strength. Avoid Venus-in-Virgo style weakness.',
  bitcoin: 'Bitcoin is treated as Rahu-linked. Emphasize trend-following, node-driven cycles, and regime timing.'
};

const shellSessions = new Map();

const app = express();
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  return next();
});
app.use(express.json({ limit: '1mb' }));
app.use(express.static(ROOT));

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    codexConfigured: true,
    codexModel: CODEX_MODEL,
    dangerousTerminalEnabled: ENABLE_DANGEROUS_TERMINAL
  });
});

app.post('/api/agent/stream', async (req, res) => {
  setupSse(res);
  const { message = '', commodity = 'overview', book = 'general', threadId = 'default', history = [] } = req.body || {};
  const scope = COMMODITY_GUIDANCE[commodity] ? commodity : 'overview';

  try {
    sendEvent(res, 'status', { message: 'Preparing guidance, books, and live data' });
    const [marketSnapshot, astrologySnapshot, backtestSummary, referenceSummary, commodityFiles] = await Promise.all([
      getMarketSnapshot(scope),
      getAstrologySnapshot(scope),
      getBacktestSummary(scope),
      searchReferenceContext(message, scope, book),
      loadCommodityFileContext(scope)
    ]);

    const contextBlock = buildContextBlock({
      commodity: scope,
      book,
      marketSnapshot,
      astrologySnapshot,
      backtestSummary,
      referenceSummary,
      commodityFiles
    });

    sendEvent(res, 'status', { message: 'Running local Codex agent with books, astrology, backtest, and commodity files' });
    try {
      const codexText = await runCodexCliAgent({
        message,
        scope,
        book,
        history,
        contextBlock
      });
      streamText(res, codexText);
      sendEvent(res, 'final', { content: codexText });
      return res.end();
    } catch (codexError) {
      sendEvent(res, 'status', { message: 'Codex CLI unavailable, using local fallback response' });
      const fallback = [
        `Request: ${message}`,
        '',
        `Market snapshot: ${marketSnapshot.summary}`,
        marketSnapshot.seriesSummary ? `Last days:\n${marketSnapshot.seriesSummary}` : '',
        `Astrology: ${astrologySnapshot.summary}`,
        `Backtest: ${backtestSummary.summary}`,
        `Books: ${referenceSummary.summary}`,
        `Commodity files:\n${commodityFiles.summary}`,
        '',
        `Codex fallback error: ${codexError.message}`
      ].join('\n');
      streamText(res, fallback);
      sendEvent(res, 'final', { content: fallback });
      return res.end();
    }
  } catch (error) {
    sendEvent(res, 'error', { message: error.message || 'Agent request failed' });
    return res.end();
  }
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(ROOT, 'index.html'));
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
  console.log(`Astrology agent server listening on http://localhost:${port}`);
});

function setupSse(res) {
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();
}

function sendEvent(res, event, payload) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function streamText(res, text) {
  if (!text) return;
  sendEvent(res, 'delta', { content: text });
}

function buildContextBlock({
  commodity,
  book,
  marketSnapshot,
  astrologySnapshot,
  backtestSummary,
  referenceSummary,
  commodityFiles
}) {
  return [
    `Selected commodity: ${commodity}`,
    `Selected book: ${(BOOKS[book] || BOOKS.general).name}`,
    `Book summary: ${(BOOKS[book] || BOOKS.general).summary}`,
    `Commodity guidance: ${COMMODITY_GUIDANCE[commodity] || 'General market view.'}`,
    '',
    `Market snapshot:\n${marketSnapshot.summary}`,
    '',
    `Astrology snapshot:\n${astrologySnapshot.summary}`,
    '',
    `Backtest summary:\n${backtestSummary.summary}`,
    '',
    `Reference context:\n${referenceSummary.summary}`,
    '',
    `Commodity analysis files:\n${commodityFiles.summary}`
  ].join('\n');
}

async function getMarketSnapshot(commodity, days = 10) {
  if (commodity === 'bitcoin') {
    const market = await fetchBitcoinMarketSnapshot();
    const history = await fetchCommodityHistory(commodity, days);
    const latest = Number.isFinite(Number(market.price))
      ? Number(market.price)
      : history.length
        ? history[history.length - 1]?.close
        : 0;
    const change = Number.isFinite(Number(market.change24h))
      ? Number(market.change24h)
      : (history.length > 1 ? ((latest - history[history.length - 2].close) / history[history.length - 2].close) * 100 : 0);
    return {
      price: latest,
      change,
      recentSeries: history.slice(-days),
      seriesSummary: formatSeriesSummary(history.slice(-days), '$'),
      summary: `Bitcoin: $${Number(latest || 0).toLocaleString()} (${Number(change || 0).toFixed(2)}% 24h)`
    };
  }

  const symbol = COMMODITY_TO_SYMBOL[commodity];
  if (!symbol) {
    return { summary: 'No commodity-specific live market snapshot for this view.' };
  }

  const payload = await fetchYahooChart(symbol, Math.max(30, days));
  const latest = payload.points[payload.points.length - 1];
  const previous = payload.points[payload.points.length - 2] || latest;
  const change = previous && previous.close ? (((latest.close - previous.close) / previous.close) * 100) : 0;
  const recentSeries = payload.points.slice(-days);
  return {
    symbol,
    latest,
    recentSeries,
    seriesSummary: formatSeriesSummary(recentSeries, '₹'),
    summary: `${symbol}: ${latest.close.toFixed(2)} (${change.toFixed(2)}% vs previous close)`
  };
}

async function getAstrologySnapshot(commodity) {
  if (!COMMODITY_GUIDANCE[commodity]) {
    return {
      summary: 'General view selected. Astrology snapshot is commodity-specific.'
    };
  }
  const output = await runProcess('python3', [path.join(ROOT, 'scripts', 'commodity_astrology.py'), '--commodity', commodity], {
    cwd: ROOT
  });
  const parsed = parseJson(output.stdout);
  return parsed;
}

async function getBacktestSummary(commodity, lookbackDays = 180) {
  if (!COMMODITY_GUIDANCE[commodity]) {
    return {
      summary: 'General view selected. Backtest is commodity-specific.'
    };
  }
  const history = await fetchCommodityHistory(commodity, lookbackDays);
  const payload = JSON.stringify({ commodity, prices: history });
  const output = await runProcess(
    'python3',
    [path.join(ROOT, 'scripts', 'astro_backtest.py')],
    { cwd: ROOT, stdin: payload }
  );
  return parseJson(output.stdout);
}

async function searchReferenceContext(query, commodity, book) {
  const lowerTerms = String(query || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(term => term.length > 2);
  const availableBooks = await listBookTitles();
  let reportText = '';
  try {
    reportText = await fs.readFile(REPORT_FILE, 'utf8');
  } catch {
    reportText = '';
  }

  const passages = reportText
    .split(/\n{2,}/)
    .map(block => block.trim())
    .filter(Boolean)
    .map(block => ({
      text: block.replace(/^\-\s*/gm, '').trim(),
      score: scoreText(block.toLowerCase(), lowerTerms, commodity, book)
    }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map(item => item.text.slice(0, 320));

  const matchingBooks = availableBooks.filter(title => scoreText(title.toLowerCase(), lowerTerms, commodity, book) > 0).slice(0, 4);
  const commodityFileContext = await loadCommodityFileContext(commodity, lowerTerms);
  const summaryParts = [];
  if (passages.length) summaryParts.push(`Relevant notes:\n- ${passages.join('\n- ')}`);
  if (matchingBooks.length) summaryParts.push(`Relevant local books:\n- ${matchingBooks.join('\n- ')}`);
  if (commodityFileContext.snippets.length) {
    summaryParts.push(`Relevant commodity analysis:\n- ${commodityFileContext.snippets.join('\n- ')}`);
  }
  if (!summaryParts.length) {
    summaryParts.push(`Available local books:\n- ${availableBooks.slice(0, 8).join('\n- ')}`);
  }
  return {
    passages,
    matchingBooks,
    commodityFiles: commodityFileContext.files,
    summary: summaryParts.join('\n\n')
  };
}

async function loadCommodityFileContext(selectedCommodity = 'overview', terms = []) {
  const scopeFiles = selectedCommodity === 'overview'
    ? Object.entries(COMMODITY_REPORT_FILES)
    : [[selectedCommodity, COMMODITY_REPORT_FILES[selectedCommodity]]].filter(([, file]) => file);

  const files = [];
  for (const [commodity, file] of scopeFiles) {
    try {
      const text = await fs.readFile(file, 'utf8');
      files.push({ commodity, file, text });
    } catch {
      // Ignore missing report files.
    }
  }

  const snippets = files
    .map(item => {
      const blocks = item.text
        .split(/\n{2,}/)
        .map(block => block.trim())
        .filter(Boolean)
        .map(block => ({
          block,
          score: scoreText(block.toLowerCase(), terms, item.commodity, 'general')
        }))
        .sort((a, b) => b.score - a.score);
      const best = blocks.find(entry => entry.score > 0) || blocks[0];
      if (!best) return null;
      return `${item.commodity}: ${best.block.replace(/\n+/g, ' ').slice(0, 320)}`;
    })
    .filter(Boolean);

  const summary = files.length
    ? files
        .map(item => `- ${item.commodity}: ${path.basename(item.file)}`)
        .join('\n')
    : 'No local commodity analysis files found.';

  return { files, snippets, summary };
}

async function listBookTitles() {
  try {
    const files = await fs.readdir(BOOKS_DIR);
    return files.filter(file => file.toLowerCase().endsWith('.pdf')).sort();
  } catch {
    return [];
  }
}

function scoreText(text, terms, commodity, book) {
  let score = 0;
  for (const term of terms) {
    if (text.includes(term)) score += 2;
  }
  if (commodity && text.includes(commodity)) score += 1;
  const bookName = (BOOKS[book] || BOOKS.general).name.toLowerCase();
  if (text.includes(bookName.split(' ')[0])) score += 1;
  return score;
}

async function fetchCommodityHistory(commodity, lookbackDays) {
  if (commodity === 'bitcoin') {
    return fetchBitcoinHistory(lookbackDays);
  }

  const symbol = COMMODITY_TO_SYMBOL[commodity];
  const payload = await fetchYahooChart(symbol, lookbackDays);
  return payload.points.map(point => ({
    date: point.date,
    close: point.close
  }));
}

async function fetchBitcoinMarketSnapshot() {
  try {
    const json = await fetchJson('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true');
    return {
      price: json.bitcoin?.usd,
      change24h: json.bitcoin?.usd_24h_change
    };
  } catch (error) {
    const points = await fetchBitcoinHistory(5);
    if (!points.length) throw error;
    const latest = points[points.length - 1]?.close;
    const previous = points[points.length - 2]?.close;
    return {
      price: latest,
      change24h: Number.isFinite(latest) && Number.isFinite(previous) && previous !== 0
        ? ((latest - previous) / previous) * 100
        : 0
    };
  }
}

async function fetchBitcoinHistory(lookbackDays) {
  const days = Math.max(7, lookbackDays);
  try {
    const json = await fetchJson(`https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=${days}&interval=daily`);
    const history = (json.prices || [])
      .map(([timestamp, close]) => ({
        date: new Date(timestamp).toISOString().slice(0, 10),
        close: Number(close)
      }))
      .filter(point => Number.isFinite(point.close))
      .slice(-days);
    if (history.length) return history;
  } catch (error) {
    // Fallback to Yahoo BTC history when CoinGecko chart endpoint fails.
  }

  const payload = await fetchYahooChart('BTC-USD', days);
  return payload.points;
}

async function fetchYahooChart(symbol, lookbackDays) {
  const url = `https://r.jina.ai/http://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=${Math.max(7, lookbackDays)}d&includePrePost=false`;
  const response = await fetch(url);
  const text = await response.text();
  const json = parseProxyJson(text);
  const result = json?.chart?.result?.[0];
  const timestamps = result?.timestamp || [];
  const closes = result?.indicators?.quote?.[0]?.close || [];
  const points = [];
  const seenDates = new Set();
  for (let index = 0; index < timestamps.length; index += 1) {
    const close = Number(closes[index]);
    if (!Number.isFinite(close) || close <= 0) continue;
    const date = new Date(timestamps[index] * 1000).toISOString().slice(0, 10);
    if (seenDates.has(date)) continue;
    seenDates.add(date);
    points.push({
      date,
      close
    });
  }
  return { points };
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Fetch failed: ${url}`);
  return response.json();
}

function parseProxyJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    const marker = 'Markdown Content:';
    const markerIndex = text.lastIndexOf(marker);
    if (markerIndex === -1) return null;
    return JSON.parse(text.slice(markerIndex + marker.length).trim());
  }
}

async function runLocalCommand(command, threadId) {
  if (!ENABLE_DANGEROUS_TERMINAL) {
    return { summary: 'Dangerous terminal is disabled. Set ENABLE_DANGEROUS_TERMINAL=1 to allow it.' };
  }

  const session = getShellSession(threadId);
  const wrapped = `cd ${shellEscape(session.cwd)}\n${command}\nprintf "\\n__ASTRO_PWD__=%s" "$PWD"`;
  const result = await runProcess('/bin/bash', ['-lc', wrapped], { cwd: session.cwd, timeoutMs: 60000 });
  const marker = '__ASTRO_PWD__=';
  const output = result.stdout || '';
  const markerIndex = output.lastIndexOf(marker);
  if (markerIndex !== -1) {
    const pwd = output.slice(markerIndex + marker.length).trim().split('\n')[0];
    if (pwd) session.cwd = pwd;
  }
  const cleanedStdout = markerIndex === -1 ? output : output.slice(0, markerIndex).trim();
  return {
    cwd: session.cwd,
    exitCode: result.exitCode,
    stdout: cleanedStdout,
    stderr: result.stderr.trim(),
    summary: `Command finished in ${session.cwd} with exit code ${result.exitCode}.`
  };
}

function getShellSession(threadId) {
  const key = String(threadId || 'default');
  if (!shellSessions.has(key)) {
    shellSessions.set(key, { cwd: ROOT });
  }
  return shellSessions.get(key);
}

function shellEscape(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function parseJson(text) {
  try {
    return JSON.parse(text || '{}');
  } catch {
    return {};
  }
}

function summarizeObject(value) {
  return JSON.stringify(value).slice(0, 400);
}

function formatSeriesSummary(points, prefix) {
  return points
    .map(point => `- ${point.date}: ${prefix}${Number(point.close).toFixed(2)}`)
    .join('\n');
}

function runProcess(command, args, options = {}) {
  const { cwd = ROOT, stdin = '', timeoutMs = 20000 } = options;
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, env: process.env });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`${path.basename(command)} timed out`));
    }, timeoutMs);

    child.stdout.on('data', chunk => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', chunk => {
      stderr += chunk.toString();
    });
    child.on('error', error => {
      clearTimeout(timer);
      reject(error);
    });
    child.on('close', code => {
      clearTimeout(timer);
      if (code !== 0 && stderr.trim()) {
        return reject(new Error(stderr.trim()));
      }
      return resolve({ stdout, stderr, exitCode: code });
    });

    if (stdin) child.stdin.write(stdin);
    child.stdin.end();
  });
}

async function runCodexCliAgent({ message, scope, book, history, contextBlock }) {
  const prompt = [
    'You are an integrated astrology trading and coding agent running inside the local Codex CLI.',
    'Use the provided context first, including books, backtests, astrology snapshots, and commodity analysis files.',
    'Be concise, direct, and operational.',
    'Treat planetary dates as timing windows, not exact trigger timestamps.',
    'Assume sentiment can shift 1-3 trading sessions before the listed date.',
    'Recommend acting 1-2 sessions early only when price action, volume, or momentum already confirms the expected turn.',
    'When describing bearish or bullish periods, present the listed date as the center of the window, not necessarily the first move.',
    '',
    contextBlock,
    '',
    'Recent chat history:',
    ...history.slice(-6).map(item => `${item.role}: ${String(item.content || '')}`),
    '',
    `Current commodity scope: ${scope}`,
    `Selected book: ${(BOOKS[book] || BOOKS.general).name}`,
    `User request: ${message}`
  ].join('\n');

  const args = [
    'exec',
    '-m',
    CODEX_MODEL,
    '--dangerously-bypass-approvals-and-sandbox',
    '--skip-git-repo-check',
    '--color',
    'never',
    '-C',
    ROOT,
    '-'
  ];

  const result = await runProcess('codex', args, {
    cwd: ROOT,
    stdin: prompt,
    timeoutMs: 180000
  });
  return (result.stdout || result.stderr || '').trim();
}
