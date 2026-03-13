// ========== CONFIGURATION ==========
const CONFIG = {
    alphavantage: {
        key: 'S9ZYCKGLYTDLOWTZ',
        cacheTime: 3600000
    },
    zai: {
        key: 'f06361dee1044c2387e21d15deb5c917.loNg83Ixj4zcQJF5',
        url: 'https://api.z.ai/api/coding/paas/v4',
        model: 'glm-5',
        fallbackModel: 'glm-4.7-flashx',  // FlashX version as backup
        maxTokens: 4000,
        maxContinuations: 2
    },
    agent: {
        url: '/api/agent/stream'
    },
    refreshInterval: 3600000
};

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

Be positive, helpful, and provide specific actionable advice. Always use correct ETF names.`
    },
    gann: {
        name: 'W.D. Gann Methods',
        context: `Expert in W.D. Gann trading methods: time cycles (30/90 day), price squares, geometric angles. "Time is more important than price." Anniversary dates of highs/lows are key. Apply to current commodity markets.`
    },
    vedic: {
        name: 'Vedic Astrology',
        context: `Vedic astrology expert: Wealth nakshatras (Rohini, Hasta, Shravana), planetary dashas, muhurta timing. User has Jupiter in 2nd house = excellent wealth potential.`
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
- Super bullish periods: When transits activate 2nd house`
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

Provide positive, encouraging Bitcoin advice.`
    }
};

// ========== STATE ==========
const state = {
    currentView: 'overview',
    prices: { gold: {}, silver: {}, copper: {}, bitcoin: {} },
    charts: {},
    chatStore: {},
    priceHistory: { gold: [], silver: [], copper: [], bitcoin: [] },
    isSending: false
};

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

function buildChartLabels(points) {
    if (!Array.isArray(points)) return getDayLabels(7);
    return points.map(point => point.label || '');
}

function toChartPoints(prices, timestamps = []) {
    return (prices || [])
        .map((price, index) => {
            const value = Number(price);
            if (!Number.isFinite(value)) return null;
            const rawTime = timestamps[index];
            const label = rawTime
                ? new Date(rawTime * 1000).toLocaleDateString('en-US', { weekday: 'short' })
                : getDayLabels(prices.length)[index] || '';
            return { label, price: value };
        })
        .filter(Boolean);
}

function toCoinGeckoChartPoints(prices) {
    return (prices || [])
        .map(entry => {
            const timestamp = Array.isArray(entry) ? entry[0] : null;
            const value = Array.isArray(entry) ? Number(entry[1]) : NaN;
            if (!timestamp || !Number.isFinite(value)) return null;
            return {
                label: new Date(timestamp).toLocaleDateString('en-US', { weekday: 'short' }),
                price: value
            };
        })
        .filter(Boolean)
        .filter((point, index, arr) => index === arr.findIndex(item => item.label === point.label))
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
                label: new Date(d).toLocaleDateString('en-US', { weekday: 'short' }),
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
        return d.toLocaleDateString('en-US', { weekday: 'short' });
    });
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
                            label: item.label || (item.time
                                ? new Date(item.time).toLocaleDateString('en-US', { weekday: 'short' })
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
        const thread = createThread(scope === 'overview' ? 'General chat' : `${COMMODITY_CONTEXT[scope].name}`);
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
                    const thread = createThread(scope === 'overview' ? 'General chat' : 'Imported thread');
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
                const thread = createThread('General chat');
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
    renderCurrentChatHistory();
}

function saveChatHistory() {
    localStorage.setItem('chatStore', JSON.stringify(state.chatStore));
}

function getWelcomeMessage() {
    const scope = getChatScope();
    if (COMMODITY_CONTEXT[scope]) {
        return `You are in ${COMMODITY_CONTEXT[scope].name}. I will use the selected reference and current live prices for this commodity when answering.`;
    }
    return 'Ask about Gold, Silver, Copper, Bitcoin, timing, or portfolio decisions. I will use the selected reference and current live prices in the reply.';
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

    history.forEach(msg => addMessageToUI(msg.role, msg.content));
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

function handleThreadAction(action) {
    if (!action) return;
    if (action === 'new-chat') startNewChat();
    if (action === 'new-thread') createNewThread();
    if (action === 'delete-thread') deleteCurrentThread();
    const actions = document.querySelector('.thread-actions');
    if (actions) actions.value = '';
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

function getContextForCurrentView() {
    // Get commodity context if viewing a specific commodity
    const commodityCtx = COMMODITY_CONTEXT[state.currentView];
    
    // Get selected book
    const bookSelect = document.getElementById('book-select');
    const book = bookSelect?.value || 'general';
    const bookCtx = BOOKS[book]?.context || BOOKS.general.context;
    
    // Combine contexts
    let context = bookCtx;
    
    // Add commodity-specific context if viewing a commodity
    if (commodityCtx) {
        context += `\n\n${commodityCtx.context}`;
    }
    
    // Add current prices
    context += `\n\nCURRENT PRICES:
- Gold: ₹${state.prices.gold.price || '--'} (${state.prices.gold.change || '--'})
- Silver: ₹${state.prices.silver.price || '--'} (${state.prices.silver.change || '--'})
- Copper: ₹${state.prices.copper.price || '--'} (${state.prices.copper.change || '--'})
- Bitcoin: $${state.prices.bitcoin.price?.toLocaleString() || '--'} (${state.prices.bitcoin.change24h?.toFixed(2) || '--'}%)`;
    
    return context;
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
    
    // Get combined context
    const context = getContextForCurrentView();
    
    // Create streaming message placeholder
    const streamingMsgId = 'stream-' + Date.now();
    addStreamingMessage(streamingMsgId);
    setAgentStatus('Agent thinking');

    try {
        const fullReply = await sendChatViaAgent({
            msg,
            history,
            thread,
            streamingMsgId
        });
        if (fullReply) {
            finalizeStreamingMessage(streamingMsgId, fullReply);
            history.push({ role: 'assistant', content: fullReply });
            saveChatHistory();
            renderThreadOptions();
            setAgentStatus('Agent ready');
            state.isSending = false;
            return;
        }
        throw new Error('Empty agent response');
    } catch (agentError) {
        console.error('Agent backend error:', agentError);
        setAgentStatus('Direct chat fallback');
    }
    
    // Try primary model, fallback to glm-4.7-flashx if rate limited
    const models = [CONFIG.zai.model, CONFIG.zai.fallbackModel];
    let fullReply = '';
    let lastError = null;
    
    for (const model of models) {
        try {
            let continuationCount = 0;
            let needsContinuation = false;

            do {
                needsContinuation = false;
                const requestMessages = [
                    { role: 'system', content: context },
                    ...history.slice(-10)
                ];

                if (fullReply) {
                    requestMessages.push({ role: 'assistant', content: fullReply });
                    requestMessages.push({
                        role: 'user',
                        content: 'Continue exactly from where you stopped. Do not repeat previous text. Finish the answer completely.'
                    });
                }

                const res = await fetch(`${CONFIG.zai.url}/chat/completions`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${CONFIG.zai.key}`
                    },
                    body: JSON.stringify({
                        model: model,
                        messages: requestMessages,
                        max_tokens: CONFIG.zai.maxTokens,
                        temperature: 0.7,
                        stream: true
                    })
                });
                
                if (!res.ok) {
                    const errorData = await res.json();
                    throw new Error(errorData.error?.message || 'API error');
                }
                
                const reader = res.body.getReader();
                const decoder = new TextDecoder();
                let finishReason = null;
                
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    
                    const chunk = decoder.decode(value, { stream: true });
                    const lines = chunk.split('\n').filter(line => line.trim() !== '');
                    
                    for (const line of lines) {
                        if (!line.startsWith('data: ')) continue;
                        const data = line.slice(6);
                        if (data === '[DONE]') continue;
                        
                        try {
                            const json = JSON.parse(data);
                            const choice = json.choices?.[0];
                            const content = choice?.delta?.content;
                            if (content) {
                                fullReply += content;
                                updateStreamingMessage(streamingMsgId, fullReply);
                            }
                            if (choice?.finish_reason) {
                                finishReason = choice.finish_reason;
                            }
                        } catch (e) {
                            // Skip invalid JSON
                        }
                    }
                }

                if (finishReason === 'length' && continuationCount < CONFIG.zai.maxContinuations) {
                    needsContinuation = true;
                    continuationCount += 1;
                }
            } while (needsContinuation);
            
            if (fullReply) {
                finalizeStreamingMessage(streamingMsgId, fullReply);
                history.push({ role: 'assistant', content: fullReply });
                saveChatHistory();
                renderThreadOptions();
                setAgentStatus('Agent ready');
                state.isSending = false;
                return;  // Success
            }
            
        } catch (e) {
            lastError = e;
            console.error(`Model ${model} error:`, e);
            // Continue to next model
        }
    }
    
    // If we get here, both models failed
    removeStreamingMessage(streamingMsgId);
    const errorMsg = lastError?.message?.includes('rate') || lastError?.message?.includes('limit')
        ? '⚠️ Rate limit reached. Please try again in a few minutes.'
        : '⚠️ Connection error. Please try again.';
    addMessageToUI('assistant', errorMsg);
    setAgentStatus('Agent offline');
    state.isSending = false;
}

async function sendChatViaAgent({ msg, history, thread, streamingMsgId }) {
    const bookSelect = document.getElementById('book-select');
    const book = bookSelect?.value || 'general';
    const response = await fetch(CONFIG.agent.url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            message: msg,
            commodity: COMMODITY_CONTEXT[state.currentView] ? state.currentView : 'overview',
            book,
            threadId: thread.id,
            history: history.slice(-8)
        })
    });

    if (!response.ok || !response.body) {
        throw new Error('Agent backend unavailable');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullReply = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split('\n\n');
        buffer = chunks.pop() || '';

        for (const chunk of chunks) {
            const parsed = parseSseChunk(chunk);
            if (!parsed) continue;
            const { event, data } = parsed;

            if (event === 'status') {
                setAgentStatus(data.message || 'Working');
            } else if (event === 'tool') {
                setAgentStatus(`Running ${data.name || 'tool'}`);
            } else if (event === 'tool_result') {
                setAgentStatus(data.name ? `${data.name} ready` : 'Tool finished');
            } else if (event === 'delta') {
                fullReply += data.content || '';
                updateStreamingMessage(streamingMsgId, fullReply);
            } else if (event === 'error') {
                throw new Error(data.message || 'Agent stream failed');
            }
        }
    }

    return fullReply.trim();
}

function parseSseChunk(chunk) {
    const lines = chunk.split('\n');
    let event = 'message';
    const dataLines = [];

    for (const line of lines) {
        if (line.startsWith('event:')) {
            event = line.slice(6).trim();
        } else if (line.startsWith('data:')) {
            dataLines.push(line.slice(5).trim());
        }
    }

    if (!dataLines.length) return null;

    try {
        return {
            event,
            data: JSON.parse(dataLines.join('\n'))
        };
    } catch (e) {
        return null;
    }
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

function askAI(question) {
    document.getElementById('chat-input').value = question;
    sendChat();
}

function addMessageToUI(role, content) {
    const container = document.getElementById('chat-messages');
    const div = document.createElement('div');
    div.className = `msg ${role === 'user' ? 'user' : ''}`;
    
    const avatarClass = role === 'user' ? 'avatar' : 'avatar ai';
    const avatarText = role === 'user' ? 'You' : 'AI';
    div.innerHTML = `<span class="${avatarClass}">${avatarText}</span><div class="msg-content">${formatContent(content)}</div>`;
    
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
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
    initCharts();
    refreshAllData();
    updateCountdowns();
    updateChatContext();
    setAgentStatus('Agent ready');
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
