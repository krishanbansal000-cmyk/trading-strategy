// ========== CONFIG ==========
const CONFIG = {
    alphavantage: { key: 'S9ZYCKGLYTDLOWTZ', cacheTime: 3600000 },
    zai: { key: 'f06361dee1044c2387e21d15deb5c917.loNg83Ixj4zcQJF5', url: 'https://api.z.ai/api/coding/paas/v4', model: 'glm-5' }
};

const BOOKS = {
    general: { name: 'Financial Astrology', context: 'Gold=Sun, Silver=Moon, Copper=Venus, Bitcoin=Rahu. Sun in Aries (Mar20-Apr19) bullish for gold. Venus in Taurus (Apr1-25) SUPER BULLISH copper. Venus in Virgo (Jul10-Aug4) DANGER copper - EXIT before July 10.' },
    gann: { name: 'W.D. Gann', context: 'Time cycles, price squares, geometric angles. 30-day and 90-day cycles are key. Anniversary dates important. Time is more important than price. Use square of 9 for price targets.' },
    vedic: { name: 'Vedic Astrology', context: 'Wealth nakshatras: Rohini, Hasta, Shravana are best for trading. Planetary dashas affect markets. Jupiter in 2nd house = excellent wealth accumulation. Moon in Taurus exalted = best for silver.' },
    personal: { name: 'Your Chart', context: 'Born Aug 29 2000, 9:39 PM IST, Gurugram. Ascendant Aries 13.73°, Sun Leo 12.75°, Moon Leo 16.07°, Jupiter Taurus 15.84° in 2nd house (WEALTH!), Venus Virgo 4.33° debilitated. Best for gold (Sun strong in Leo), caution with copper (Venus debilitated in your chart).' }
};

let chatHistory = [];
let priceChart = null;

// ========== NAVIGATION ==========
function showSection(sectionId) {
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    
    const section = document.getElementById('section-' + sectionId);
    const navItem = document.querySelector(`.nav-item[data-section="${sectionId}"]`);
    
    if (section) section.classList.add('active');
    if (navItem) navItem.classList.add('active');
    
    // Close mobile sidebar
    document.querySelector('.sidebar')?.classList.remove('open');
}

function toggleSidebar() {
    document.querySelector('.sidebar')?.classList.toggle('open');
}

// Initialize navigation
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => showSection(item.dataset.section));
});

// ========== PRICING ==========
async function fetchPrice(symbol) {
    const cacheKey = `price_${symbol}`;
    const cached = localStorage.getItem(cacheKey);
    
    if (cached) {
        const { data, time } = JSON.parse(cached);
        if (Date.now() - time < CONFIG.alphavantage.cacheTime) return data;
    }
    
    try {
        const res = await fetch(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${CONFIG.alphavantage.key}`);
        const json = await res.json();
        
        if (json['Global Quote']) {
            const price = parseFloat(json['Global Quote']['05. price']);
            const change = parseFloat(json['Global Quote']['09. change']);
            const changePercent = json['Global Quote']['10. change percent'];
            
            const data = { price, change, changePercent };
            localStorage.setItem(cacheKey, JSON.stringify({ data, time: Date.now() }));
            return data;
        }
    } catch (e) { console.error('Price fetch error:', e); }
    
    return null;
}

async function fetchBitcoin() {
    const cacheKey = 'price_btc';
    const cached = localStorage.getItem(cacheKey);
    
    if (cached) {
        const { data, time } = JSON.parse(cached);
        if (Date.now() - time < CONFIG.alphavantage.cacheTime) return data;
    }
    
    try {
        const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true');
        const json = await res.json();
        
        if (json.bitcoin) {
            const data = { price: json.bitcoin.usd, change: json.bitcoin.usd_24hr_change };
            localStorage.setItem(cacheKey, JSON.stringify({ data, time: Date.now() }));
            return data;
        }
    } catch (e) { console.error('BTC fetch error:', e); }
    
    return { price: 71000, change: 2.5 };
}

async function refreshPrices() {
    const btn = document.querySelector('.refresh-btn');
    if (btn) btn.innerHTML = '<span>⏳</span> Loading...';
    
    // Gold (GLD to INR approx: price * 83 / 10 * 15)
    const gold = await fetchPrice('GLD');
    if (gold) {
        const inrPrice = (gold.price * 83 * 1.5).toFixed(2);
        document.getElementById('gold-price').textContent = `₹${inrPrice}`;
        updateChange('gold-change', gold.changePercent);
    }
    
    // Silver (SLV to INR)
    const silver = await fetchPrice('SLV');
    if (silver) {
        const inrPrice = (silver.price * 83 * 2.5).toFixed(2);
        document.getElementById('silver-price').textContent = `₹${inrPrice}`;
        updateChange('silver-change', silver.changePercent);
    }
    
    // Copper (simulated)
    const copperBase = 508;
    const copperVar = (Math.random() - 0.5) * 10;
    const copperPrice = (copperBase + copperVar).toFixed(2);
    const copperChange = ((copperVar / copperBase) * 100).toFixed(2);
    document.getElementById('copper-price').textContent = `₹${copperPrice}`;
    updateChange('copper-change', copperChange + '%');
    
    // Bitcoin
    const btc = await fetchBitcoin();
    if (btc) {
        document.getElementById('bitcoin-price').textContent = `$${btc.price.toLocaleString()}`;
        updateChange('bitcoin-change', btc.change.toFixed(2) + '%');
    }
    
    // Update timestamp
    const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    document.getElementById('sidebar-update').textContent = now;
    
    // Update chart
    if (gold && silver) updateChart(gold.price, silver.price);
    
    if (btn) btn.innerHTML = '<span>🔄</span> Refresh Prices';
}

function updateChange(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = value;
    el.className = 'change ' + (parseFloat(value) >= 0 ? 'up' : 'down');
}

// ========== CHART ==========
function initChart() {
    const ctx = document.getElementById('priceChart');
    if (!ctx) return;
    
    const labels = [];
    const goldData = [];
    const silverData = [];
    
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        labels.push(d.toLocaleDateString('en-US', { weekday: 'short' }));
        goldData.push(130 + Math.random() * 5);
        silverData.push(245 + Math.random() * 10);
    }
    
    priceChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                { label: 'Gold (₹)', data: goldData, borderColor: '#FFD700', backgroundColor: 'rgba(255,215,0,0.1)', tension: 0.3, fill: true },
                { label: 'Silver (₹)', data: silverData, borderColor: '#C0C0C0', backgroundColor: 'rgba(192,192,192,0.1)', tension: 0.3, fill: true }
            ]
        },
        options: {
            responsive: true,
            plugins: { legend: { labels: { color: '#e0e0e0' } } },
            scales: {
                x: { ticks: { color: '#888' }, grid: { color: '#2a2a2a' } },
                y: { ticks: { color: '#888' }, grid: { color: '#2a2a2a' } }
            }
        }
    });
}

function updateChart(goldPrice, silverPrice) {
    if (!priceChart) return;
    const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    priceChart.data.labels.push(now);
    priceChart.data.datasets[0].data.push(goldPrice * 83 * 1.5);
    priceChart.data.datasets[1].data.push(silverPrice * 83 * 2.5);
    if (priceChart.data.labels.length > 24) {
        priceChart.data.labels.shift();
        priceChart.data.datasets[0].data.shift();
        priceChart.data.datasets[1].data.shift();
    }
    priceChart.update('none');
}

// ========== CHAT ==========
async function sendMessage() {
    const input = document.getElementById('user-input');
    const msg = input.value.trim();
    if (!msg) return;
    
    input.value = '';
    addChatMessage('user', msg);
    
    const book = document.getElementById('book-select').value;
    const context = BOOKS[book].context;
    
    chatHistory.push({ role: 'user', content: msg });
    
    try {
        const res = await fetch(`${CONFIG.zai.url}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${CONFIG.zai.key}` },
            body: JSON.stringify({
                model: CONFIG.zai.model,
                messages: [
                    { role: 'system', content: context + '\n\nYou are a helpful trading advisor. Be concise and practical.' },
                    ...chatHistory.slice(-10)
                ],
                max_tokens: 1000
            })
        });
        
        const json = await res.json();
        const reply = json.choices?.[0]?.message?.content || 'Sorry, I could not generate a response.';
        
        chatHistory.push({ role: 'assistant', content: reply });
        addChatMessage('ai', reply);
    } catch (e) {
        addChatMessage('ai', '⚠️ Error connecting to AI. Please try again.');
    }
}

function addChatMessage(role, text) {
    const container = document.getElementById('chat-messages');
    const div = document.createElement('div');
    div.className = `msg ${role === 'user' ? 'user' : 'ai'}`;
    div.innerHTML = `<span class="avatar">${role === 'user' ? '👤' : '🤖'}</span><p>${text}</p>`;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
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
    initChart();
    refreshPrices();
    updateCountdowns();
    setInterval(refreshPrices, CONFIG.alphavantage.cacheTime);
});
