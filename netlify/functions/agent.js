const fs = require('node:fs/promises');
const path = require('node:path');

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
    summary: 'Vedic timing, nakshatras, dashas, and muhurta style framing for financial decisions.'
  },
  personal: {
    name: 'Your Birth Chart',
    summary: 'Birth chart for Aug 29 2000, 9:39PM IST, Gurugram. Jupiter in Taurus wealth support, Venus debilitated caution on copper.'
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

function json(statusCode, payload) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store'
    },
    body: JSON.stringify(payload)
  };
}

function normalizeModelContent(content) {
  if (typeof content === 'string') return content.trim();
  if (Array.isArray(content)) {
    return content
      .map(part => {
        if (typeof part === 'string') return part;
        if (part?.type === 'text') return part.text || '';
        return '';
      })
      .join('')
      .trim();
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
    .slice(0, 18)
    .join('\n')
    .slice(0, 2400);
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

function extractRelevantSnippets(text, terms, maxSnippets = 2, maxChars = 1200) {
  const paragraphs = String(text || '')
    .replace(/\r/g, '')
    .split(/\n{2,}/)
    .map(chunk => chunk.replace(/\n+/g, ' ').trim())
    .filter(chunk => chunk.length > 80);

  const ranked = paragraphs
    .map(chunk => ({ chunk, score: scoreSnippet(chunk, terms) }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score || a.chunk.length - b.chunk.length)
    .slice(0, maxSnippets)
    .map(item => item.chunk);

  return (ranked.length ? ranked : paragraphs.slice(0, 1)).join('\n').slice(0, maxChars);
}

function zodiacSignForMonthRule(dateString, commodity) {
  const date = new Date(dateString);
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();

  if (commodity === 'gold') {
    const bullish = ((month === 3 && day >= 20) || (month === 4 && day <= 19) ||
      (month === 8 && day >= 16) || (month === 9 && day <= 16));
    const avoid = ((month === 10 && day >= 17) || (month === 11 && day <= 16));
    return bullish ? 1 : (avoid ? 0 : 0);
  }

  if (commodity === 'copper') {
    const bullish = month === 4 && day >= 1 && day <= 25;
    const avoid = (month === 7 && day >= 10) || (month === 8 && day <= 4);
    return bullish ? 1 : (avoid ? 0 : 0);
  }

  if (commodity === 'bitcoin') {
    return date <= new Date('2026-06-30T00:00:00Z') ? 1 : 0;
  }

  if (commodity === 'silver') {
    return [5, 6, 7, 18, 19, 20, 29, 30].includes(day) ? 1 : 0;
  }

  return 0;
}

function runBacktest(commodity, prices) {
  let activeDays = 0;
  let strategyReturn = 1;
  let buyHoldReturn = 1;
  let wins = 0;
  let trades = 0;

  for (let i = 0; i < prices.length - 1; i += 1) {
    const current = prices[i];
    const next = prices[i + 1];
    const currentClose = Number(current?.close);
    const nextClose = Number(next?.close);
    if (!Number.isFinite(currentClose) || !Number.isFinite(nextClose) || currentClose <= 0) continue;

    const signal = zodiacSignForMonthRule(current.date, commodity);
    const dailyReturn = nextClose / currentClose;
    buyHoldReturn *= dailyReturn;

    if (signal === 1) {
      strategyReturn *= dailyReturn;
      activeDays += 1;
      trades += 1;
      if (nextClose > currentClose) wins += 1;
    }
  }

  const strategyPct = (strategyReturn - 1) * 100;
  const buyHoldPct = (buyHoldReturn - 1) * 100;
  const winRate = trades ? (wins / trades) * 100 : 0;

  return {
    commodity,
    lookbackDays: prices.length,
    activeDays,
    tradeCount: trades,
    winRate: Number(winRate.toFixed(2)),
    strategyReturnPct: Number(strategyPct.toFixed(2)),
    buyHoldReturnPct: Number(buyHoldPct.toFixed(2)),
    summary: `Rule-based astrology backtest for ${commodity}: ${strategyPct.toFixed(2)}% strategy return vs ${buyHoldPct.toFixed(2)}% buy-and-hold, ${winRate.toFixed(2)}% win rate across ${trades} active trade days.`
  };
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
        {
          label: 'Tata Gold ETF',
          data: goldSeries.map(point => Number(point.price)),
          borderColor: '#fbbf24',
          backgroundColor: 'rgba(251,191,36,0.12)'
        },
        {
          label: 'Groww Silver ETF',
          data: silverSeries.map(point => Number(point.price)),
          borderColor: '#c0c0c0',
          backgroundColor: 'rgba(192,192,192,0.12)'
        }
      ]
    };
  }

  const series = Array.isArray(priceHistory?.[commodity]) ? priceHistory[commodity].slice(-7) : [];
  if (!series.length) return null;

  const colors = {
    gold: '#fbbf24',
    silver: '#c0c0c0',
    copper: '#cd7f32',
    bitcoin: '#f7931a'
  };

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

async function fetchYahooHistory(symbol, lookbackDays = 180) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=${Math.max(7, lookbackDays)}d&includePrePost=false`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Yahoo history failed (${response.status}) for ${symbol}`);
  }
  const jsonBody = await response.json();
  const result = jsonBody?.chart?.result?.[0];
  const timestamps = result?.timestamp || [];
  const closes = result?.indicators?.quote?.[0]?.close || [];
  return timestamps.map((timestamp, index) => {
    const close = Number(closes[index]);
    if (!Number.isFinite(close)) return null;
    return {
      date: new Date(timestamp * 1000).toISOString().slice(0, 10),
      close
    };
  }).filter(Boolean);
}

async function maybeBuildBacktestContext(message, commodity) {
  if (!/(backtest|win rate|buy and hold|compare strategy|historical performance)/i.test(message || '')) {
    return null;
  }

  const symbol = COMMODITY_SYMBOLS[commodity];
  if (!symbol) return null;

  try {
    const history = await fetchYahooHistory(symbol, 180);
    if (!history.length) return null;
    return runBacktest(commodity, history);
  } catch (error) {
    return {
      commodity,
      error: error.message
    };
  }
}

async function loadContextPack({ message, commodity, book }) {
  const analysisEntries = await Promise.all(
    Object.entries(ANALYSIS_FILES).map(async ([key, file]) => [key, await safeRead(file)])
  );
  const analysisContext = Object.fromEntries(analysisEntries.filter(([, value]) => value));

  const bookEntries = await Promise.all(
    BOOK_TEXT_FILES.map(async file => ({
      file,
      name: path.basename(file, '.txt'),
      text: await safeRead(file)
    }))
  );
  const strategyFile = await (async () => {
    for (const file of STRATEGY_FILE_CANDIDATES) {
      const text = (await safeRead(file)).trim();
      if (text) return { file, text };
    }
    return { file: null, text: 'No extra strategy input file found.' };
  })();

  const terms = normalizeSearchTerms(message, commodity, book);
  const analysisDigest = Object.entries(analysisContext)
    .map(([key, text]) => `${key === commodity ? '[PRIMARY FILE]' : '[REFERENCE FILE]'} ${(COMMODITIES[key] || { name: key }).name}\n${summarizeAnalysisText(text)}`)
    .join('\n\n')
    .slice(0, 7000);
  const booksDigest = bookEntries
    .map(entry => {
      const priority = entry.name.includes((BOOKS[book] || BOOKS.general).name) ? '[SELECTED BOOK]' : '[BOOK]';
      return `${priority} ${entry.name}\n${extractRelevantSnippets(entry.text, terms, priority === '[SELECTED BOOK]' ? 3 : 2, priority === '[SELECTED BOOK]' ? 1500 : 900)}`;
    })
    .join('\n\n')
    .slice(0, 9000);

  return {
    analysisDigest,
    booksDigest,
    strategyDigest: [
      TIMING_WINDOW_GUIDANCE,
      '',
      'Execution rules:',
      '- Treat one day before and two days before as valid early windows only with price confirmation.',
      '- Mention invalidation and confirmation levels instead of claiming certainty.',
      '',
      `Optional strategy file: ${strategyFile.file || 'none found'}`,
      strategyFile.text
    ].join('\n').slice(0, 5000)
  };
}

async function createReply(payload) {
  if (process.env.MOCK_ZAI === '1') {
    const chart = shouldReturnChart(payload.message) ? formatChartPayload(payload.commodity, payload.priceHistory || {}) : null;
    return {
      model: ZAI_MODELS[0],
      reply: `Mocked Netlify agent reply for ${payload.commodity || 'overview'}.\n\nThe function received local books, analysis context, and backtest support correctly.`,
      chart
    };
  }

  if (!ZAI_API_KEY) {
    throw new Error('ZAI_API_KEY is not configured in Netlify environment variables.');
  }

  const commodity = COMMODITIES[payload.commodity] || null;
  const selectedBook = BOOKS[payload.book] || BOOKS.general;
  const contextPack = await loadContextPack(payload);
  const backtest = await maybeBuildBacktestContext(payload.message, payload.commodity);
  const chart = shouldReturnChart(payload.message) ? formatChartPayload(payload.commodity, payload.priceHistory || {}) : null;

  const messages = [
    {
      role: 'system',
      content: [
        'You are ZDI, a server-side astrology and trading assistant for gold, silver, copper, and bitcoin.',
        `Primary model target: ${ZAI_MODELS[0]}.`,
        'You run behind a Netlify Function. Do not mention browser keys, Codex, OpenClaw, or terminal access.',
        'You may reference server-side context, books, profiles, and a lightweight internal backtest when relevant.',
        'Be practical, concise, and explicit about risk and invalidation.',
        '',
        `Selected commodity: ${commodity ? commodity.name : 'Overview / cross-market'}`,
        `Selected reference book: ${selectedBook.name}`,
        `Selected profile: ${BOOKS.personal.summary}`,
        '',
        'Commodity context:',
        commodity ? commodity.context : BOOKS.general.summary,
        '',
        'Live market context from frontend:',
        payload.liveMarketContext || 'No live market context provided.',
        '',
        'Analysis files digest:',
        contextPack.analysisDigest,
        '',
        'Books digest:',
        contextPack.booksDigest,
        '',
        'Strategy digest:',
        contextPack.strategyDigest,
        '',
        'Swiss Ephemeris / advanced calculation note:',
        'This Netlify function is currently configured for rule-based astrology timing plus market-data-backed backtests. Use this as the main calculation layer unless a separate Swiss Ephemeris WASM adapter is added.',
        '',
        backtest
          ? `Internal backtest context:\n${backtest.summary || JSON.stringify(backtest)}`
          : 'Internal backtest context: not requested for this turn.'
      ].join('\n')
    },
    ...(Array.isArray(payload.history) ? payload.history : []).map(item => ({
      role: item.role,
      content: item.content
    })),
    {
      role: 'user',
      content: [
        `User question: ${payload.message}`,
        '',
        'Response requirements:',
        '- Lead with the direct answer.',
        '- If backtest context exists, summarize it in plain language.',
        '- Mention the strongest local file/book/profile basis when relevant.',
        '- Treat date signals as windows, not precise reversal timestamps.',
        '- Include clear action, risk, and confirmation guidance.'
      ].join('\n')
    }
  ];

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
          temperature: 0.35,
          max_tokens: 1400,
          messages
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`${model} failed (${response.status}): ${errorText.slice(0, 220)}`);
      }

      const payloadJson = await response.json();
      const reply = normalizeModelContent(payloadJson?.choices?.[0]?.message?.content);
      if (!reply) throw new Error(`${model} returned empty content.`);

      return {
        model,
        reply,
        backtest,
        chart
      };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('ZAI request failed.');
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  try {
    const payload = JSON.parse(event.body || '{}');
    const result = await createReply(payload);
    return json(200, result);
  } catch (error) {
    return json(500, { error: error.message || 'Agent failed.' });
  }
};
