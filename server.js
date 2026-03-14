const express = require('express');
const fs = require('node:fs/promises');
const path = require('node:path');
const { spawn } = require('node:child_process');

const ROOT = __dirname;
const REFERENCE_ROOT = path.resolve(ROOT, '../reference');
const REPORT_FILE = path.join(REFERENCE_ROOT, '2026-03-11_gold_silver_astro_report.md');
const BOOK_TEXT_DIR = path.join(ROOT, 'book_text');
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
const ZDI_SYSTEM_PROMPT = [
  'You are an astrology and trading assistant for gold/silver/copper/bitcoin.',
  'You have one source of truth per request: a live context block plus local reference files.',
  'When answering, prioritize concise, practical, and non-prescriptive trading guidance.',
  'Only use tools when the user explicitly asks for one of the following:',
  '- Fresh live market data',
  '- A backtest on stored historical data',
  '- Terminal command execution.',
  'Do not run terminal commands unless explicitly requested by the user.',
  'When tools run, explain what was run and then summarize results in plain language.'
].join('\\n');

const ENABLE_DANGEROUS_TERMINAL = /^(1|true|yes)$/i.test(process.env.ENABLE_DANGEROUS_TERMINAL || '');
const ENABLE_LOCAL_AGENT_TERMINAL = process.env.ENABLE_LOCAL_AGENT_TERMINAL
  ? /^(1|true|yes)$/i.test(process.env.ENABLE_LOCAL_AGENT_TERMINAL)
  : true;
const ZAI_API_URL = (process.env.ZAI_API_URL || 'https://api.z.ai/api/coding/paas/v4').replace(/\/+$/, '');
const ZAI_API_KEY = process.env.ZAI_API_KEY || process.env.ZAI_TOKEN || '';
const ZAI_MODELS = [
  process.env.ZAI_PRIMARY_MODEL || 'glm-4.7',
  process.env.ZAI_FALLBACK_MODEL || 'GLM-4.7-Flash'
].filter(Boolean);
const STRATEGY_FILE_CANDIDATES = ['strategy.md', 'strategy.txt', 'trading-strategy.md', 'trading-strategy.txt'];
const COMMODITY_KEYS = Object.keys(COMMODITY_TO_SYMBOL);
const AGENT_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'get_market_snapshot',
      description: 'Get a fresh market snapshot for a commodity. Use for live prices, returns, and recent series when user asks about current context or chart-ready behavior.',
      parameters: {
        type: 'object',
        properties: {
          commodity: {
            type: 'string',
            enum: [...COMMODITY_KEYS, 'overview']
          },
          days: {
            type: 'number',
            minimum: 7,
            maximum: 365,
            description: 'Optional number of recent days to include'
          }
        },
        required: ['commodity']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'run_backtest',
      description: 'Run astrology-based backtest logic on stored historical data for a commodity.',
      parameters: {
        type: 'object',
        properties: {
          commodity: {
            type: 'string',
            enum: [...COMMODITY_KEYS, 'overview']
          },
          lookbackDays: {
            type: 'number',
            minimum: 30,
            maximum: 3650,
            description: 'Optional backtest window in days'
          }
        },
        required: ['commodity']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'run_terminal_command',
      description: 'Execute a shell command for data/file inspection or user-requested terminal tasks. Use only if the user explicitly asks for terminal action.',
      parameters: {
        type: 'object',
        properties: {
          command: {
            type: 'string',
            description: 'Full shell command to execute.'
          },
          threadId: {
            type: 'string',
            description: 'Conversation thread identifier for persistent terminal session state.'
          }
        },
        required: ['command']
      }
    }
  }
];

function getAgentTools({ terminalAccess }) {
  return AGENT_TOOLS.filter(tool => {
    const name = tool?.function?.name;
    if (name !== 'run_terminal_command') return true;
    return terminalAccess;
  });
}

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

const cache = {
  strategyContext: null,
  books: null
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
    zaiConfigured: Boolean(ZAI_API_KEY),
    zaiModels: ZAI_MODELS,
    dangerousTerminalEnabled: ENABLE_DANGEROUS_TERMINAL,
    localAgentTerminalEnabled: ENABLE_LOCAL_AGENT_TERMINAL
  });
});

app.post('/api/agent/stream', async (req, res) => {
  setupSse(res);
  const {
    message = '',
    commodity = 'overview',
    book = 'general',
    threadId = 'default',
    history = [],
    allowTerminal = false
  } = req.body || {};
  const scope = COMMODITY_GUIDANCE[commodity] ? commodity : 'overview';
  const terminalAccess = isTerminalAllowedForRequest(req, allowTerminal);

  try {
    sendEvent(res, 'status', { message: 'Preparing guidance, books, and live data' });
    const [marketSnapshot, astrologySnapshot, backtestSummary, referenceSummary, commodityFiles] = await Promise.all([
      getMarketSnapshot(scope),
      getAstrologySnapshot(scope),
      getBacktestSummary(scope),
      searchReferenceContext(message, scope, book),
      getAllCommodityContext(message)
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

    sendEvent(res, 'status', { message: 'Running ZDI agentic flow (GLM 4.7) with live context and tools' });
    try {
      await runZdiAgent({
        message,
        scope,
        book,
        threadId,
        history,
        contextBlock,
        terminalAccess,
        res
      });
    } catch (agentError) {
      sendEvent(res, 'status', { message: 'ZDI model unavailable, using local context summary fallback.' });
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
        `Model error: ${agentError.message || 'Unknown model error'}`
      ].join('\n');
      streamText(res, fallback);
      sendEvent(res, 'final', { content: fallback });
      return;
    }
    return res.end();
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
  const bookContext = referenceSummary.booksSummary || 'No local book context available.';
  const strategyContext = referenceSummary.strategySummary || 'No additional strategy context file found.';
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
    `All commodity analysis files:\n${commodityFiles.summary}`,
    '',
    `Commodity analysis snippets:\n${commodityFiles.snippets.length ? commodityFiles.snippets.map(item => `- ${item}`).join('\n') : 'No snippets available.'}`,
    '',
    `Local strategy context:\n${strategyContext}`,
    '',
    `All local books context:\n${bookContext}`
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
    .slice(0, 3)
    .map(item => item.text.slice(0, 320));

  const bookCorpus = await loadBookTextCorpus();
  const matchingBooks = (bookCorpus.books || [])
    .filter(entry => scoreText(entry.text.toLowerCase(), lowerTerms, commodity, book) > 0)
    .slice(0, 4)
    .map(entry => entry.file);

  const commodityFileContext = await loadCommodityFileContext(Object.entries(COMMODITY_REPORT_FILES), lowerTerms);
  const bookSnippets = bookCorpus.books.map(entry => {
    const snippet = summarizeTextForContext(entry.text, lowerTerms, entry.file, 420);
    return `${entry.file}: ${snippet}`;
  }).filter(Boolean);
  const booksSummary = bookCorpus.books.length
    ? `Available local books: ${bookCorpus.books.map(entry => entry.file).join(', ')}\n\n` +
      `Relevant local books: ${matchingBooks.length ? matchingBooks.join(', ') : 'General summary from all local books'}\n\n` +
      `Top local book snippets:\n- ${bookSnippets.slice(0, 8).join('\n- ')}`
    : 'No local book text files found.';
  const strategySummary = await loadStrategyContext();

  const summaryParts = [];
  if (passages.length) {
    summaryParts.push(`Relevant report notes:\n- ${passages.join('\n- ')}`);
  }
  summaryParts.push(`All books context:\n${booksSummary}`);
  summaryParts.push(`Strategy context:\n${strategySummary}`);
  if (commodityFileContext.snippets.length) {
    summaryParts.push(`Commodity analysis snippets:\n- ${commodityFileContext.snippets.join('\n- ')}`);
  }
  return {
    passages,
    matchingBooks,
    commodityFiles: commodityFileContext.files,
    booksSummary,
    strategySummary,
    summary: summaryParts.join('\n\n')
  };
}

function summarizeTextForContext(text = '', terms = [], source = '', maxLen = 420) {
  const blocks = String(text)
    .replace(/\r/g, '')
    .split(/\n{2,}/)
    .map(block => block.replace(/\n+/g, ' ').trim())
    .filter(Boolean)
    .map(block => ({
      block,
      score: scoreText(block.toLowerCase(), terms, source, 'general')
    }))
    .sort((a, b) => b.score - a.score);

  if (!blocks.length) return '';
  const picks = blocks.slice(0, Math.max(1, Math.min(2, blocks.length)));
  return picks.map(item => item.block).join('\n').slice(0, maxLen);
}

async function loadCommodityFileContext(scopeEntries = Object.entries(COMMODITY_REPORT_FILES), terms = []) {
  const scopeFiles = scopeEntries.filter(([, file]) => typeof file === 'string' && file);

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

async function getAllCommodityContext(query = '') {
  const terms = String(query || '').toLowerCase().split(/[^a-z0-9]+/).filter(term => term.length > 2);
  return loadCommodityFileContext(Object.entries(COMMODITY_REPORT_FILES), terms);
}

async function loadBookTextCorpus() {
  if (cache.books) return cache.books;

  const entries = [];
  try {
    const files = await fs.readdir(BOOK_TEXT_DIR);
    const textFiles = files.filter(file => file.toLowerCase().endsWith('.txt')).sort();
    const loaded = await Promise.all(textFiles.map(async file => {
      try {
        return {
          file,
          text: await fs.readFile(path.join(BOOK_TEXT_DIR, file), 'utf8')
        };
      } catch {
        return null;
      }
    }));
    loaded.filter(Boolean).forEach(item => entries.push(item));
  } catch {
    cache.books = { books: [] };
    return cache.books;
  }

  cache.books = { books: entries };
  return cache.books;
}

async function loadStrategyContext() {
  if (cache.strategyContext !== null) {
    return cache.strategyContext;
  }

  let strategyText = '';
  for (const candidate of STRATEGY_FILE_CANDIDATES) {
    const candidatePath = path.join(ROOT, candidate);
    try {
      strategyText = await fs.readFile(candidatePath, 'utf8');
      break;
    } catch {
      // Keep scanning for available strategy file candidates.
    }
  }

  cache.strategyContext = strategyText ? strategyText.trim() : 'No extra strategy input file found.';
  return cache.strategyContext;
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

function isLocalRequest(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const remote = forwarded || req.socket?.remoteAddress || '';
  const host = String(req.headers.host || '');
  return (
    remote === '127.0.0.1' ||
    remote === '::1' ||
    remote === '::ffff:127.0.0.1' ||
    host.startsWith('localhost:') ||
    host.startsWith('127.0.0.1:')
  );
}

function isTerminalAllowedForRequest(req, allowTerminal) {
  if (!allowTerminal) return false;
  if (ENABLE_DANGEROUS_TERMINAL) return true;
  return ENABLE_LOCAL_AGENT_TERMINAL && isLocalRequest(req);
}

async function runLocalCommand(command, threadId, terminalAccess) {
  const safeCommand = String(command || '').trim();
  if (!safeCommand) {
    return { summary: 'No command provided.' };
  }
  if (!terminalAccess) {
    return {
      summary: 'Terminal access is disabled for this chat. Enable the Agent Terminal toggle locally or set ENABLE_DANGEROUS_TERMINAL=1.'
    };
  }

  const session = getShellSession(threadId);
  const wrapped = `cd ${shellEscape(session.cwd)}\n${safeCommand}\nprintf "\\n__ASTRO_PWD__=%s" "$PWD"`;
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

function normalizeHistoryMessages(history) {
  return Array.isArray(history)
    ? history
        .map(item => {
          if (!item || typeof item !== 'object') return null;
          const role = item.role === 'assistant' ? 'assistant' : 'user';
          const content = String(item.content || '').trim();
          if (!content) return null;
          return { role, content };
        })
        .filter(Boolean)
    : [];
}

function normalizeToolArguments(rawArgs) {
  if (typeof rawArgs === 'object' && rawArgs !== null) return rawArgs;
  if (typeof rawArgs === 'string') {
    try {
      return JSON.parse(rawArgs);
    } catch {
      return {};
    }
  }
  return {};
}

function toPositiveInt(value, fallback, min = 1, max = Number.MAX_SAFE_INTEGER) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function normalizeToolCommodity(value, fallback) {
  const candidate = String(value || fallback || '').toLowerCase();
  if (candidate && COMMODITY_GUIDANCE[candidate]) return candidate;
  if (candidate === 'overview') return fallback || 'overview';
  return fallback || 'overview';
}

function summarizeForToolResult(result, maxLen = 2400) {
  return summarizeObject(result).slice(0, maxLen);
}

function parseToolCall(call) {
  const toolName = call?.function?.name || call?.name;
  const args = normalizeToolArguments(call?.function?.arguments);
  return {
    id: call?.id || `${toolName || 'tool'}_${Date.now()}`,
    name: toolName,
    args
  };
}

function buildAgentMessages({ message, scope, book, history, contextBlock }) {
  const selectedBook = BOOKS[book] || BOOKS.general;
  return [
    { role: 'system', content: ZDI_SYSTEM_PROMPT },
    { role: 'system', content: `Selected commodity: ${scope}` },
    { role: 'system', content: `Selected book: ${selectedBook.name}` },
    { role: 'system', content: contextBlock },
    { role: 'system', content: `Current book summary: ${selectedBook.summary}` },
    ...normalizeHistoryMessages(history).slice(-8),
    { role: 'user', content: `User request: ${String(message || '').trim()}` }
  ];
}

async function executeToolCall(toolCall, scope, threadId, terminalAccess) {
  if (toolCall.name === 'get_market_snapshot') {
    const commodity = normalizeToolCommodity(toolCall.args.commodity, scope);
    const days = toPositiveInt(toolCall.args.days, 10, 1, 365);
    const snapshot = await getMarketSnapshot(commodity, days);
    return {
      kind: 'market_snapshot',
      commodity,
      summary: snapshot.summary,
      snapshot
    };
  }

  if (toolCall.name === 'run_backtest') {
    const commodity = normalizeToolCommodity(toolCall.args.commodity, scope);
    const lookbackDays = toPositiveInt(toolCall.args.lookbackDays, 180, 30, 3650);
    const summary = await getBacktestSummary(commodity, lookbackDays);
    return {
      kind: 'backtest',
      commodity,
      lookbackDays,
      summary
    };
  }

  if (toolCall.name === 'run_terminal_command') {
    const command = String(toolCall.args.command || '').trim();
    return runLocalCommand(command, toolCall.args.threadId || threadId, terminalAccess);
  }

  return { summary: `Unsupported tool call: ${toolCall.name}` };
}

async function callZdiModel({ messages, tools, stream }) {
  if (!ZAI_API_KEY) {
    throw new Error('ZAI API key is not configured. Set ZAI_API_KEY in environment variables.');
  }

  const toolPayload = tools ? { tools, tool_choice: 'auto' } : {};
  let lastError = null;
  for (const model of ZAI_MODELS) {
    try {
      const response = await fetch(`${ZAI_API_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ZAI_API_KEY}`
        },
        body: JSON.stringify({
          model,
          messages,
          ...toolPayload,
          temperature: 0.25,
          max_tokens: 2200,
          stream
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        let message = `API error (${response.status})`;
        try {
          const payload = JSON.parse(errorText);
          message = payload?.error?.message || payload?.message || message;
        } catch {
          if (errorText) message = errorText;
        }
        throw new Error(message);
      }

      return stream ? response : response.json();
    } catch (error) {
      lastError = error;
      console.warn('ZDI model call failed, trying fallback:', error.message);
    }
  }

  throw lastError || new Error('No ZDI model succeeded');
}

async function streamZdiCompletion(messages, res) {
  const response = await callZdiModel({
    messages,
    stream: true,
    tools: null
  });
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullText = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split('\n').filter(line => line.trim() !== '');
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6).trim();
      if (data === '[DONE]') continue;
      try {
        const payload = JSON.parse(data);
        const delta = payload.choices?.[0]?.delta?.content;
        if (delta) {
          fullText += delta;
          sendEvent(res, 'delta', { content: fullText });
        }
      } catch (error) {
        // Ignore malformed JSON from streaming transport.
      }
    }
  }

  return fullText;
}

async function runZdiAgent({ message, scope, book, threadId, history, contextBlock, terminalAccess, res }) {
  const messages = buildAgentMessages({
    message,
    scope,
    book,
    history,
    contextBlock
  });

  const maxToolTurns = 2;
  let turn = 0;
  while (turn < maxToolTurns) {
    turn += 1;
    const plan = await callZdiModel({
      messages,
      tools: getAgentTools({ terminalAccess }),
      stream: false
    });
    const assistantMessage = plan?.choices?.[0]?.message;
    if (!assistantMessage) {
      throw new Error('No response from ZDI model');
    }

    const toolCalls = Array.isArray(assistantMessage.tool_calls)
      ? assistantMessage.tool_calls.map(parseToolCall).filter(Boolean)
      : [];

    if (!toolCalls.length) {
      const finalMessages = [
        ...messages,
        {
          role: 'assistant',
          content: assistantMessage.content || ''
        }
      ];
      sendEvent(res, 'status', { message: 'Generating final response' });
      const finalText = await streamZdiCompletion(finalMessages, res);
      if (!finalText) {
        throw new Error('ZDI model returned an empty answer');
      }
      sendEvent(res, 'final', { content: finalText });
      return;
    }

    messages.push({
      role: 'assistant',
      content: assistantMessage.content || '',
      tool_calls: assistantMessage.tool_calls || []
    });

    for (const toolCall of toolCalls) {
      if (!toolCall.name) continue;
      sendEvent(res, 'tool', { name: toolCall.name, arguments: toolCall.args });
      const result = await executeToolCall(toolCall, scope, threadId, terminalAccess);
      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        name: toolCall.name,
        content: JSON.stringify(result)
      });
      sendEvent(res, 'tool_result', {
        name: toolCall.name,
        result: summarizeForToolResult(result)
      });
    }
  }

  const fallback = 'I collected enough execution context, but can only run a limited number of tool steps per message. Please ask one follow-up for a single result.';
  sendEvent(res, 'error', { message: fallback });
  streamText(res, fallback);
  sendEvent(res, 'final', { content: fallback });
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
