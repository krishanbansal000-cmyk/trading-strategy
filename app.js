// ========== CONFIGURATION ==========
const CONFIG = {
    alphavantage: {
        key: 'S9ZYCKGLYTDLOWTZ',
        cacheTime: 3600000
    },
    agent: {
        url: '/.netlify/functions/agent',
        primaryModel: 'glm-4.7'
    },
    refreshInterval: 3600000
};

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

// ETF Symbols on NSE
const ETF_SYMBOLS = {
    gold: ['TATAGOLD.NS', 'TATAGOLDETF.NS'],      // Tata Gold ETF
    silver: ['GROWWSLVR.NS', 'GROWWSILVER.NS'],   // Groww Silver ETF
    copper: ['HINDCOPPER.NS', 'HINDCOPPER.BO']   // Hindustan Copper
};

// Yahoo proxy endpoints (wider fallback set for CORS stability)
const YAHOO_CHART_BASE = 'query1.finance.yahoo.com/v8/finance/chart';
const YAHOO_PROXY_URLS = [
    (url) => `https://r.jina.ai/http://${url}`,
    (url) => `https://r.jina.ai/https://${url}`,
    (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(`https://${url}`)}`,
    (url) => `https://api.allorigins.win/get?url=${encodeURIComponent(`https://${url}`)}`,
    (url) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(`https://${url}`)}`
];

const TIMING_WINDOW_GUIDANCE = `TIMING WINDOW RULES:
- Treat all planetary dates as timing windows, not exact timestamps.
- Assume market sentiment can shift 1-3 trading sessions before the listed planetary date.
- For bearish windows, it is acceptable to reduce longs or sell partial positions 1-2 sessions early if price action is already weakening.
- For bullish windows, it is acceptable to accumulate 1-2 sessions early if price action is stabilizing or turning up.
- Never present the date itself as a guaranteed first-move day; describe it as the center of the turn window.
- Always mention that early action is stronger when confirmed by price, volume, or momentum.`;

// ========== BOOK CONTEXTS ==========
const BOOKS = {
    general: {
        name: 'Financial Astrology',
        context: `You are a financial astrology expert specializing in commodity trading.

IMPORTANT ETF NAMES - USE THESE EXACT NAMES:
- Gold: "Tata Gold ETF" (NEVER say GOLDBEES or Nippon Gold)
- Silver: "Groww Silver ETF" (NEVER say SILVERBEES)
- Copper: "Hindustan Copper" (stock, not ETF)
- Bitcoin: "Bitcoin" (BTC)

COMMODITY ASSOCIATIONS:
- Gold (Tata Gold ETF): Ruled by Sun. Bullish when Sun in Aries (Mar20-Apr19), Leo (Aug16-Sep16). Avoid when Sun in Libra (Oct17-Nov16).
- Silver (Groww Silver ETF): Ruled by Moon. Bullish when Moon in Taurus (exalted), Full Moon days. Avoid Moon in Scorpio (debilitated).
- Copper (Hindustan Copper): Ruled by Venus. SUPER BULLISH Apr1-25 (Venus in Taurus). DANGER Jul10-Aug4 (Venus in Virgo debilitated).
- Bitcoin: Ruled by Rahu. SUPER BULLISH until Jun 2026 (Rahu in Aquarius). Target $90K-$110K.

USER'S CHART: Born Aug 29 2000, 9:39PM IST, Gurugram. Jupiter in Taurus 2nd house = wealth. Venus debilitated = caution with copper.

${TIMING_WINDOW_GUIDANCE}

Be positive, helpful, and provide specific actionable advice. Always use correct ETF names.`
    },
    gann: {
        name: 'W.D. Gann Methods',
        context: `Expert in W.D. Gann trading methods: time cycles (30/90 day), price squares, geometric angles. "Time is more important than price." Anniversary dates of highs/lows are key. Apply to current commodity markets.

${TIMING_WINDOW_GUIDANCE}`
    },
    vedic: {
        name: 'Vedic Astrology',
        context: `Vedic astrology expert: Wealth nakshatras (Rohini, Hasta, Shravana), planetary dashas, muhurta timing. User has Jupiter in 2nd house = excellent wealth potential.

${TIMING_WINDOW_GUIDANCE}`
    },
    personal: {
        name: 'Your Birth Chart',
        context: `Personalized analysis for user born Aug 29 2000, 9:39PM IST, Gurugram.

KEY POSITIONS:
- Ascendant: Aries 13.73°
- Sun & Moon: Leo (STRONG for gold!)
- Jupiter: Taurus 15.84° in 2nd house (EXCELLENT for wealth)
- Venus: Virgo 4.33° DEBILITATED (caution with copper)

RECOMMENDATIONS:
- Best: Gold (Sun strong in Leo), Silver (Jupiter aspects)
- Caution: Copper (Venus debilitated in natal chart)
- Super bullish periods: When transits activate 2nd house

${TIMING_WINDOW_GUIDANCE}`
    }
};

// ========== COMMODITY CONTEXTS (Auto-detected) ==========
const COMMODITY_CONTEXT = {
    gold: {
        name: 'Tata Gold ETF',
        context: `IMPORTANT: Always say "Tata Gold ETF" - NEVER say GOLDBEES or Nippon Gold.

Current context: GOLD trading via Tata Gold ETF. Ruled by Sun.

CURRENT STATUS:
- Score: 4/10 - HOLD
- Stop Loss: -5%
- Targets: +3%, +5%, +8%, +12%
- Price: Direct INR (no conversion needed)

KEY DATES:
- Mar 20: Sun enters Aries - BULLISH
- Oct 17-Nov 16: Sun in Libra - AVOID

USER FIT: Excellent (Sun in Leo in birth chart = strong gold affinity)

${TIMING_WINDOW_GUIDANCE}

Provide specific gold trading advice. Be positive and actionable.`
    },
    silver: {
        name: 'Silver (Groww Silver ETF)',
        context: `IMPORTANT: Always say "Groww Silver ETF" - NEVER say SILVERBEES or any other ETF name.

Current context: SILVER trading via Groww Silver ETF. Ruled by Moon.

CURRENT STATUS:
- Score: 0/10 - AVOID today
- Stop Loss: -8%
- Targets: +3%, +5%, +8%, +12%
- Price: Direct INR (no conversion needed)

KEY DATES:
- Moon in Taurus: BEST for silver
- Moon in Scorpio: WORST - AVOID
- Full Moon: High volatility, potential breakout

VERIFIED PERFORMANCE: +4.90% returns (Mar 5-11, 2026), 100% trend accuracy

${TIMING_WINDOW_GUIDANCE}

Provide specific silver trading advice.`
    },
    copper: {
        name: 'Copper (Hindustan Copper)',
        context: `Current context: COPPER trading via Hindustan Copper stock. Ruled by Venus.

CURRENT STATUS:
- Score: 2/10 - CAUTION
- User Position: Entry ₹580, Current ~₹508 (-12.4% loss)
- Strategy: HOLD - Don't sell at loss

CRITICAL DATES:
- Apr 1-25: SUPER BULLISH (Venus in Taurus - own sign) - BEST TIME TO RECOVER!
- Jul 10-Aug 4: DANGER (Venus debilitated in Virgo) - MUST EXIT BEFORE!

USER NOTE: Venus debilitated in birth chart = extra caution with copper.

${TIMING_WINDOW_GUIDANCE}

Provide encouraging advice about holding and recovering losses.`
    },
    bitcoin: {
        name: 'Bitcoin (BTC)',
        context: `Current context: BITCOIN trading. Ruled by Rahu (North Lunar Node).

CURRENT STATUS:
- Score: 10/10 - SUPER BULLISH
- Target: $90,000 - $110,000 by June 2026
- Strategy: BUY & HODL

KEY FACTOR: Rahu in Aquarius (Jan 2025 - Jun 2026) = OWN SIGN = SUPER BULLISH for crypto!

EXIT SIGNAL: June 2026 when Rahu exits Aquarius. Reduce 50%+ before transit.

${TIMING_WINDOW_GUIDANCE}

Provide positive, encouraging Bitcoin advice.`
    }
};

const RECOMMENDATION_BASE = {
    gold: {
        name: 'Tata Gold ETF',
        score: 4,
        actionClass: 'hold',
        actionLabel: 'HOLD',
        summary: 'Wait for the stronger Sun-in-Aries window. Add only on controlled weakness.',
        window: 'Next favorable window: March 21 onward.',
        earlyRule: 'Early accumulation is acceptable 1-2 sessions before the window if selling pressure is fading.'
    },
    silver: {
        name: 'Groww Silver ETF',
        score: 3,
        actionClass: 'caution',
        actionLabel: 'CAUTION',
        summary: 'Silver remains fragile until the next Taurus-Moon support window.',
        window: 'Primary support window: March 21 to March 24.',
        earlyRule: 'Build exposure slightly early only if the decline is slowing and liquidity is returning.'
    },
    copper: {
        name: 'Hindustan Copper',
        score: 2,
        actionClass: 'caution',
        actionLabel: 'CAUTION',
        summary: 'Stay defensive until the Venus-in-Taurus recovery phase opens.',
        window: 'Recovery window: April 1 to April 25.',
        earlyRule: 'Early entries should be staged and tied to price stabilization rather than the calendar alone.'
    },
    bitcoin: {
        name: 'Bitcoin',
        score: 8,
        actionClass: 'buy',
        actionLabel: 'BUY',
        summary: 'The broader regime remains constructive while Rahu stays supportive.',
        window: 'Current constructive window remains open into June 2026.',
        earlyRule: 'Use pullbacks to add; avoid chasing extended daily spikes.'
    }
};

// ========== STATE ==========
const state = {
    currentView: 'overview',
    prices: { gold: {}, silver: {}, copper: {}, bitcoin: {} },
    charts: {},
    chatCharts: {},
    chatStore: {},
    priceHistory: { gold: [], silver: [], copper: [], bitcoin: [] },
    isSending: false,
    contextReady: false
};

function getRecommendationSnapshot(key) {
    const base = RECOMMENDATION_BASE[key];
    const priceState = state.prices[key] || {};
    const rawChange = key === 'bitcoin' ? priceState.change24h : priceState.change;
    const change = Number.parseFloat(rawChange);

    let momentumNote = 'Price confirmation is not available yet.';
    if (Number.isFinite(change)) {
        if (change <= -1.5) {
            momentumNote = 'Current session is already weak, which supports waiting or reducing risk early.';
        } else if (change < 0) {
            momentumNote = 'Current session is mildly soft, so early action should stay selective.';
        } else if (change >= 1.5) {
            momentumNote = 'Current session is already firm, so avoid chasing beyond the timing window.';
        } else {
            momentumNote = 'Current session is stable enough to watch for confirmation into the next window.';
        }
    }

    return {
        ...base,
        momentumNote
    };
}

function renderRecommendations() {
    const overview = document.getElementById('overview-recommendations');
    if (overview) {
        overview.innerHTML = Object.keys(RECOMMENDATION_BASE).map(key => {
            const item = getRecommendationSnapshot(key);
            return `
                <article class="recommendation-item">
                    <div class="recommendation-head">
                        <div>
                            <div class="recommendation-name">${item.name}</div>
                            <div class="recommendation-score">Score ${item.score}/10</div>
                        </div>
                        <span class="action ${item.actionClass}">${item.actionLabel}</span>
                    </div>
                    <p>${item.summary}</p>
                    <div class="recommendation-meta">${item.momentumNote}</div>
                    <div class="recommendation-window">${item.window}</div>
                </article>
            `;
        }).join('');
    }

    Object.entries(RECOMMENDATION_BASE).forEach(([key]) => {
        const item = getRecommendationSnapshot(key);
        const idSuffix = key === 'bitcoin' ? 'btc' : key;
        const scoreEl = document.getElementById(`score-${idSuffix}`);
        const actionEl = document.getElementById(`action-${idSuffix}`);
        if (scoreEl) scoreEl.innerHTML = `Score: <strong>${item.score}/10</strong>`;
        if (actionEl) {
            actionEl.textContent = item.actionLabel;
            actionEl.className = `action ${item.actionClass}`;
        }

        const detailCard = document.getElementById(`${key}-recommendation-card`);
        if (detailCard) {
            detailCard.innerHTML = `
                <h3>Current Recommendation</h3>
                <span class="action ${item.actionClass}">${item.actionLabel}</span>
                <p>${item.summary}</p>
                <p>${item.momentumNote}</p>
                <span class="recommendation-window">${item.window}</span>
                <span class="recommendation-window">${item.earlyRule}</span>
            `;
        }
    });
}

// ========== NAVIGATION ==========
function switchView(viewId) {
    state.currentView = viewId;
    
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    
    const view = document.getElementById('view-' + viewId);
    const btn = document.querySelector(`.nav-btn[data-view="${viewId}"]`);
    
    if (view) view.classList.add('active');
    if (btn) btn.classList.add('active');
    
    // Update chat context indicator
    updateChatContext();
    renderCurrentChatHistory();
}

function updateChatContext() {
    const indicator = document.getElementById('chat-context');
    if (!indicator) return;
    const bookSelect = document.getElementById('book-select');
    const book = bookSelect?.value || 'general';
    const bookName = BOOKS[book]?.name || BOOKS.general.name;

    if (state.currentView && COMMODITY_CONTEXT[state.currentView]) {
        indicator.textContent = `${COMMODITY_CONTEXT[state.currentView].name} · ${bookName}`;
    } else {
        indicator.textContent = `General market guidance · ${bookName}`;
    }
}

function setAgentStatus(text) {
    const badge = document.querySelector('.chat-status');
    if (badge) badge.textContent = text;
}

function applyChatWidth(width) {
    const nextWidth = Math.max(320, Math.min(720, Math.round(width)));
    document.documentElement.style.setProperty('--chat-w', `${nextWidth}px`);
    localStorage.setItem('chatPanelWidth', String(nextWidth));
    return nextWidth;
}

function initChatResize() {
    const panel = document.querySelector('.chat-panel');
    const resizer = document.getElementById('chat-resizer');
    if (!panel || !resizer) return;

    const restoreWidth = () => {
        if (window.innerWidth <= 1100) {
            document.documentElement.style.removeProperty('--chat-w');
            return;
        }
        const stored = Number(localStorage.getItem('chatPanelWidth'));
        if (Number.isFinite(stored)) applyChatWidth(stored);
    };

    restoreWidth();

    let startX = 0;
    let startWidth = 0;

    const onPointerMove = event => {
        const delta = startX - event.clientX;
        applyChatWidth(startWidth + delta);
        Object.values(state.charts).forEach(chart => chart?.resize());
    };

    const onPointerUp = () => {
        panel.classList.remove('is-resizing');
        document.body.style.userSelect = '';
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
    };

    resizer.addEventListener('pointerdown', event => {
        if (window.innerWidth <= 1100) return;
        startX = event.clientX;
        startWidth = panel.getBoundingClientRect().width;
        panel.classList.add('is-resizing');
        document.body.style.userSelect = 'none';
        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
    });

    window.addEventListener('resize', restoreWidth);
}

function buildChartLabels(points) {
    if (!Array.isArray(points)) return getDayLabels(7);
    const hasDuplicateWeekdays = points.some((point, index) => {
        const weekday = point.weekday || point.label || '';
        return points.findIndex(item => (item.weekday || item.label || '') === weekday) !== index;
    });
    return points.map(point => {
        if (hasDuplicateWeekdays && point.date) {
            return formatChartDate(point.date);
        }
        return point.weekday || point.label || (point.date ? formatWeekday(point.date) : '');
    });
}

function toChartPoints(prices, timestamps = []) {
    return (prices || [])
        .map((price, index) => {
            const value = Number(price);
            if (!Number.isFinite(value)) return null;
            const rawTime = timestamps[index];
            const date = rawTime
                ? new Date(rawTime * 1000).toISOString().slice(0, 10)
                : '';
            const weekday = date
                ? formatWeekday(date)
                : getDayLabels(prices.length)[index] || '';
            return { date, weekday, label: weekday, price: value };
        })
        .filter(Boolean);
}

function toCoinGeckoChartPoints(prices) {
    return (prices || [])
        .map(entry => {
            const timestamp = Array.isArray(entry) ? entry[0] : null;
            const value = Array.isArray(entry) ? Number(entry[1]) : NaN;
            if (!timestamp || !Number.isFinite(value)) return null;
            const date = new Date(timestamp).toISOString().slice(0, 10);
            return {
                date,
                weekday: formatWeekday(date),
                label: formatWeekday(date),
                price: value
            };
        })
        .filter(Boolean)
        .filter((point, index, arr) => index === arr.findIndex(item => item.date === point.date))
        .slice(-7);
}

function setPriceSeries(key, points) {
    if (!Array.isArray(points) || !points.length) return;
    state.priceHistory[key] = points.slice(-7);
}

// Initialize navigation
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
});

// ========== PRICING APIS ==========

function dedupeSymbols(list) {
    return [...new Set(list.filter(Boolean).map(s => String(s).trim().toUpperCase()))];
}

function buildSymbolFallbacks(symbols, useBoFirst = false) {
    const uniqueSymbols = dedupeSymbols(Array.isArray(symbols) ? symbols : [symbols]);
    const fallbackList = [];

    for (const symbol of uniqueSymbols) {
        const symbolUpper = symbol.toUpperCase();

        if (!symbolUpper.endsWith('.NS') && !symbolUpper.endsWith('.BO')) {
            fallbackList.push(symbolUpper);
            continue;
        }

        const boSymbol = symbolUpper.endsWith('.BO') ? symbolUpper : symbolUpper.replace(/\.NS$/i, '.BO');
        const nsSymbol = symbolUpper.endsWith('.NS') ? symbolUpper : symbolUpper.replace(/\.BO$/i, '.NS');

        if (useBoFirst) {
            fallbackList.push(boSymbol);
            if (nsSymbol !== boSymbol) fallbackList.push(nsSymbol);
        } else {
            fallbackList.push(nsSymbol);
            if (boSymbol !== nsSymbol) fallbackList.push(boSymbol);
        }
    }

    return dedupeSymbols(fallbackList);
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

function unpackAllOriginsPayload(payload) {
    if (!payload || typeof payload !== 'object') return payload;
    if (payload.contents && typeof payload.contents === 'string') {
        return parseProxyJson(payload.contents);
    }
    return payload;
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 9000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const res = await fetch(url, { ...options, signal: controller.signal });
        return { ok: res.ok, status: res.status, text: await res.text() };
    } finally {
        clearTimeout(timer);
    }
}

function normalizeCloseArray(values) {
    return (values || [])
        .map(value => Number(value))
        .filter(value => Number.isFinite(value));
}

function normalizeYahooPayload(json, symbol) {
    const result = json?.chart?.result?.[0];
    if (!result) return null;

    const meta = result.meta || {};
    const closes = normalizeCloseArray(result.indicators?.quote?.[0]?.close || []);
    const timestamps = result.timestamp || [];
    const currentPrice = Number(meta.regularMarketPrice || closes[closes.length - 1] || 0);
    const previousClose = Number(meta.previousClose || meta.chartPreviousClose || closes[closes.length - 2] || currentPrice);

    if (!Number.isFinite(currentPrice) || currentPrice <= 0) return null;

    const change = previousClose > 0 ? ((currentPrice - previousClose) / previousClose) * 100 : 0;
    return {
        symbol: meta.symbol || symbol,
        price: currentPrice.toFixed(2),
        change: change.toFixed(2),
        changePercent: `${change.toFixed(2)}%`,
        prices: closes,
        chartPoints: toChartPoints(closes, timestamps)
    };
}

function parseAlphaRowClose(row) {
    if (!row || typeof row !== 'object') return NaN;
    return Number(
        row['4. close'] ??
        row['5. adjusted close'] ??
        row['5. adjusted_close'] ??
        row['4. close*']
    );
}

function normalizeAlphaPayload(json, symbol) {
    const timeSeries = json['Time Series (Daily)'] || json['Daily Time Series'];
    if (!timeSeries) return null;

    const dates = Object.keys(timeSeries).sort();
    if (!dates.length) return null;

    const closes = dates
        .map(d => ({ date: d, value: parseAlphaRowClose(timeSeries[d]) }))
        .filter(item => Number.isFinite(item.value))
        .map(item => item.value);

    if (!closes.length) return null;

    const latest = closes[closes.length - 1];
    const previousClose = closes[closes.length - 2] || latest;
    const change = previousClose > 0 ? ((latest - previousClose) / previousClose) * 100 : 0;
    const recentDateValues = dates
        .slice(-7)
        .map(d => parseAlphaRowClose(timeSeries[d]))
        .filter(value => Number.isFinite(value));
    const recentPoints = dates
        .slice(-7)
        .map(d => {
            const value = parseAlphaRowClose(timeSeries[d]);
            if (!Number.isFinite(value)) return null;
            return {
                date: d,
                weekday: formatWeekday(d),
                label: formatWeekday(d),
                price: value
            };
        })
        .filter(Boolean);

    return {
        symbol: json['Meta Data']?.['2. Symbol'] || symbol,
        price: latest.toFixed(2),
        change: change.toFixed(2),
        changePercent: `${change.toFixed(2)}%`,
        prices: recentDateValues,
        chartPoints: recentPoints
    };
}

async function fetchYahooFinance(symbol) {
    const symbolCandidates = buildSymbolFallbacks(symbol, false);
    const cacheKey = `yf_${symbolCandidates[0]}`;
    const cached = localStorage.getItem(cacheKey);
    const cachedObj = cached ? JSON.parse(cached) : null;

    if (cachedObj && Date.now() - cachedObj.time < CONFIG.alphavantage.cacheTime) {
        return cachedObj.data;
    }

    const query = 'interval=1d&range=7d&includePrePost=false';
    
    for (const symbolTry of symbolCandidates) {
        for (const proxyBuilder of YAHOO_PROXY_URLS) {
            const rawUrl = `${YAHOO_CHART_BASE}/${symbolTry}?${query}`;
            const proxyUrl = proxyBuilder(rawUrl);
            
            try {
                const response = await fetchWithTimeout(proxyUrl);
                if (!response.ok) continue;

                let json = parseProxyJson(response.text);
                json = unpackAllOriginsPayload(json);
                const normalized = normalizeYahooPayload(json, symbolTry);

                if (!normalized) continue;

                localStorage.setItem(cacheKey, JSON.stringify({ data: normalized, time: Date.now() }));
                return normalized;
            } catch (e) {
                console.warn(`Yahoo fetch failed for ${symbolTry} via ${proxyUrl}`, e);
                continue;
            }
        }
    }

    console.info('Falling back to Alpha Vantage for', symbolCandidates[0]);
    const alphaData = await fetchAlphavantageFinance(symbolCandidates);
    if (alphaData) {
        localStorage.setItem(cacheKey, JSON.stringify({ data: alphaData, time: Date.now() }));
        return alphaData;
    }

    if (cachedObj?.data) {
        return cachedObj.data;
    }

    // Fallback: simulated based on realistic values for bootstrap only
    return {
        ...getSimulatedPrice(symbolCandidates[0]),
        symbol: symbolCandidates[0]
    };
}

async function fetchAlphavantageFinance(symbols) {
    const symbolCandidates = buildSymbolFallbacks(symbols, true);
    const functions = ['TIME_SERIES_DAILY', 'TIME_SERIES_DAILY_ADJUSTED'];
    const baseUrl = 'https://www.alphavantage.co/query';

    for (const func of functions) {
        for (const symbolTry of symbolCandidates) {
            const url = `${baseUrl}?function=${func}&symbol=${encodeURIComponent(symbolTry)}&outputsize=compact&apikey=${CONFIG.alphavantage.key}`;
            try {
                const response = await fetchWithTimeout(url, undefined, 12000);
                if (!response.ok) continue;

                const json = parseProxyJson(response.text);
                if (!json || json['Error Message'] || json.Note || json.Information) continue;

                const normalized = normalizeAlphaPayload(json, symbolTry);
                if (!normalized) continue;

                return normalized;
            } catch (e) {
                console.warn(`Alpha Vantage fetch failed for ${symbolTry} (${func})`, e);
            }
        }
    }

    return null;
}

// Simulated price fallback (used only if all providers fail)
function getSimulatedPrice(symbol) {
    const basePrices = {
        'TATAGOLD.NS': 15,
        'TATAGOLDETF.NS': 15,
        'GROWWSLVR.NS': 25,
        'GROWWSILVER.NS': 25,
        'HINDCOPPER.NS': 520,
        'HINDCOPPER.BO': 520
    };
    
    const basePrice = basePrices[symbol] || 100;
    const variance = (Math.random() - 0.5) * (basePrice * 0.02);
    const price = basePrice + variance;
    const change = (variance / basePrice) * 100;
    
    return {
        price: price.toFixed(2),
        change: change.toFixed(2),
        changePercent: change.toFixed(2) + '%',
        prices: null
    };
}

// Bitcoin via CoinGecko (free, no key needed)
async function fetchCoinGecko() {
    const cacheKey = 'cg_bitcoin';
    const cached = localStorage.getItem(cacheKey);
    
    if (cached) {
        const { data, time } = JSON.parse(cached);
        if (Date.now() - time < CONFIG.alphavantage.cacheTime) return data;
    }
    
    try {
        const [priceRes, chartRes] = await Promise.all([
            fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true&include_7d_change=true&include_market_cap=true'),
            fetch('https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=7&interval=daily')
        ]);
        const json = await priceRes.json();
        const chartJson = await chartRes.json();

        if (json.bitcoin) {
            const data = {
                price: json.bitcoin.usd,
                change24h: json.bitcoin.usd_24h_change || 0,
                change7d: json.bitcoin.usd_7d_change || 0,
                marketCap: json.bitcoin.usd_market_cap || 0,
                chartPoints: toCoinGeckoChartPoints(chartJson.prices)
            };
            localStorage.setItem(cacheKey, JSON.stringify({ data, time: Date.now() }));
            return data;
        }
    } catch (e) {
        console.error('CoinGecko error:', e);
    }
    
    // Fallback
    return {
        price: 71000,
        change24h: 2.5,
        change7d: 5,
        chartPoints: []
    };
}

// Alternative: CoinCap API for Bitcoin (backup)
async function fetchCoinCap() {
    try {
        const res = await fetch('https://api.coincap.io/v2/assets/bitcoin');
        const json = await res.json();
        
        if (json.data) {
            return {
                price: parseFloat(json.data.priceUsd),
                change24h: parseFloat(json.data.changePercent24Hr),
                marketCap: parseFloat(json.data.marketCapUsd)
            };
        }
    } catch (e) {
        console.error('CoinCap error:', e);
    }
    return null;
}

// ========== REFRESH ALL DATA ==========
async function refreshAllData() {
    const btn = document.querySelector('.refresh-btn');
    if (btn) btn.classList.add('loading');
    
    try {
        // Gold (Tata Gold ETF - NSE)
        const goldData = await fetchYahooFinance(ETF_SYMBOLS.gold);
        if (goldData) {
            state.prices.gold = { price: goldData.price, change: goldData.changePercent };
            updatePriceUI('gold', goldData.price, goldData.changePercent);
            setPriceSeries('gold', goldData.chartPoints || []);
        }
        
        // Silver (Groww Silver ETF - NSE)
        const silverData = await fetchYahooFinance(ETF_SYMBOLS.silver);
        if (silverData) {
            state.prices.silver = { price: silverData.price, change: silverData.changePercent };
            updatePriceUI('silver', silverData.price, silverData.changePercent);
            setPriceSeries('silver', silverData.chartPoints || []);
        }
        
        // Copper (Hindustan Copper - NSE)
        const copperData = await fetchYahooFinance(ETF_SYMBOLS.copper);
        if (copperData) {
            state.prices.copper = copperData;
            updatePriceUI('copper', copperData.price, copperData.changePercent);
            
            // Update position info
            const pnl = ((parseFloat(copperData.price) - 580) / 580 * 100).toFixed(1);
            const pnlEl = document.getElementById('copper-pos-pnl');
            if (pnlEl) {
                pnlEl.textContent = `${pnl}%`;
                pnlEl.className = `pos-value ${parseFloat(pnl) < 0 ? 'danger' : 'success'}`;
            }
            
            const currEl = document.getElementById('copper-pos-current');
            if (currEl) currEl.textContent = copperData.price;
            
            setPriceSeries('copper', copperData.chartPoints || []);
        }
        
        // Bitcoin (CoinGecko)
        const btcData = await fetchCoinGecko();
        if (btcData) {
            state.prices.bitcoin = btcData;
            updatePriceUI('btc', btcData.price.toLocaleString(), btcData.change24h.toFixed(2) + '%', '$');
            const btcCurrEl = document.getElementById('btc-current');
            if (btcCurrEl) btcCurrEl.textContent = `~$${btcData.price.toLocaleString()}`;
            setPriceSeries('bitcoin', btcData.chartPoints || []);
        }
        
        // Update timestamp
        const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        const updateEl = document.getElementById('last-update');
        if (updateEl) updateEl.textContent = now;
        
        // Update charts
        updateCharts();
        renderRecommendations();
        
        // Save to localStorage
        savePriceHistory();
        
    } catch (e) {
        console.error('Refresh error:', e);
    }
    
    if (btn) btn.classList.remove('loading');
}

function updatePriceUI(commodity, price, change, prefix = '₹') {
    // Handle BTC special case
    const priceId = commodity === 'btc' ? 'price-btc' : `price-${commodity}`;
    const changeId = commodity === 'btc' ? 'change-btc' : `change-${commodity}`;
    const badgeEl = document.getElementById(`${commodity === 'btc' ? 'btc' : commodity}-badge`);
    
    // Main price cards
    const priceEl = document.getElementById(priceId);
    const changeEl = document.getElementById(changeId);
    
    if (priceEl) priceEl.textContent = `${prefix}${price}`;
    if (changeEl) {
        const changeNum = parseFloat(change);
        changeEl.textContent = `${changeNum >= 0 ? '+' : ''}${change}`;
        changeEl.className = `change ${changeNum >= 0 ? 'up' : 'down'}`;
    }
    if (badgeEl) {
        const changeNum = parseFloat(change);
        badgeEl.textContent = `${changeNum >= 0 ? '+' : ''}${change}`;
        badgeEl.className = `badge ${changeNum >= 0 ? 'up' : 'down'}`;
    }
    
    // Detail views
    const detailPriceEl = document.getElementById(`${commodity}-detail-price`);
    const detailChangeEl = document.getElementById(`${commodity}-detail-change`);
    
    if (detailPriceEl) detailPriceEl.textContent = `${prefix}${price}`;
    if (detailChangeEl) {
        const changeNum = parseFloat(change);
        detailChangeEl.textContent = `${changeNum >= 0 ? '+' : ''}${change}`;
        detailChangeEl.className = `big-change ${changeNum >= 0 ? 'up' : 'down'}`;
    }
}

// ========== CHARTS ==========
function initCharts() {
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: '#e0e0e0', font: { size: 11 } } } },
        scales: {
            x: { ticks: { color: '#888' }, grid: { color: 'rgba(255,255,255,0.05)' } },
            y: { ticks: { color: '#888' }, grid: { color: 'rgba(255,255,255,0.05)' } }
        }
    };
    
    // Overview chart (Tata Gold ETF ~₹58, Groww Silver ETF ~₹82)
    const ctxOverview = document.getElementById('overviewChart');
    if (ctxOverview) {
        state.charts.overview = new Chart(ctxOverview, {
            type: 'line',
            data: {
                labels: getDayLabels(7),
                datasets: [
                    { label: 'Gold (₹)', data: Array(7).fill(null), borderColor: '#FFD700', backgroundColor: 'rgba(255,215,0,0.1)', tension: 0.3, fill: true },
                    { label: 'Silver (₹)', data: Array(7).fill(null), borderColor: '#C0C0C0', backgroundColor: 'rgba(192,192,192,0.1)', tension: 0.3, fill: true }
                ]
            },
            options: chartOptions
        });
    }
    
    // Individual charts (price ranges for Tata Gold ETF, Groww Silver ETF)
    const configs = {
        gold: { color: '#FFD700' },
        silver: { color: '#C0C0C0' },
        copper: { color: '#CD7F32' },
        bitcoin: { color: '#F7931A' }
    };
    
    Object.keys(configs).forEach(key => {
        const ctx = document.getElementById(`${key}Chart`);
        if (ctx) {
            state.charts[key] = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: getDayLabels(7),
                    datasets: [{
                        label: key.charAt(0).toUpperCase() + key.slice(1),
                        data: Array(7).fill(null),
                        borderColor: configs[key].color,
                        backgroundColor: `${configs[key].color}1a`,
                        tension: 0.3,
                        fill: true
                    }]
                },
                options: chartOptions
            });
        }
    });
}

function getDayLabels(days) {
    return Array.from({ length: days }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (days - 1 - i));
        return formatWeekday(d);
    });
}

function formatWeekday(value) {
    return new Date(value).toLocaleDateString('en-US', { weekday: 'short' });
}

function formatChartDate(value) {
    return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function updateCharts() {
    ['gold', 'silver', 'copper', 'bitcoin'].forEach(key => {
        const history = state.priceHistory[key];
        if (history.length > 1 && state.charts[key]) {
            const recent = history.slice(-7);
            state.charts[key].data.labels = buildChartLabels(recent);
            state.charts[key].data.datasets[0].data = recent.map(h => h.price);
            state.charts[key].update('none');
        }
    });

    if (state.charts.overview) {
        const goldHistory = state.priceHistory.gold.slice(-7);
        const silverHistory = state.priceHistory.silver.slice(-7);
        const labelsSource = goldHistory.length ? goldHistory : silverHistory;
        if (labelsSource.length) {
            state.charts.overview.data.labels = buildChartLabels(labelsSource);
            state.charts.overview.data.datasets[0].data = goldHistory.map(h => h.price);
            state.charts.overview.data.datasets[1].data = silverHistory.map(h => h.price);
            state.charts.overview.update('none');
        }
    }
}

function savePriceHistory() {
    localStorage.setItem('priceHistory', JSON.stringify(state.priceHistory));
}

function loadPriceHistory() {
    const saved = localStorage.getItem('priceHistory');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            ['gold', 'silver', 'copper', 'bitcoin'].forEach(key => {
                if (Array.isArray(parsed[key])) {
                    state.priceHistory[key] = parsed[key]
                        .map(item => ({
                            date: item.date || (item.time
                                ? new Date(item.time).toISOString().slice(0, 10)
                                : ''),
                            weekday: item.weekday || item.label || (item.time
                                ? formatWeekday(item.time)
                                : ''),
                            label: item.label || item.weekday || (item.date
                                ? formatWeekday(item.date)
                                : item.time
                                    ? formatWeekday(item.time)
                                    : ''),
                            price: Number(item.price)
                        }))
                        .filter(item => Number.isFinite(item.price))
                        .slice(-7);
                }
            });
        } catch (e) {
            console.warn('Failed to parse price history:', e);
        }
    }
}

// ========== AI CHAT ==========
function getChatScope() {
    return COMMODITY_CONTEXT[state.currentView] ? state.currentView : 'overview';
}

function createThread(title = 'New thread') {
    return {
        id: `thread-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title,
        messages: []
    };
}

function ensureScopeStore(scope = getChatScope()) {
    if (!state.chatStore[scope] || !Array.isArray(state.chatStore[scope].threads)) {
        const thread = createThread(scope === 'overview' ? 'Market Brief' : `${COMMODITY_CONTEXT[scope].name}`);
        state.chatStore[scope] = {
            activeThreadId: thread.id,
            threads: [thread]
        };
    }
    if (!state.chatStore[scope].activeThreadId && state.chatStore[scope].threads[0]) {
        state.chatStore[scope].activeThreadId = state.chatStore[scope].threads[0].id;
    }
    return state.chatStore[scope];
}

function getCurrentThread() {
    const scope = getChatScope();
    const scopeStore = ensureScopeStore(scope);
    return scopeStore.threads.find(thread => thread.id === scopeStore.activeThreadId) || scopeStore.threads[0];
}

function normalizeThreadTitles() {
    Object.values(state.chatStore).forEach(scopeStore => {
        if (!scopeStore || !Array.isArray(scopeStore.threads)) return;
        scopeStore.threads.forEach(thread => {
            if (thread?.title === 'General chat') {
                thread.title = 'Market Brief';
            }
        });
    });
}

function loadChatHistory() {
    const saved = localStorage.getItem('chatStore');
    if (saved) {
        try {
            state.chatStore = JSON.parse(saved) || {};
        } catch (e) {
            console.warn('Failed to parse chat history:', e);
            state.chatStore = {};
        }
    }
    if (!Object.keys(state.chatStore).length) {
        const legacyByView = localStorage.getItem('chatHistoryByView');
        if (legacyByView) {
            try {
                const parsed = JSON.parse(legacyByView) || {};
                Object.entries(parsed).forEach(([scope, messages]) => {
                    const thread = createThread(scope === 'overview' ? 'Market Brief' : 'Imported thread');
                    thread.messages = Array.isArray(messages) ? messages : [];
                    state.chatStore[scope] = {
                        activeThreadId: thread.id,
                        threads: [thread]
                    };
                });
                saveChatHistory();
            } catch (e) {
                console.warn('Failed to parse legacy view chat history:', e);
            }
        }
    }
    if (!Object.keys(state.chatStore).length) {
        const legacyHistory = localStorage.getItem('chatHistory');
        if (legacyHistory) {
            try {
                const thread = createThread('Market Brief');
                thread.messages = JSON.parse(legacyHistory) || [];
                state.chatStore.overview = {
                    activeThreadId: thread.id,
                    threads: [thread]
                };
                saveChatHistory();
            } catch (e) {
                console.warn('Failed to parse legacy chat history:', e);
            }
        }
    }
    normalizeThreadTitles();
    saveChatHistory();
    renderCurrentChatHistory();
}

function saveChatHistory() {
    localStorage.setItem('chatStore', JSON.stringify(state.chatStore));
}

function getWelcomeMessage() {
    const scope = getChatScope();
    if (COMMODITY_CONTEXT[scope]) {
        return `You are in ${COMMODITY_CONTEXT[scope].name}. GLM 4.7 will use live prices, the four local analysis files, the books corpus, and strategy timing rules for each reply.`;
    }
    return 'Ask about Gold, Silver, Copper, Bitcoin, timing, or portfolio decisions. GLM 4.7 will answer from live prices, local books, strategy rules, and the four analysis files.';
}

function renderCurrentChatHistory() {
    const container = document.getElementById('chat-messages');
    if (!container) return;

    container.innerHTML = '';
    renderThreadOptions();
    const thread = getCurrentThread();
    const history = Array.isArray(thread.messages) ? thread.messages : [];

    if (!history.length) {
        addMessageToUI('assistant', getWelcomeMessage());
        return;
    }

    history.forEach(msg => addMessageToUI(msg.role, msg.content, { chart: msg.chart }));
}

function startNewChat() {
    const thread = getCurrentThread();
    thread.messages = [];
    saveChatHistory();
    renderCurrentChatHistory();
    document.getElementById('chat-input')?.focus();
}

function renderThreadOptions() {
    const select = document.getElementById('thread-select');
    if (!select) return;
    const scopeStore = ensureScopeStore();
    const options = scopeStore.threads
        .map(thread => `<option value="${thread.id}">${escapeHtml(thread.title || 'Untitled thread')}</option>`)
        .join('');
    select.innerHTML = options;
    select.value = scopeStore.activeThreadId;
}

function createNewThread() {
    const scopeStore = ensureScopeStore();
    const thread = createThread(`Thread ${scopeStore.threads.length + 1}`);
    scopeStore.threads.unshift(thread);
    scopeStore.activeThreadId = thread.id;
    saveChatHistory();
    renderCurrentChatHistory();
    document.getElementById('chat-input')?.focus();
}

function switchThread(threadId) {
    const scopeStore = ensureScopeStore();
    if (!scopeStore.threads.some(thread => thread.id === threadId)) return;
    scopeStore.activeThreadId = threadId;
    saveChatHistory();
    renderCurrentChatHistory();
}

function deleteCurrentThread() {
    const scopeStore = ensureScopeStore();
    if (scopeStore.threads.length === 1) {
        startNewChat();
        return;
    }
    scopeStore.threads = scopeStore.threads.filter(thread => thread.id !== scopeStore.activeThreadId);
    scopeStore.activeThreadId = scopeStore.threads[0]?.id || '';
    saveChatHistory();
    renderCurrentChatHistory();
    document.getElementById('chat-input')?.focus();
}

async function loadAnalysisFileContext() {
    if (loadAnalysisFileContext.cache) return loadAnalysisFileContext.cache;

    loadAnalysisFileContext.cache = (async () => {
        const entries = await Promise.all(
            Object.entries(ANALYSIS_FILES).map(async ([key, file]) => {
                try {
                    const response = await fetch(file, { cache: 'no-store' });
                    if (!response.ok) return null;
                    const text = await response.text();
                    return [key, text];
                } catch {
                    return null;
                }
            })
        );
        return Object.fromEntries(entries.filter(Boolean));
    })();

    return loadAnalysisFileContext.cache;
}

async function loadBookTextContext() {
    if (loadBookTextContext.cache) return loadBookTextContext.cache;

    loadBookTextContext.cache = (async () => {
        const entries = await Promise.all(
            BOOK_TEXT_FILES.map(async file => {
                try {
                    const response = await fetch(file, { cache: 'no-store' });
                    if (!response.ok) return null;
                    const text = await response.text();
                    return {
                        file,
                        name: file.split('/').pop().replace(/\.txt$/i, ''),
                        text
                    };
                } catch {
                    return null;
                }
            })
        );
        return entries.filter(Boolean);
    })();

    return loadBookTextContext.cache;
}

async function loadStrategyContext() {
    if (loadStrategyContext.cache) return loadStrategyContext.cache;

    loadStrategyContext.cache = (async () => {
        for (const file of STRATEGY_FILE_CANDIDATES) {
            try {
                const response = await fetch(file, { cache: 'no-store' });
                if (!response.ok) continue;
                const text = (await response.text()).trim();
                if (text) return { file, text };
            } catch {
                // Keep scanning strategy candidates.
            }
        }
        return { file: null, text: 'No extra strategy input file found in the repo.' };
    })();

    return loadStrategyContext.cache;
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

function normalizeSearchTerms(query, scope, book) {
    const bookName = BOOKS[book]?.name || '';
    const commodityName = COMMODITY_CONTEXT[scope]?.name || '';
    return [...new Set(
        `${query} ${scope} ${bookName} ${commodityName} astrology timing support resistance price trend one day before two days before`
            .toLowerCase()
            .match(/[a-z0-9]{3,}/g) || []
    )];
}

function scoreSnippet(text, terms) {
    const haystack = text.toLowerCase();
    return terms.reduce((score, term) => score + (haystack.includes(term) ? 2 : 0), 0);
}

function extractRelevantSnippets(text, terms, maxSnippets = 2, maxChars = 1100) {
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

    const fallback = ranked.length ? ranked : paragraphs.slice(0, 1);
    return fallback.join('\n').slice(0, maxChars);
}

function buildLiveMarketContext() {
    return Object.entries(COMMODITY_CONTEXT).map(([key, info]) => {
        const priceState = state.prices[key] || {};
        const history = (state.priceHistory[key] || []).slice(-7);
        const lastPrices = history.length
            ? history.map(point => `${point.date || point.label}:${Number(point.price).toFixed(2)}`).join(', ')
            : 'No 7-day series loaded yet.';
        const currentPrice = key === 'bitcoin'
            ? (priceState.price ? `$${Number(priceState.price).toLocaleString()}` : 'n/a')
            : (priceState.price ? `₹${priceState.price}` : 'n/a');
        const change = key === 'bitcoin'
            ? (Number.isFinite(Number(priceState.change24h)) ? `${Number(priceState.change24h).toFixed(2)}%` : 'n/a')
            : (priceState.change || 'n/a');
        return `${info.name}
- Current price: ${currentPrice}
- Session change: ${change}
- Recent chart data: ${lastPrices}
- House recommendation: ${getRecommendationSnapshot(key).actionLabel} | ${getRecommendationSnapshot(key).summary}`;
    }).join('\n\n');
}

function buildAnalysisDigest(analysisContext, scope) {
    return Object.entries(analysisContext).map(([key, text]) => {
        const label = COMMODITY_CONTEXT[key]?.name || key;
        const prefix = key === scope ? '[PRIMARY FILE]' : '[REFERENCE FILE]';
        return `${prefix} ${label}\n${summarizeAnalysisText(text)}`;
    }).join('\n\n').slice(0, 7000);
}

function buildBooksDigest(books, query, scope, book) {
    const terms = normalizeSearchTerms(query, scope, book);
    const selectedBook = BOOKS[book]?.name || BOOKS.general.name;
    return books.map(entry => {
        const priority = entry.name.includes(selectedBook) ? '[SELECTED BOOK]' : '[BOOK]';
        const excerpt = extractRelevantSnippets(entry.text, terms, entry.name.includes(selectedBook) ? 3 : 2, entry.name.includes(selectedBook) ? 1500 : 950);
        return `${priority} ${entry.name}\n${excerpt}`;
    }).join('\n\n').slice(0, 9000);
}

function buildStrategyDigest(strategyContext) {
    return [
        'Core timing strategy:',
        TIMING_WINDOW_GUIDANCE,
        '',
        'Execution rules:',
        '- Always discuss the timing date as the center of a 1-3 session turn window.',
        '- If the user asks whether to buy or sell now, weigh live price behavior first, then the timing window, then the local analysis file.',
        '- Mention one-day-before and two-days-before entries only when price action is already aligning.',
        '- Avoid false certainty. Use terms like probable, supportive, weakening, confirming, or invalidated.',
        '',
        `Optional repo strategy file: ${strategyContext.file || 'none found'}`,
        strategyContext.text
    ].join('\n').slice(0, 5000);
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

async function sendChatViaAgent({ msg, history }) {
    const scope = getChatScope();
    const book = document.getElementById('book-select')?.value || 'general';
    const response = await fetch(CONFIG.agent.url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            message: msg,
            commodity: scope,
            book,
            history: history.slice(-7, -1),
            liveMarketContext: buildLiveMarketContext(),
            priceHistory: state.priceHistory,
            prices: state.prices
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Netlify agent failed (${response.status}): ${errorText.slice(0, 220)}`);
    }

    if (!response.body) {
        throw new Error('Netlify agent stream is unavailable.');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let content = '';
    let model = CONFIG.agent.primaryModel;
    let chart = null;

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const rawLine of lines) {
            const line = rawLine.trim();
            if (!line) continue;
            let event;
            try {
                event = JSON.parse(line);
            } catch {
                continue;
            }

            if (event.type === 'status') {
                setAgentStatus(event.message || 'Working');
            } else if (event.type === 'delta') {
                content += event.content || '';
            } else if (event.type === 'final') {
                model = event.model || model;
                chart = event.chart || null;
            } else if (event.type === 'error') {
                throw new Error(event.message || 'Agent failed.');
            }
        }
    }

    if (!content.trim()) {
        throw new Error('Netlify agent returned an empty response.');
    }

    return { content: content.trim(), model, chart };
}

async function warmContextCaches() {
    await Promise.all([
        loadAnalysisFileContext(),
        loadBookTextContext(),
        loadStrategyContext()
    ]);
    state.contextReady = true;
}

async function sendChat() {
    const input = document.getElementById('chat-input');
    const msg = input.value.trim();
    if (!msg || state.isSending) return;
    
    state.isSending = true;
    input.value = '';
    addMessageToUI('user', msg);
    const thread = getCurrentThread();
    const history = thread.messages;
    history.push({ role: 'user', content: msg });
    if (!thread.title || thread.title === 'New thread' || /^Thread \d+$/.test(thread.title)) {
        thread.title = msg.slice(0, 36) || thread.title;
    }
    saveChatHistory();
    
    // Create streaming message placeholder
    const streamingMsgId = 'stream-' + Date.now();
    addStreamingMessage(streamingMsgId);
    setAgentStatus(`Consulting ${CONFIG.agent.primaryModel}`);
    let ticker = null;

    try {
        const resultPromise = sendChatViaAgent({ msg, history });
        ticker = window.setInterval(() => {
            const el = document.getElementById(streamingMsgId);
            if (!el) return;
            const contentEl = el.querySelector('.msg-content');
            if (!contentEl) return;
            const statusText = document.querySelector('.chat-status')?.textContent || 'Working';
            contentEl.innerHTML = `<em>${escapeHtml(statusText)}...</em><span class="streaming-cursor">|</span>`;
        }, 150);
        const result = await resultPromise;
        window.clearInterval(ticker);
        ticker = null;
        if (result?.content) {
            if (result.chart) {
                removeStreamingMessage(streamingMsgId);
                addMessageToUI('assistant', result.content, { chart: result.chart });
            } else {
                finalizeStreamingMessage(streamingMsgId, result.content);
            }
            history.push({ role: 'assistant', content: result.content, chart: result.chart || null });
            saveChatHistory();
            renderThreadOptions();
            setAgentStatus(`${result.model} ready`);
            state.isSending = false;
            return;
        }

        throw new Error('Empty model response');
    } catch (agentError) {
        if (ticker) window.clearInterval(ticker);
        console.error('Agent error:', agentError);
        setAgentStatus('Agent unavailable');
        removeStreamingMessage(streamingMsgId);
        addMessageToUI('assistant', `⚠️ ${String(agentError?.message || 'Model request failed.')}`);
        state.isSending = false;
    }

    state.isSending = false;
}

function addStreamingMessage(id) {
    const container = document.getElementById('chat-messages');
    const div = document.createElement('div');
    div.className = 'msg streaming';
    div.id = id;
    div.innerHTML = '<span class="avatar ai">AI</span><div class="msg-content"><span class="streaming-cursor">|</span></div>';
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

function updateStreamingMessage(id, content) {
    const el = document.getElementById(id);
    if (el) {
        const contentEl = el.querySelector('.msg-content');
        if (contentEl) {
            contentEl.innerHTML = formatContent(content) + '<span class="streaming-cursor">|</span>';
        }
        el.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
}

function finalizeStreamingMessage(id, content) {
    const el = document.getElementById(id);
    if (el) {
        el.className = 'msg';
        const contentEl = el.querySelector('.msg-content');
        if (contentEl) {
            contentEl.innerHTML = formatContent(content);
        }
    }
}

function removeStreamingMessage(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

function buildInlineChartConfig(chartPayload) {
    const labels = Array.isArray(chartPayload?.labels) ? chartPayload.labels : [];
    const datasets = Array.isArray(chartPayload?.datasets) ? chartPayload.datasets : [];
    return {
        type: chartPayload?.type || 'line',
        data: {
            labels,
            datasets: datasets.map((dataset, index) => ({
                label: dataset.label || `Series ${index + 1}`,
                data: Array.isArray(dataset.data) ? dataset.data : [],
                borderColor: dataset.borderColor || ['#fbbf24', '#c0c0c0', '#cd7f32', '#f7931a'][index % 4],
                backgroundColor: dataset.backgroundColor || 'rgba(251, 191, 36, 0.12)',
                fill: Boolean(dataset.fill),
                tension: 0.3,
                borderWidth: 2,
                pointRadius: 2
            }))
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: '#d6d6d6',
                        font: { size: 11 }
                    }
                },
                title: chartPayload?.title
                    ? {
                        display: true,
                        text: chartPayload.title,
                        color: '#f3f4f6',
                        font: { size: 12, weight: '600' }
                    }
                    : undefined
            },
            scales: {
                x: {
                    ticks: { color: '#9ca3af' },
                    grid: { color: 'rgba(255,255,255,0.05)' }
                },
                y: {
                    ticks: { color: '#9ca3af' },
                    grid: { color: 'rgba(255,255,255,0.05)' }
                }
            }
        }
    };
}

function renderInlineChatChart(canvasId, chartPayload) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || typeof Chart === 'undefined') return;
    state.chatCharts[canvasId]?.destroy?.();
    state.chatCharts[canvasId] = new Chart(canvas, buildInlineChartConfig(chartPayload));
}

function askAI(question) {
    document.getElementById('chat-input').value = question;
    sendChat();
}

function addMessageToUI(role, content, options = {}) {
    const container = document.getElementById('chat-messages');
    const div = document.createElement('div');
    div.className = `msg ${role === 'user' ? 'user' : ''}`;
    
    const avatarClass = role === 'user' ? 'avatar' : 'avatar ai';
    const avatarText = role === 'user' ? 'You' : 'AI';
    const chart = options.chart;
    const chartId = chart ? `chat-chart-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` : '';
    const chartMarkup = chart
        ? `<div class="inline-chart-card"><div class="inline-chart-meta">${escapeHtml(chart.title || 'Chart')}</div><div class="inline-chart-wrap"><canvas id="${chartId}"></canvas></div></div>`
        : '';
    div.innerHTML = `<span class="${avatarClass}">${avatarText}</span><div class="msg-content">${formatContent(content)}${chartMarkup}</div>`;
    
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
    if (chart) {
        queueMicrotask(() => renderInlineChatChart(chartId, chart));
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatContent(text) {
    // Use marked.js for markdown rendering if available
    if (typeof marked !== 'undefined') {
        try {
            return marked.parse(text);
        } catch (e) {
            console.warn('Marked parse error:', e);
        }
    }
    
    return escapeHtml(text)
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code>$1</code>')
        .replace(/\n/g, '<br>');
}

// ========== COUNTDOWNS ==========
function updateCountdowns() {
    const now = new Date();
    const apr1 = new Date(now.getFullYear(), 3, 1);
    
    if (apr1 > now) {
        const days = Math.ceil((apr1 - now) / 86400000);
        const el = document.getElementById('copper-countdown');
        if (el) el.textContent = `${days} days until SUPER BULLISH period`;
    }
}

// ========== INIT ==========
document.addEventListener('DOMContentLoaded', () => {
    loadPriceHistory();
    loadChatHistory();
    initChatResize();
    initCharts();
    renderRecommendations();
    refreshAllData();
    updateCountdowns();
    updateChatContext();
    warmContextCaches()
        .then(() => setAgentStatus('Local context ready'))
        .catch(error => {
            console.warn('Context warmup failed:', error);
            setAgentStatus('Context partial');
        });
    document.getElementById('book-select')?.addEventListener('change', () => {
        updateChatContext();
        renderCurrentChatHistory();
    });
    
    // Fix chart sizing after a short delay
    setTimeout(() => {
        Object.values(state.charts).forEach(chart => {
            if (chart) chart.resize();
        });
    }, 100);
    
    // Auto-refresh every hour
    setInterval(refreshAllData, CONFIG.refreshInterval);
    
    console.log('Astro Trading Dashboard ready');
});

// ========== MOBILE TOGGLES ==========
function toggleSidebar() {
    document.querySelector('.sidebar').classList.toggle('open');
    document.querySelector('.chat-panel').classList.remove('open');
}

function toggleChat() {
    document.querySelector('.chat-panel').classList.toggle('open');
    document.querySelector('.sidebar').classList.remove('open');
}
