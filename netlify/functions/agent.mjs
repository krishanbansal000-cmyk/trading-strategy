import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const ZAI_API_URL = (process.env.ZAI_API_URL || 'https://api.z.ai/api/coding/paas/v4').replace(/\/+$/, '');
const ZAI_API_KEY = process.env.ZAI_API_KEY || process.env.ZAI_TOKEN || '';
const ZAI_MODELS = [
  process.env.ZAI_PRIMARY_MODEL || 'glm-4.7',
  process.env.ZAI_FALLBACK_MODEL || 'GLM-4.7-Flash'
].filter(Boolean);
const ANALYSIS_FILES = {
  gold: 'gold_analysis_2026-03-13.md',
  silver: 'silver_analysis_2026-03-13.md',
  copper: 'copper_analysis_2026-03-13.md',
  bitcoin: 'bitcoin_analysis_2026-03-13.md'
};
const BOOK_TEXT_FILES = [
  'book_text/1. Vedic Financial Astrology.txt',
  'book_text/Bayer, George (1937) - Time Factors in the Stock Market [78 p.].txt',
  'book_text/Bayer, George (1937-40) - Preview of Markets [137 p.].txt',
  'book_text/Bayer, George (1939) - Preview of Markets [136 p.].txt',
  'book_text/Bayer, George (1941) - Gold Nuggets for Stock & Commodity Traders [36 p.].txt',
  'book_text/Gillen, Jack (1979) - The Key to Speculation on the NYSE [151 p.].txt',
  'book_text/Magi Astrology : Financial Astrology.txt'
];
const STRATEGY_FILE_CANDIDATES = ['strategy.md', 'strategy.txt', 'trading-strategy.md', 'trading-strategy.txt'];
const COMMODITY_SYMBOLS = {
  gold: 'TATAGOLD.NS',
  silver: 'GROWWSLVR.NS',
  copper: 'HINDCOPPER.NS',
  bitcoin: 'BTC-USD'
};
const BOOKS = {
  general: {
    name: 'Financial Astrology',
    summary: 'Multi-book financial astrology trading context with timing windows and asset-specific planetary associations.'
  },
  gann: {
    name: 'W.D. Gann Methods',
    summary: 'Time-cycle oriented reading emphasizing price/time relationships, anniversaries, and geometric timing.'
  },
  vedic: {
    name: 'Vedic Astrology',
    summary: 'Vedic timing, nakshatras, dashas, and muhurta framing for financial decisions.'
  },
  personal: {
    name: 'Your Birth Chart',
    summary: 'Birth chart for Aug 29 2000, 9:39PM IST, Gurugram. Jupiter in Taurus supports wealth; Venus debilitated adds caution on copper.'
  }
};
const COMMODITIES = {
  gold: {
    name: 'Tata Gold ETF',
    context: 'Gold is ruled by the Sun. Strong windows center around Sun in Aries and Sun in Leo. Avoid overconfidence near Sun in Libra.'
  },
  silver: {
    name: 'Groww Silver ETF',
    context: 'Silver is ruled by the Moon. Favor Taurus-Moon and lunar reversal windows. Treat fragile charts cautiously.'
  },
  copper: {
    name: 'Hindustan Copper',
    context: 'Copper is ruled by Venus. The key recovery zone is Venus in Taurus; danger rises into the Venus-in-Virgo weakness window.'
  },
  bitcoin: {
    name: 'Bitcoin',
    context: 'Bitcoin is treated through Rahu timing. Favor the broader constructive cycle while Rahu support remains intact.'
  }
};
const TIMING_WINDOW_GUIDANCE = `TIMING WINDOW RULES:
- Treat all planetary dates as timing windows, not exact timestamps.
- Assume market sentiment can shift 1-3 trading sessions before the listed planetary date.
- For bearish windows, it is acceptable to reduce longs or sell partial positions 1-2 sessions early if price action is already weakening.
- For bullish windows, it is acceptable to accumulate 1-2 sessions early if price action is stabilizing or turning up.
- Never present the date itself as a guaranteed first-move day; describe it as the center of the turn window.
- Always mention that early action is stronger when confirmed by price, volume, or momentum.`;

let staticContextPromise = null;

function encodeLine(controller, event) {
  controller.enqueue(`${JSON.stringify(event)}\n`);
}

function normalizeModelContent(content) {
  if (typeof content === 'string') return content.trim();
  if (Array.isArray(content)) {
    return content.map(part => {
      if (typeof part === 'string') return part;
      if (part?.type === 'text') return part.text || '';
      return '';
    }).join('').trim();
  }
  return '';
}

async function safeRead(relativePath) {
  try {
    return await fs.readFile(path.join(ROOT, relativePath), 'utf8');
  } catch {
    return '';
  }
}

function summarizeAnalysisText(text) {
  return String(text || '')
    .replace(/\r/g, '')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#') && !line.startsWith('|---'))
    .slice(0, 14)
    .join('\n')
    .slice(0, 1800);
}

function normalizeSearchTerms(query, commodity, book) {
  return [...new Set(
    `${query} ${commodity || ''} ${book || ''} timing astrology support resistance strategy one day before two days before`
      .toLowerCase()
      .match(/[a-z0-9]{3,}/g) || []
  )];
}

function scoreSnippet(text, terms) {
  const haystack = String(text || '').toLowerCase();
  return terms.reduce((score, term) => score + (haystack.includes(term) ? 2 : 0), 0);
}

function splitParagraphs(text) {
  return String(text || '')
    .replace(/\r/g, '')
    .split(/\n{2,}/)
    .map(chunk => chunk.replace(/\n+/g, ' ').trim())
    .filter(chunk => chunk.length > 80);
}

function extractRelevantSnippets(paragraphs, terms, maxSnippets = 2, maxChars = 1100) {
  const ranked = paragraphs
    .map(chunk => ({ chunk, score: scoreSnippet(chunk, terms) }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score || a.chunk.length - b.chunk.length)
    .slice(0, maxSnippets)
    .map(item => item.chunk);
  return (ranked.length ? ranked : paragraphs.slice(0, 1)).join('\n').slice(0, maxChars);
}

async function loadStaticContext() {
  if (!staticContextPromise) {
    staticContextPromise = (async () => {
      const analyses = Object.fromEntries(
        (await Promise.all(
          Object.entries(ANALYSIS_FILES).map(async ([key, file]) => [key, await safeRead(file)])
        )).filter(([, text]) => text)
      );

      const books = (await Promise.all(
        BOOK_TEXT_FILES.map(async file => {
          const text = await safeRead(file);
          return {
            file,
            name: path.basename(file, '.txt'),
            paragraphs: splitParagraphs(text)
          };
        })
      )).filter(entry => entry.paragraphs.length);

      let strategy = 'No extra strategy input file found.';
      let strategyFile = null;
      for (const file of STRATEGY_FILE_CANDIDATES) {
        const text = (await safeRead(file)).trim();
        if (text) {
          strategy = text;
          strategyFile = file;
          break;
        }
      }

      return { analyses, books, strategy, strategyFile };
    })();
  }
  return staticContextPromise;
}

function zodiacSignForMonthRule(dateString, commodity) {
  const date = new Date(dateString);
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  if (commodity === 'gold') return ((month === 3 && day >= 20) || (month === 4 && day <= 19) || (month === 8 && day >= 16) || (month === 9 && day <= 16)) ? 1 : 0;
  if (commodity === 'copper') return (month === 4 && day >= 1 && day <= 25) ? 1 : 0;
  if (commodity === 'bitcoin') return date <= new Date('2026-06-30T00:00:00Z') ? 1 : 0;
  if (commodity === 'silver') return [5, 6, 7, 18, 19, 20, 29, 30].includes(day) ? 1 : 0;
  return 0;
}

function runBacktest(commodity, prices) {
  let strategyReturn = 1;
  let buyHoldReturn = 1;
  let wins = 0;
  let trades = 0;
  for (let i = 0; i < prices.length - 1; i += 1) {
    const currentClose = Number(prices[i]?.close);
    const nextClose = Number(prices[i + 1]?.close);
    if (!Number.isFinite(currentClose) || !Number.isFinite(nextClose) || currentClose <= 0) continue;
    const dailyReturn = nextClose / currentClose;
    buyHoldReturn *= dailyReturn;
    if (zodiacSignForMonthRule(prices[i].date, commodity) === 1) {
      strategyReturn *= dailyReturn;
      trades += 1;
      if (nextClose > currentClose) wins += 1;
    }
  }
  const strategyPct = (strategyReturn - 1) * 100;
  const buyHoldPct = (buyHoldReturn - 1) * 100;
  const winRate = trades ? (wins / trades) * 100 : 0;
  return {
    summary: `Rule-based astrology backtest for ${commodity}: ${strategyPct.toFixed(2)}% strategy return vs ${buyHoldPct.toFixed(2)}% buy-and-hold, ${winRate.toFixed(2)}% win rate across ${trades} active trade days.`
  };
}

function shouldRunBacktest(message) {
  return /(backtest|win rate|buy and hold|compare strategy|historical performance)/i.test(message || '');
}

function shouldReturnChart(message) {
  return /(chart|plot|graph|show.*trend|display.*trend|visuali[sz]e)/i.test(message || '');
}

function formatChartPayload(commodity, priceHistory) {
  if (commodity === 'overview') {
    const goldSeries = Array.isArray(priceHistory?.gold) ? priceHistory.gold.slice(-7) : [];
    const silverSeries = Array.isArray(priceHistory?.silver) ? priceHistory.silver.slice(-7) : [];
    const labelsSource = goldSeries.length ? goldSeries : silverSeries;
    if (!labelsSource.length) return null;
    return {
      type: 'line',
      title: 'Gold vs Silver 7-day trend',
      labels: labelsSource.map(point => point.date || point.label || ''),
      datasets: [
        { label: 'Tata Gold ETF', data: goldSeries.map(point => Number(point.price)), borderColor: '#fbbf24', backgroundColor: 'rgba(251,191,36,0.12)' },
        { label: 'Groww Silver ETF', data: silverSeries.map(point => Number(point.price)), borderColor: '#c0c0c0', backgroundColor: 'rgba(192,192,192,0.12)' }
      ]
    };
  }
  const series = Array.isArray(priceHistory?.[commodity]) ? priceHistory[commodity].slice(-7) : [];
  if (!series.length) return null;
  const colors = { gold: '#fbbf24', silver: '#c0c0c0', copper: '#cd7f32', bitcoin: '#f7931a' };
  return {
    type: 'line',
    title: `${(COMMODITIES[commodity] || { name: commodity }).name} 7-day trend`,
    labels: series.map(point => point.date || point.label || ''),
    datasets: [
      {
        label: (COMMODITIES[commodity] || { name: commodity }).name,
        data: series.map(point => Number(point.price)),
        borderColor: colors[commodity] || '#fbbf24',
        backgroundColor: 'rgba(251,191,36,0.12)'
      }
    ]
  };
}

async function fetchYahooHistory(symbol, lookbackDays = 120) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=${Math.max(30, lookbackDays)}d&includePrePost=false`;
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`Yahoo history failed (${response.status}) for ${symbol}`);
    const jsonBody = await response.json();
    const result = jsonBody?.chart?.result?.[0];
    const timestamps = result?.timestamp || [];
    const closes = result?.indicators?.quote?.[0]?.close || [];
    return timestamps.map((timestamp, index) => {
      const close = Number(closes[index]);
      if (!Number.isFinite(close)) return null;
      return { date: new Date(timestamp * 1000).toISOString().slice(0, 10), close };
    }).filter(Boolean);
  } finally {
    clearTimeout(timeout);
  }
}

async function maybeBuildBacktestContext(message, commodity) {
  if (!shouldRunBacktest(message)) return null;
  const symbol = COMMODITY_SYMBOLS[commodity];
  if (!symbol) return null;
  try {
    const history = await fetchYahooHistory(symbol, 120);
    return history.length ? runBacktest(commodity, history) : null;
  } catch (error) {
    return { summary: `Backtest unavailable: ${error.message}` };
  }
}

function buildContextPack(staticContext, payload) {
  const terms = normalizeSearchTerms(payload.message, payload.commodity, payload.book);
  const selectedBookName = (BOOKS[payload.book] || BOOKS.general).name;
  const primaryAnalysis = staticContext.analyses[payload.commodity] || '';
  const supportingBookSnippets = staticContext.books
    .map(entry => ({
      entry,
      score: entry.name.includes(selectedBookName) ? 1000 : scoreSnippet(entry.paragraphs.join(' '), terms)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map(({ entry }, index) => {
      const prefix = index === 0 ? '[PRIMARY BOOK]' : '[SUPPORTING BOOK]';
      return `${prefix} ${entry.name}\n${extractRelevantSnippets(entry.paragraphs, terms, entry.name.includes(selectedBookName) ? 3 : 2, entry.name.includes(selectedBookName) ? 1300 : 850)}`;
    })
    .join('\n\n');
  return {
    analysisDigest: primaryAnalysis
      ? `[PRIMARY FILE] ${(COMMODITIES[payload.commodity] || { name: payload.commodity }).name}\n${summarizeAnalysisText(primaryAnalysis)}`
      : '',
    booksDigest: supportingBookSnippets,
    strategyDigest: [
      TIMING_WINDOW_GUIDANCE,
      '',
      'Execution rules:',
      '- Treat one day before and two days before as valid early windows only with price confirmation.',
      '- Mention invalidation and confirmation levels instead of claiming certainty.',
      '',
      `Optional strategy file: ${staticContext.strategyFile || 'none found'}`,
      String(staticContext.strategy || '').slice(0, 2500)
    ].join('\n')
  };
}

function buildMessages(payload, contextPack, backtest) {
  const commodity = COMMODITIES[payload.commodity] || null;
  const selectedBook = BOOKS[payload.book] || BOOKS.general;
  return [
    {
      role: 'system',
      content: [
        'You are ZDI, a server-side astrology and trading assistant for gold, silver, copper, and bitcoin.',
        `Primary model target: ${ZAI_MODELS[0]}.`,
        'Do not mention browser keys, Codex, OpenClaw, or terminal access.',
        'Be practical, concise, and explicit about risk and invalidation.',
        'Treat all dates as timing windows, not exact reversal timestamps.',
        '',
        `Selected commodity: ${commodity ? commodity.name : 'Overview / cross-market'}`,
        `Selected reference book: ${selectedBook.name}`,
        `Selected profile: ${BOOKS.personal.summary}`,
        '',
        'Commodity context:',
        commodity ? commodity.context : BOOKS.general.summary,
        '',
        'Live market context from frontend:',
        String(payload.liveMarketContext || '').slice(0, 2200),
        '',
        'Analysis digest:',
        contextPack.analysisDigest,
        '',
        'Books digest:',
        contextPack.booksDigest,
        '',
        'Strategy digest:',
        contextPack.strategyDigest,
        '',
        backtest ? `Backtest context:\n${backtest.summary}` : 'Backtest context: not requested.'
      ].join('\n')
    },
    ...(Array.isArray(payload.history) ? payload.history : []).map(item => ({ role: item.role, content: item.content })),
    {
      role: 'user',
      content: [
        `User question: ${payload.message}`,
        '',
        'Response requirements:',
        '- Lead with the direct answer.',
        '- Mention the strongest local file or book basis when relevant.',
        '- If a chart was requested, describe what the chart shows in plain language.',
        '- Include action, risk, and confirmation guidance.'
      ].join('\n')
    }
  ];
}

function buildLocalFallbackReply(payload, contextPack, backtest, chart) {
  const commodity = COMMODITIES[payload.commodity] || { name: 'Market overview', context: BOOKS.general.summary };
  const chartNote = chart
    ? `A 7-day chart is attached for ${commodity.name}, so use the latest slope and recent swing structure as the first confirmation layer.`
    : 'No inline chart payload was available, so rely on the live market context summary.';
  const backtestNote = backtest?.summary
    ? `Backtest note: ${backtest.summary}`
    : 'Backtest was not requested or not available in time for this turn.';
  return [
    `${commodity.name}: use this as a timing-window setup, not an exact reversal date.`,
    chartNote,
    `Core bias: ${commodity.context}`,
    `Strategy emphasis: ${String(contextPack.strategyDigest).split('\n').slice(0, 4).join(' ')}`,
    `Local file basis: ${String(contextPack.analysisDigest).split('\n').slice(0, 4).join(' ')}`,
    backtestNote,
    'Action: wait for price confirmation before sizing up, and treat one to two sessions before the timing window as valid only if momentum is already aligning.'
  ].join('\n\n');
}

function withTimeout(promise, ms, label) {
  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
}

async function callZaiModel(model, messages, timeoutMs) {
  const abortController = new AbortController();
  const timer = setTimeout(() => abortController.abort(), timeoutMs);
  try {
    const response = await withTimeout(fetch(`${ZAI_API_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ZAI_API_KEY}`
      },
      body: JSON.stringify({
        model,
        temperature: 0.3,
        max_tokens: 550,
        stream: false,
        messages
      }),
      signal: abortController.signal
    }), timeoutMs, `${model} request`);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`${model} failed (${response.status}): ${errorText.slice(0, 220)}`);
    }
    const payload = await withTimeout(response.json(), 4000, `${model} response parsing`);
    const reply = normalizeModelContent(payload?.choices?.[0]?.message?.content);
    if (!reply) throw new Error(`${model} returned empty content.`);
    return reply;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchModelResponse(messages, controller, fallbackContext) {
  let lastError = null;
  for (let index = 0; index < ZAI_MODELS.length; index += 1) {
    const model = ZAI_MODELS[index];
    try {
      encodeLine(controller, { type: 'status', message: `Calling ${model}` });
      const reply = await callZaiModel(model, messages, index === 0 ? 9000 : 6500);
      encodeLine(controller, { type: 'status', message: 'Formatting response' });
      encodeLine(controller, { type: 'delta', content: reply });
      return { model, reply };
    } catch (error) {
      lastError = error;
      encodeLine(controller, { type: 'status', message: `${model} fallback` });
    }
  }
  const fallbackReply = buildLocalFallbackReply(
    fallbackContext.payload,
    fallbackContext.contextPack,
    fallbackContext.backtest,
    fallbackContext.chart
  );
  encodeLine(controller, { type: 'status', message: 'Using local fallback' });
  encodeLine(controller, { type: 'delta', content: fallbackReply });
  return {
    model: 'local-fallback',
    reply: fallbackReply,
    error: lastError?.message || 'ZAI request failed.'
  };
}

async function runAgent(payload, controller) {
  if (process.env.MOCK_ZAI === '1') {
    const reply = `Mocked Netlify agent reply for ${payload.commodity || 'overview'}. The function received local books, analysis context, streaming updates, and chart support correctly.`;
    const chart = shouldReturnChart(payload.message) ? formatChartPayload(payload.commodity, payload.priceHistory || {}) : null;
    encodeLine(controller, { type: 'status', message: 'Mock agent ready' });
    encodeLine(controller, { type: 'delta', content: reply });
    encodeLine(controller, { type: 'final', model: ZAI_MODELS[0], chart, reply });
    return;
  }

  if (!ZAI_API_KEY) throw new Error('ZAI_API_KEY is not configured in Netlify environment variables.');

  encodeLine(controller, { type: 'status', message: 'Loading context' });
  const staticContext = await loadStaticContext();
  const contextPack = buildContextPack(staticContext, payload);
  const chart = shouldReturnChart(payload.message) ? formatChartPayload(payload.commodity, payload.priceHistory || {}) : null;

  let backtest = null;
  if (shouldRunBacktest(payload.message)) {
    encodeLine(controller, { type: 'status', message: 'Running backtest' });
    backtest = await withTimeout(
      maybeBuildBacktestContext(payload.message, payload.commodity),
      5000,
      'backtest'
    ).catch(error => ({ summary: `Backtest unavailable: ${error.message}` }));
  }

  encodeLine(controller, { type: 'status', message: 'Preparing model request' });
  const messages = buildMessages(payload, contextPack, backtest);
  const result = await fetchModelResponse(messages, controller, { payload, contextPack, backtest, chart });
  encodeLine(controller, {
    type: 'final',
    model: result.model,
    chart,
    backtest: backtest?.summary || null,
    reply: result.reply,
    error: result.error || null
  });
}

export default async (request) => {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  let payload = {};
  try {
    payload = await request.json();
  } catch {
    payload = {};
  }

  const stream = new ReadableStream({
    async start(controller) {
      try {
        await runAgent(payload, controller);
      } catch (error) {
        encodeLine(controller, { type: 'error', message: error.message || 'Agent failed.' });
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });
};
