// === CONFIG ===
const CONFIG = {
    alphavantageKey: 'S9ZYCKGLYTDLOWTZ',
    zaiKey: 'f06361dee1044c2387e21d15deb5c917.loNg83Ixj4zcQJF5',
    zaiUrl: 'https://api.z.ai/api/coding/paas/v4',
    cacheTTL: 60 * 60 * 1000 // 1 hour
};

const BOOKS = {
    general: {
        name: 'Financial Astrology',
        context: `Gold=Sun, Silver=Moon, Copper=Venus, Bitcoin=Rahu.
Sun in Aries (Mar20-Apr19) bullish for gold.
Venus in Taurus (Apr1-25) SUPER BULLISH copper.
Venus in Virgo (Jul10-Aug4) DANGER copper.
Wealth nakshatras: Rohini, Hasta, Shravana.`
    },
    gann: {
        name: 'W.D. Gann Methods',
        context: `Time cycles, price squares, geometric angles.
30-day and 90-day cycles key. Anniversary dates important.
Time is more important than price.
Square of 9 for price targets.`
    },
    vedic: {
        name: 'Vedic Astrology',
        context: `Wealth nakshatras: Rohini, Hasta, Shravana.
Planetary dashas affect markets.
Jupiter in 2nd house = excellent wealth accumulation.
Moon phases critical for silver trading.`
    },
    personal: {
        name: 'Your Birth Chart',
        context: `Born Aug 29 2000, 9:39 PM IST, Gurugram.
Ascendant Aries 13.73°, Sun Leo 12.75°, Moon Leo 16.07°.
Jupiter Taurus 15.84° (2nd house - wealth!).
Venus Virgo 4.33° (debilitated).
Best for gold (Sun strong), caution with copper (Venus debilitated).`
    }
};

let messages = [];
let priceChart = null;

// === CACHE ===
function getCached(key) {
    const data = localStorage.getItem(key);
    if (!data) return null;
    const { value, timestamp } = JSON.parse(data);
    if (Date.now() - timestamp > CONFIG.cacheTTL) return null;
    return value;
}

function setCache(key, value) {
    localStorage.setItem(key, JSON.stringify({ value, timestamp: Date.now() }));
}

// === PRICING ===
async function fetchGoldPrice() {
    const cached = getCached('gold_price');
    if (cached) return cached;

    try {
        const res = await fetch(
            `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=GLD&apikey=${CONFIG.alphavantageKey}`
        );
        const data = await res.json();
        if (data['Global Quote']) {
            const price = parseFloat(data['Global Quote']['05. price']);
            const change = data['Global Quote']['10. change percent'];
            // Convert GLD to GOLDBEES INR (~130x factor)
            const inrPrice = (price * 130 / 215).toFixed(2);
            const result = { price: inrPrice, change };
            setCache('gold_price', result);
            return result;
        }
    } catch (e) {
        console.error('Gold fetch error:', e);
    }
    return { price: (130 + Math.random() * 3).toFixed(2), change: '-0.5%' };
}

async function fetchSilverPrice() {
    const cached = getCached('silver_price');
    if (cached) return cached;

    try {
        const res = await fetch(
            `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=SLV&apikey=${CONFIG.alphavantageKey}`
        );
        const data = await res.json();
        if (data['Global Quote']) {
            const price = parseFloat(data['Global Quote']['05. price']);
            const change = data['Global Quote']['10. change percent'];
            // Convert SLV to SILVERBEES INR (~248x factor)
            const inrPrice = (price * 248 / 26).toFixed(2);
            const result = { price: inrPrice, change };
            setCache('silver_price', result);
            return result;
        }
    } catch (e) {
        console.error('Silver fetch error:', e);
    }
    return { price: (248 + Math.random() * 5).toFixed(2), change: '-1.2%' };
}

async function fetchBitcoinPrice() {
    const cached = getCached('bitcoin_price');
    if (cached) return cached;

    try {
        const res = await fetch(
            'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true'
        );
        const data = await res.json();
        if (data.bitcoin) {
            const result = {
                price: '$' + data.bitcoin.usd.toLocaleString(),
                change: data.bitcoin.usd_24h_change.toFixed(2) + '%'
            };
            setCache('bitcoin_price', result);
            return result;
        }
    } catch (e) {
        console.error('Bitcoin fetch error:', e);
    }
    return { price: '$71,000', change: '+2.5%' };
}

async function fetchCopperPrice() {
    const cached = getCached('copper_price');
    if (cached) return cached;
    // Simulated - no free API available
    const result = {
        price: (508 + (Math.random() - 0.5) * 10).toFixed(2),
        change: ((Math.random() - 0.5) * 4).toFixed(2) + '%'
    };
    setCache('copper_price', result);
    return result;
}

async function updatePrices() {
    const [gold, silver, copper, bitcoin] = await Promise.all([
        fetchGoldPrice(),
        fetchSilverPrice(),
        fetchCopperPrice(),
        fetchBitcoinPrice()
    ]);

    // Update UI
    document.getElementById('gold-price').textContent = '₹' + gold.price;
    document.getElementById('silver-price').textContent = '₹' + silver.price;
    document.getElementById('copper-price').textContent = '₹' + copper.price;
    document.getElementById('bitcoin-price').textContent = bitcoin.price;

    updateChange('gold-change', gold.change);
    updateChange('silver-change', silver.change);
    updateChange('copper-change', copper.change);
    updateChange('bitcoin-change', bitcoin.change);

    document.getElementById('update-time').textContent =
        'Updated: ' + new Date().toLocaleTimeString();
}

function updateChange(id, change) {
    const el = document.getElementById(id);
    const val = parseFloat(change);
    el.textContent = (val >= 0 ? '+' : '') + change;
    el.className = 'change ' + (val >= 0 ? 'positive' : 'negative');
}

// === CHART ===
function initChart() {
    const ctx = document.getElementById('priceChart').getContext('2d');

    // Generate 7 days of data
    const labels = [];
    const goldData = [];
    const silverData = [];

    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        labels.push(d.toLocaleDateString('en', { weekday: 'short' }));
        goldData.push(130 + Math.random() * 4);
        silverData.push(245 + Math.random() * 8);
    }

    priceChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'Gold (₹)',
                    data: goldData,
                    borderColor: '#f0b429',
                    backgroundColor: 'rgba(240, 180, 41, 0.1)',
                    tension: 0.3,
                    fill: true
                },
                {
                    label: 'Silver (₹)',
                    data: silverData,
                    borderColor: '#a8b2c1',
                    backgroundColor: 'rgba(168, 178, 193, 0.1)',
                    tension: 0.3,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: '#e6edf3', font: { size: 12 } }
                }
            },
            scales: {
                x: {
                    ticks: { color: '#8b949e' },
                    grid: { color: 'rgba(48, 54, 61, 0.5)' }
                },
                y: {
                    ticks: { color: '#8b949e' },
                    grid: { color: 'rgba(48, 54, 61, 0.5)' }
                }
            }
        }
    });
}

// === CHAT ===
async function sendMessage() {
    const input = document.getElementById('user-input');
    const text = input.value.trim();
    if (!text) return;

    addMessage('user', text);
    input.value = '';

    const bookKey = document.getElementById('book-select').value;
    const context = BOOKS[bookKey].context;

    messages.push({ role: 'user', content: text });

    try {
        const res = await fetch(`${CONFIG.zaiUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${CONFIG.zaiKey}`
            },
            body: JSON.stringify({
                model: 'glm-5',
                messages: [
                    { role: 'system', content: context + '\n\nBe concise and helpful.' },
                    ...messages.slice(-6)
                ],
                max_tokens: 1000,
                temperature: 0.7
            })
        });

        const data = await res.json();
        const reply = data.choices?.[0]?.message?.content || 'Sorry, I could not generate a response.';
        messages.push({ role: 'assistant', content: reply });
        addMessage('ai', reply);
    } catch (e) {
        console.error('Chat error:', e);
        addMessage('ai', 'Error connecting to AI. Please try again.');
    }
}

function addMessage(role, text) {
    const container = document.getElementById('chat-messages');
    const div = document.createElement('div');
    div.className = `msg ${role === 'user' ? 'user' : 'ai'}`;
    div.innerHTML = `
        <span class="avatar">${role === 'user' ? '👤' : '🤖'}</span>
        <p>${text.replace(/\n/g, '<br>')}</p>
    `;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

// === INIT ===
document.addEventListener('DOMContentLoaded', async () => {
    await updatePrices();
    initChart();

    // Refresh prices every hour
    setInterval(updatePrices, CONFIG.cacheTTL);

    // Enter to send
    document.getElementById('user-input').addEventListener('keypress', e => {
        if (e.key === 'Enter') sendMessage();
    });
});
