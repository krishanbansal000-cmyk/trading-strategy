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
        fallbackModel: 'glm-4.7-flash'
    },
    refreshInterval: 3600000
};

// ========== BOOK CONTEXTS ==========
const BOOKS = {
    general: {
        name: 'Financial Astrology',
        context: `You are a financial astrology expert specializing in commodity trading.

COMMODITY ASSOCIATIONS:
- Gold (GOLDBEES): Ruled by Sun. Bullish when Sun in Aries (Mar20-Apr19), Leo (Aug16-Sep16). Avoid when Sun in Libra (Oct17-Nov16).
- Silver (SILVERBEES): Ruled by Moon. Bullish when Moon in Taurus (exalted), Full Moon days. Avoid Moon in Scorpio (debilitated).
- Copper (Hindustan Copper): Ruled by Venus. SUPER BULLISH Apr1-25 (Venus in Taurus). DANGER Jul10-Aug4 (Venus in Virgo debilitated).
- Bitcoin: Ruled by Rahu. SUPER BULLISH until Jun 2026 (Rahu in Aquarius). Target $90K-$110K.

USER'S CHART: Born Aug 29 2000, 9:39PM IST, Gurugram. Jupiter in Taurus 2nd house = wealth. Venus debilitated = caution with copper.

Be positive, helpful, and provide specific actionable advice.`
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
        name: 'Gold (GOLDBEES)',
        context: `Current context: GOLD trading. Ruled by Sun.

CURRENT STATUS:
- Score: 4/10 - HOLD
- Stop Loss: -5%
- Targets: +3%, +5%, +8%, +12%

KEY DATES:
- Mar 20: Sun enters Aries - BULLISH
- Oct 17-Nov 16: Sun in Libra - AVOID

USER FIT: Excellent (Sun in Leo in birth chart = strong gold affinity)

Provide specific gold trading advice. Be positive and actionable.`
    },
    silver: {
        name: 'Silver (SILVERBEES)',
        context: `Current context: SILVER trading. Ruled by Moon.

CURRENT STATUS:
- Score: 0/10 - AVOID today
- Stop Loss: -8%
- Targets: +3%, +5%, +8%, +12%

KEY DATES:
- Moon in Taurus: BEST for silver
- Moon in Scorpio: WORST - AVOID
- Full Moon: High volatility, potential breakout

VERIFIED PERFORMANCE: +4.90% returns (Mar 5-11, 2026), 100% trend accuracy

Provide specific silver trading advice.`
    },
    copper: {
        name: 'Copper (Hindustan Copper)',
        context: `Current context: COPPER trading. Ruled by Venus.

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
    chatHistory: [],
    priceHistory: { gold: [], silver: [], copper: [], bitcoin: [] }
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
}

function updateChatContext() {
    const indicator = document.getElementById('chat-context');
    if (!indicator) return;
    
    if (state.currentView && COMMODITY_CONTEXT[state.currentView]) {
        indicator.textContent = `📍 ${COMMODITY_CONTEXT[state.currentView].name}`;
    } else {
        indicator.textContent = '';
    }
}

// Initialize navigation
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
});

// ========== PRICING APIS ==========

// Gold & Silver via Alphavantage
async function fetchAlphavantage(symbol) {
    const cacheKey = `av_${symbol}`;
    const cached = localStorage.getItem(cacheKey);
    
    if (cached) {
        const { data, time } = JSON.parse(cached);
        if (Date.now() - time < CONFIG.alphavantage.cacheTime) return data;
    }
    
    try {
        const res = await fetch(
            `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${CONFIG.alphavantage.key}`
        );
        const json = await res.json();
        
        if (json['Global Quote']) {
            const quote = json['Global Quote'];
            const data = {
                price: parseFloat(quote['05. price']),
                change: parseFloat(quote['09. change']),
                changePercent: quote['10. change percent'],
                timestamp: Date.now()
            };
            localStorage.setItem(cacheKey, JSON.stringify({ data, time: Date.now() }));
            return data;
        }
    } catch (e) {
        console.error('Alphavantage error:', e);
    }
    return null;
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
        // CoinGecko simple price API
        const res = await fetch(
            'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true&include_7d_change=true&include_market_cap=true'
        );
        const json = await res.json();
        
        if (json.bitcoin) {
            const data = {
                price: json.bitcoin.usd,
                change24h: json.bitcoin.usd_24h_change || 0,
                change7d: json.bitcoin.usd_7d_change || 0,
                marketCap: json.bitcoin.usd_market_cap || 0
            };
            localStorage.setItem(cacheKey, JSON.stringify({ data, time: Date.now() }));
            return data;
        }
    } catch (e) {
        console.error('CoinGecko error:', e);
    }
    
    // Fallback
    return { price: 71000, change24h: 2.5, change7d: 5 };
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

// Hindustan Copper - Yahoo Finance (via query1.finance.yahoo.com with CORS proxy alternative)
async function fetchYahooFinance(symbol) {
    const cacheKey = `yf_${symbol}`;
    const cached = localStorage.getItem(cacheKey);
    
    if (cached) {
        const { data, time } = JSON.parse(cached);
        if (Date.now() - time < CONFIG.alphavantage.cacheTime) return data;
    }
    
    try {
        // Try Yahoo Finance API
        const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=7d`);
        const json = await res.json();
        
        if (json.chart?.result?.[0]) {
            const result = json.chart.result[0];
            const quote = result.meta;
            const prices = result.indicators.quote[0];
            const currentPrice = quote.regularMarketPrice;
            const previousClose = quote.previousClose;
            const change = ((currentPrice - previousClose) / previousClose) * 100;
            
            const data = {
                price: currentPrice.toFixed(2),
                change: change.toFixed(2),
                changePercent: change.toFixed(2) + '%',
                currency: quote.currency,
                prices: prices.close.filter(p => p !== null)
            };
            
            localStorage.setItem(cacheKey, JSON.stringify({ data, time: Date.now() }));
            return data;
        }
    } catch (e) {
        console.error('Yahoo Finance error:', e);
    }
    
    // Fallback: simulated based on realistic values
    return getSimulatedCopperPrice();
}

// Simulated Copper price (fallback when APIs fail)
function getSimulatedCopperPrice() {
    const basePrice = 508;
    const variance = (Math.random() - 0.5) * 12;
    const price = basePrice + variance;
    const change = (variance / basePrice) * 100;
    return {
        price: price.toFixed(2),
        change: change.toFixed(2),
        changePercent: change.toFixed(2) + '%',
        prices: null
    };
}

// ========== REFRESH ALL DATA ==========
async function refreshAllData() {
    const btn = document.querySelector('.refresh-btn');
    if (btn) btn.innerHTML = '⏳';
    
    try {
        // Gold (GLD ETF -> INR)
        const goldData = await fetchAlphavantage('GLD');
        if (goldData) {
            const inrPrice = (goldData.price * 83 * 1.58).toFixed(2);
            state.prices.gold = { price: inrPrice, change: goldData.changePercent };
            updatePriceUI('gold', inrPrice, goldData.changePercent);
            state.priceHistory.gold.push({ time: Date.now(), price: parseFloat(inrPrice) });
        }
        
        // Silver (SLV ETF -> INR)
        const silverData = await fetchAlphavantage('SLV');
        if (silverData) {
            const inrPrice = (silverData.price * 83 * 2.48).toFixed(2);
            state.prices.silver = { price: inrPrice, change: silverData.changePercent };
            updatePriceUI('silver', inrPrice, silverData.changePercent);
            state.priceHistory.silver.push({ time: Date.now(), price: parseFloat(inrPrice) });
        }
        
        // Copper (Hindustan Copper - HINDCOPPER.NS on NSE)
        const copperData = await fetchYahooFinance('HINDCOPPER.NS');
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
            if (currEl) currEl.textContent = `₹${copperData.price}`;
            
            state.priceHistory.copper.push({ time: Date.now(), price: parseFloat(copperData.price) });
        }
        
        // Bitcoin (CoinGecko)
        const btcData = await fetchCoinGecko();
        if (btcData) {
            state.prices.bitcoin = btcData;
            updatePriceUI('btc', btcData.price.toLocaleString(), btcData.change24h.toFixed(2) + '%', '$');
            document.getElementById('btc-current')?.textContent && 
                (document.getElementById('btc-current').textContent = `~$${btcData.price.toLocaleString()}`);
            state.priceHistory.bitcoin.push({ time: Date.now(), price: btcData.price });
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
    
    if (btn) btn.innerHTML = '🔄';
}

function updatePriceUI(commodity, price, change, prefix = '₹') {
    // Main price cards
    const priceEl = document.getElementById(`price-${commodity}`);
    const changeEl = document.getElementById(`change-${commodity}`);
    const badgeEl = document.getElementById(`${commodity === 'btc' ? 'btc' : commodity}-badge`);
    
    if (priceEl) priceEl.textContent = `${prefix}${price}`;
    if (changeEl) {
        changeEl.textContent = change;
        changeEl.className = `change ${parseFloat(change) >= 0 ? 'up' : 'down'}`;
    }
    if (badgeEl) badgeEl.textContent = change;
    
    // Detail views
    const detailPriceEl = document.getElementById(`${commodity}-detail-price`);
    const detailChangeEl = document.getElementById(`${commodity}-detail-change`);
    
    if (detailPriceEl) detailPriceEl.textContent = `${prefix}${price}`;
    if (detailChangeEl) {
        detailChangeEl.textContent = change;
        detailChangeEl.className = `big-change ${parseFloat(change) >= 0 ? 'up' : 'down'}`;
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
    
    // Overview chart
    const ctxOverview = document.getElementById('overviewChart');
    if (ctxOverview) {
        state.charts.overview = new Chart(ctxOverview, {
            type: 'line',
            data: {
                labels: getDayLabels(7),
                datasets: [
                    { label: 'Gold (₹)', data: randomData(7, 128, 135), borderColor: '#FFD700', backgroundColor: 'rgba(255,215,0,0.1)', tension: 0.3, fill: true },
                    { label: 'Silver (₹)', data: randomData(7, 242, 255), borderColor: '#C0C0C0', backgroundColor: 'rgba(192,192,192,0.1)', tension: 0.3, fill: true }
                ]
            },
            options: chartOptions
        });
    }
    
    // Individual charts
    const configs = {
        gold: { color: '#FFD700', range: [128, 135] },
        silver: { color: '#C0C0C0', range: [242, 255] },
        copper: { color: '#CD7F32', range: [495, 525] },
        bitcoin: { color: '#F7931A', range: [68000, 74000] }
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
                        data: randomData(7, configs[key].range[0], configs[key].range[1]),
                        borderColor: configs[key].color,
                        backgroundColor: configs[key].color.replace(')', ',0.1)').replace('rgb', 'rgba'),
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

function randomData(count, min, max) {
    return Array.from({ length: count }, () => min + Math.random() * (max - min));
}

function updateCharts() {
    ['gold', 'silver', 'copper', 'bitcoin'].forEach(key => {
        const history = state.priceHistory[key];
        if (history.length > 1 && state.charts[key]) {
            const recent = history.slice(-7);
            if (recent.length > 1) {
                state.charts[key].data.datasets[0].data = recent.map(h => h.price);
                state.charts[key].update('none');
            }
        }
    });
}

function savePriceHistory() {
    localStorage.setItem('priceHistory', JSON.stringify(state.priceHistory));
}

function loadPriceHistory() {
    const saved = localStorage.getItem('priceHistory');
    if (saved) state.priceHistory = JSON.parse(saved);
}

// ========== AI CHAT ==========
function loadChatHistory() {
    const saved = localStorage.getItem('chatHistory');
    if (saved) {
        state.chatHistory = JSON.parse(saved);
        state.chatHistory.forEach(msg => addMessageToUI(msg.role, msg.content));
    }
}

function saveChatHistory() {
    localStorage.setItem('chatHistory', JSON.stringify(state.chatHistory));
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
    if (!msg) return;
    
    input.value = '';
    addMessageToUI('user', msg);
    state.chatHistory.push({ role: 'user', content: msg });
    
    // Get combined context
    const context = getContextForCurrentView();
    
    // Try primary model, fallback to glm-4.7-flash if rate limited
    const models = [CONFIG.zai.model, CONFIG.zai.fallbackModel];
    let reply = null;
    let lastError = null;
    
    for (const model of models) {
        try {
            const res = await fetch(`${CONFIG.zai.url}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${CONFIG.zai.key}`
                },
                body: JSON.stringify({
                    model: model,
                    messages: [
                        { role: 'system', content: context },
                        ...state.chatHistory.slice(-10)
                    ],
                    max_tokens: 1500,
                    temperature: 0.7
                })
            });
            
            const json = await res.json();
            
            if (json.choices?.[0]?.message?.content) {
                reply = json.choices[0].message.content;
                
                // Add model indicator if using fallback
                if (model === CONFIG.zai.fallbackModel) {
                    console.log('Using fallback model: glm-4.7-flash');
                }
                break;  // Success, exit loop
            } else if (json.error) {
                lastError = json.error;
                console.warn(`Model ${model} failed:`, json.error.message);
                // Continue to next model
            }
        } catch (e) {
            lastError = e;
            console.error(`Model ${model} error:`, e);
            // Continue to next model
        }
    }
    
    if (reply) {
        addMessageToUI('assistant', reply);
        state.chatHistory.push({ role: 'assistant', content: reply });
        saveChatHistory();
    } else {
        const errorMsg = lastError?.message?.includes('rate') || lastError?.message?.includes('limit')
            ? '⚠️ Rate limit reached. Please try again in a few minutes.'
            : '⚠️ Connection error. Please try again.';
        addMessageToUI('assistant', errorMsg);
    }
}

function askAI(question) {
    document.getElementById('chat-input').value = question;
    sendChat();
}

function addMessageToUI(role, content) {
    const container = document.getElementById('chat-messages');
    const div = document.createElement('div');
    div.className = `msg ${role === 'user' ? 'user' : ''}`;
    
    const avatar = role === 'user' ? '👤' : '🤖';
    div.innerHTML = `<span class="avatar">${avatar}</span><p>${formatContent(content)}</p>`;
    
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

function formatContent(text) {
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\n/g, '<br>')
        .replace(/- (.*?)(<br>|$)/g, '• $1$2');
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
    
    // Auto-refresh every hour
    setInterval(refreshAllData, CONFIG.refreshInterval);
    
    console.log('🌟 Astro Trading Dashboard ready');
});
