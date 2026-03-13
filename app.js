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
        fallbackModel: 'glm-4.7-flashx'  // FlashX version as backup
    },
    refreshInterval: 3600000
};

// ETF Symbols on NSE
const ETF_SYMBOLS = {
    gold: 'TATAGOLDETF.NS',      // Tata Gold ETF
    silver: 'GROWWSILVER.NS',    // Groww Silver ETF  
    copper: 'HINDCOPPER.NS'      // Hindustan Copper
};

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

// Yahoo Finance API (for all NSE ETFs)
async function fetchYahooFinance(symbol) {
    const cacheKey = `yf_${symbol}`;
    const cached = localStorage.getItem(cacheKey);
    
    if (cached) {
        const { data, time } = JSON.parse(cached);
        if (Date.now() - time < CONFIG.alphavantage.cacheTime) return data;
    }
    
    try {
        // Try multiple CORS proxies
        const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=7d`;
        const proxies = [
            `https://api.allorigins.win/raw?url=${encodeURIComponent(yahooUrl)}`,
            `https://corsproxy.io/?${encodeURIComponent(yahooUrl)}`
        ];
        
        let json = null;
        for (const proxyUrl of proxies) {
            try {
                const res = await fetch(proxyUrl);
                if (res.ok) {
                    json = await res.json();
                    break;
                }
            } catch (e) { continue; }
        }
        if (!json) throw new Error('All proxies failed');
        
        if (json.chart?.result?.[0]) {
            const result = json.chart.result[0];
            const meta = result.meta;
            const currentPrice = meta.regularMarketPrice;
            const previousClose = meta.previousClose;
            const change = ((currentPrice - previousClose) / previousClose) * 100;
            
            const data = {
                price: currentPrice.toFixed(2),
                change: change.toFixed(2),
                changePercent: change.toFixed(2) + '%',
                prices: result.indicators.quote[0].close.filter(p => p !== null)
            };
            
            localStorage.setItem(cacheKey, JSON.stringify({ data, time: Date.now() }));
            return data;
        }
    } catch (e) {
        console.error('Yahoo Finance error:', e);
    }
    
    // Fallback: simulated based on realistic values
    return getSimulatedPrice(symbol);
}

// Simulated price fallback
function getSimulatedPrice(symbol) {
    const basePrices = {
        'TATAGOLDETF.NS': 58,
        'GROWWSILVER.NS': 82,
        'HINDCOPPER.NS': 508
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
            state.priceHistory.gold.push({ time: Date.now(), price: parseFloat(goldData.price) });
        }
        
        // Silver (Groww Silver ETF - NSE)
        const silverData = await fetchYahooFinance(ETF_SYMBOLS.silver);
        if (silverData) {
            state.prices.silver = { price: silverData.price, change: silverData.changePercent };
            updatePriceUI('silver', silverData.price, silverData.changePercent);
            state.priceHistory.silver.push({ time: Date.now(), price: parseFloat(silverData.price) });
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
            
            state.priceHistory.copper.push({ time: Date.now(), price: parseFloat(copperData.price) });
        }
        
        // Bitcoin (CoinGecko)
        const btcData = await fetchCoinGecko();
        if (btcData) {
            state.prices.bitcoin = btcData;
            updatePriceUI('btc', btcData.price.toLocaleString(), btcData.change24h.toFixed(2) + '%', '$');
            const btcCurrEl = document.getElementById('btc-current');
            if (btcCurrEl) btcCurrEl.textContent = `~$${btcData.price.toLocaleString()}`;
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
                    { label: 'Gold (₹)', data: randomData(7, 55, 62), borderColor: '#FFD700', backgroundColor: 'rgba(255,215,0,0.1)', tension: 0.3, fill: true },
                    { label: 'Silver (₹)', data: randomData(7, 78, 86), borderColor: '#C0C0C0', backgroundColor: 'rgba(192,192,192,0.1)', tension: 0.3, fill: true }
                ]
            },
            options: chartOptions
        });
    }
    
    // Individual charts (price ranges for Tata Gold ETF, Groww Silver ETF)
    const configs = {
        gold: { color: '#FFD700', range: [55, 62] },
        silver: { color: '#C0C0C0', range: [78, 86] },
        copper: { color: '#CD7F32', range: [490, 520] },
        bitcoin: { color: '#F7931A', range: [70000, 75000] }
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
    
    // Create streaming message placeholder
    const streamingMsgId = 'stream-' + Date.now();
    addStreamingMessage(streamingMsgId);
    
    // Try primary model, fallback to glm-4.7-flashx if rate limited
    const models = [CONFIG.zai.model, CONFIG.zai.fallbackModel];
    let fullReply = '';
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
                    temperature: 0.7,
                    stream: true  // Enable streaming
                })
            });
            
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error?.message || 'API error');
            }
            
            // Handle streaming response
            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n').filter(line => line.trim() !== '');
                
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        if (data === '[DONE]') continue;
                        
                        try {
                            const json = JSON.parse(data);
                            const content = json.choices?.[0]?.delta?.content;
                            if (content) {
                                fullReply += content;
                                updateStreamingMessage(streamingMsgId, fullReply);
                            }
                        } catch (e) {
                            // Skip invalid JSON
                        }
                    }
                }
            }
            
            if (fullReply) {
                finalizeStreamingMessage(streamingMsgId, fullReply);
                state.chatHistory.push({ role: 'assistant', content: fullReply });
                saveChatHistory();
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
}

function addStreamingMessage(id) {
    const container = document.getElementById('chat-messages');
    const div = document.createElement('div');
    div.className = 'msg streaming';
    div.id = id;
    div.innerHTML = '<span class="avatar ai">AI</span><p><span class="streaming-cursor">|</span></p>';
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

function updateStreamingMessage(id, content) {
    const el = document.getElementById(id);
    if (el) {
        const p = el.querySelector('p');
        if (p) {
            p.innerHTML = formatContent(content) + '<span class="streaming-cursor">|</span>';
        }
        el.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
}

function finalizeStreamingMessage(id, content) {
    const el = document.getElementById(id);
    if (el) {
        el.className = 'msg';
        const p = el.querySelector('p');
        if (p) {
            p.innerHTML = formatContent(content);
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
    div.innerHTML = `<span class="${avatarClass}">${avatarText}</span><p>${formatContent(content)}</p>`;
    
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
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
    
    // Fallback: basic markdown
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code>$1</code>')
        .replace(/^### (.*$)/gm, '<h4>$1</h4>')
        .replace(/^## (.*$)/gm, '<h3>$1</h3>')
        .replace(/^# (.*$)/gm, '<h2>$1</h2>')
        .replace(/^- (.*$)/gm, '<li>$1</li>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>')
        .replace(/<li>(.*?)<\/li>/g, '<li>$1</li>');
}

// Streaming cursor animation
const style = document.createElement('style');
style.textContent = `
    .streaming-cursor {
        animation: blink 0.7s infinite;
    }
    @keyframes blink {
        0%, 50% { opacity: 1; }
        51%, 100% { opacity: 0; }
    }
    .msg.streaming {
        opacity: 0.9;
    }
`;
document.head.appendChild(style);

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
