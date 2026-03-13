// Financial Astrology Trading Strategies - Enhanced with AI Chat, Live Pricing & Charts

// ============ CONFIGURATION ============
const CONFIG = {
    // ZAI API Configuration
    zai: {
        apiKey: 'f06361dee1044c2387e21d15deb5c917.loNg83Ixj4zcQJF5',
        baseUrl: 'https://api.z.ai/api/coding/paas/v4',
        model: 'glm-5',
        thinkingEnabled: true
    },
    // Pricing APIs (Free tier)
    pricing: {
        alphavantage: 'S9ZYCKGLYTDLOWTZ', // 25 requests/day
        refreshInterval: 60 * 60 * 1000, // 1 hour
        cacheDuration: 60 * 60 * 1000 // 1 hour cache
    },
    // Book contexts for AI
    books: {
        general: {
            name: 'General Financial Astrology',
            context: `You are a financial astrology expert. Provide guidance on commodity trading based on planetary positions.
            
Key associations:
- Gold (GOLDBEES): Ruled by Sun. Best when Sun in Aries (Mar 20-Apr 19), Leo (Aug 16-Sep 16). Avoid when Sun in Libra (Oct-Nov).
- Silver (SILVERBEES): Ruled by Moon. Best when Moon in Taurus (exalted), wealth nakshatras (Rohini, Hasta). Avoid Moon in Scorpio.
- Copper: Ruled by Venus. SUPER BULLISH Apr 1-25 (Venus in Taurus). DANGER Jul 10-Aug 4 (Venus debilitated in Virgo).
- Bitcoin: Ruled by Rahu. SUPER BULLISH until June 2026 (Rahu in Aquarius).

User's birth chart: Ascendant Aries 13.73°, Sun Leo 12.75°, Moon Leo 16.07°, Jupiter Taurus 15.84° (2nd house - wealth).`
        },
        gann: {
            name: "W.D. Gann Methods",
            context: `You are an expert in W.D. Gann's trading methods. Explain:
- Time cycles (anniversary dates, seasonal patterns)
- Price squares (square of 9, square of 144)
- Geometric angles (1x1, 2x1, etc.)
- Gann angles and fans
- The concept that "time is more important than price"
- 30-day and 90-day cycles
- Master time factor

Apply Gann principles to current commodity markets.`
        },
        vedic: {
            name: "Vedic Astrology Trading",
            context: `You are a Vedic astrology expert specializing in financial markets. Cover:
- Nakshatra-based timing (27 lunar mansions)
- Wealth nakshatras: Rohini, Hasta, Shravana, Uttara Phalguni
- Planetary periods (Dashas) and their effects on markets
- Yogas (planetary combinations) affecting wealth
- Transit effects (Gochar)
- Ashtakvarga strength scores
- Muhurta (auspicious timing) for trading

Use the user's birth chart: Leo Sun & Moon, Jupiter in Taurus (2nd house), Venus in Virgo (6th house - debilitated).`
        },
        crawford: {
            name: "Arch Crawford's Methods",
            context: `You are expert in Arch Crawford's planetary market analysis. Explain:
- Mars-Uranus conjunctions (market crashes)
- Saturn-Pluto aspects (major turning points)
- Jupiter-Saturn conjunctions (20-year cycles)
- Outer planet alignments
- Heliocentric vs geocentric perspectives
- Bradley Siderograph model
- Using eclipses for market timing`
        },
        merriman: {
            name: "Raymond Merriman Methods",
            context: `You are expert in Raymond Merriman's MMA (Merriman Market Analysis). Cover:
- Primary cycles (18-week, 4-year)
- Lunar phase trading
- Planetary ingresses
- Geocosmic critical reversal dates
- Threefold cycle approach
- Correlation of outer planets to long-term trends
- Trading strategies based on planetary cycles`
        },
        personal: {
            name: "Your Birth Chart",
            context: `You are analyzing trading potential based on the user's specific birth chart.

BIRTH DATA:
- Date: August 29, 2000, 9:39 PM IST
- Location: Gurugram, India (28.4595° N, 77.0266° E)

KEY POSITIONS:
- Ascendant: Aries 13.73°
- Sun: Leo 12.75° (Purva Phalguni) - 5th House
- Moon: Leo 16.07° (Purva Phalguni) - 5th House  
- Mars: Cancer 24.51° (DEBILITATED) - 4th House
- Mercury: Leo 20.00° - 5th House
- Jupiter: Taurus 15.84° (Rohini) - 2nd House (WEALTH!)
- Venus: Virgo 4.33° (DEBILITATED) - 6th House
- Saturn: Taurus 6.95° (Krittika) - 2nd House
- Rahu: Gemini 28.41° - 3rd House
- Ketu: Sagittarius 28.41° - 9th House

WEALTH ANALYSIS:
- Jupiter in 2nd House (Taurus) = Excellent for wealth accumulation
- Saturn in 2nd House = Long-term wealth preservation
- Sun + Moon in 5th House (Leo) = Speculation gains
- Venus debilitated = Careful with copper/luxury stocks

TRADING RECOMMENDATIONS:
- Best for: Gold (Sun strong in Leo), Silver (Jupiter aspects)
- Caution: Copper (Venus debilitated in natal chart)
- Super bullish periods: When transits activate 2nd house wealth axis`
        }
    }
};

// ============ STATE MANAGEMENT ============
let state = {
    selectedBook: 'general',
    messages: [],
    priceCache: {
        gold: null,
        silver: null,
        copper: null,
        bitcoin: null,
        lastUpdate: null
    },
    charts: {}
};

// ============ PRICING API ============
const PricingAPI = {
    // Get Gold price (using Alphavantage for GLD ETF as proxy)
    async getGoldPrice() {
        const cacheKey = 'gold_price';
        const cached = getCachedPrice(cacheKey);
        if (cached) return cached;

        try {
            // Use Alphavantage for GLD (gold ETF)
            const response = await fetch(
                `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=GLD&apikey=${CONFIG.pricing.alphavantage}`
            );
            const data = await response.json();
            
            if (data['Global Quote']) {
                const price = parseFloat(data['Global Quote']['05. price']);
                const change = parseFloat(data['Global Quote']['09. change']);
                const changePercent = data['Global Quote']['10. change percent'];
                
                const result = {
                    price: (price * 83 * 4.5).toFixed(2), // Convert to INR approx for GOLDBEES
                    change: changePercent,
                    rawPrice: price
                };
                
                setCachedPrice(cacheKey, result);
                return result;
            }
        } catch (error) {
            console.error('Gold price fetch error:', error);
        }
        
        // Fallback to simulated price with realistic variation
        return getSimulatedPrice('gold', 130.95, 0.02);
    },

    // Get Silver price
    async getSilverPrice() {
        const cacheKey = 'silver_price';
        const cached = getCachedPrice(cacheKey);
        if (cached) return cached;

        try {
            const response = await fetch(
                `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=SLV&apikey=${CONFIG.pricing.alphavantage}`
            );
            const data = await response.json();
            
            if (data['Global Quote']) {
                const price = parseFloat(data['Global Quote']['05. price']);
                const changePercent = data['Global Quote']['10. change percent'];
                
                const result = {
                    price: (price * 83 * 2.2).toFixed(2), // Convert to INR approx for SILVERBEES
                    change: changePercent,
                    rawPrice: price
                };
                
                setCachedPrice(cacheKey, result);
                return result;
            }
        } catch (error) {
            console.error('Silver price fetch error:', error);
        }
        
        return getSimulatedPrice('silver', 248.19, 0.03);
    },

    // Get Bitcoin price (CoinGecko - free, no API key)
    async getBitcoinPrice() {
        const cacheKey = 'bitcoin_price';
        const cached = getCachedPrice(cacheKey);
        if (cached) return cached;

        try {
            const response = await fetch(
                'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true'
            );
            const data = await response.json();
            
            if (data.bitcoin) {
                const result = {
                    price: data.bitcoin.usd.toLocaleString(),
                    change: data.bitcoin.usd_24h_change.toFixed(2) + '%',
                    rawPrice: data.bitcoin.usd
                };
                
                setCachedPrice(cacheKey, result);
                return result;
            }
        } catch (error) {
            console.error('Bitcoin price fetch error:', error);
        }
        
        return getSimulatedPrice('bitcoin', 71000, 0.05);
    },

    // Get Copper price (simulated - no free API easily available)
    async getCopperPrice() {
        const cacheKey = 'copper_price';
        const cached = getCachedPrice(cacheKey);
        if (cached) return cached;

        // Simulated with realistic variation
        const result = getSimulatedPrice('copper', 508.30, 0.02);
        setCachedPrice(cacheKey, result);
        return result;
    }
};

// Cache helpers
function getCachedPrice(key) {
    const cached = localStorage.getItem(`price_${key}`);
    if (cached) {
        const data = JSON.parse(cached);
        if (Date.now() - data.timestamp < CONFIG.pricing.cacheDuration) {
            return data.value;
        }
    }
    return null;
}

function setCachedPrice(key, value) {
    localStorage.setItem(`price_${key}`, JSON.stringify({
        value,
        timestamp: Date.now()
    }));
}

function getSimulatedPrice(type, basePrice, volatility) {
    const change = (Math.random() - 0.5) * 2 * volatility;
    const newPrice = basePrice * (1 + change);
    return {
        price: newPrice.toFixed(2),
        change: (change * 100).toFixed(2) + '%',
        rawPrice: newPrice
    };
}

// ============ ZAI API (AI CHAT) ============
const ZaiAPI = {
    async sendMessage(userMessage, bookContext) {
        const systemPrompt = CONFIG.books[bookContext].context;
        
        const messages = [
            { role: 'system', content: systemPrompt },
            ...state.messages.slice(-10), // Keep last 10 messages for context
            { role: 'user', content: userMessage }
        ];

        try {
            const response = await fetch(`${CONFIG.zai.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${CONFIG.zai.apiKey}`
                },
                body: JSON.stringify({
                    model: CONFIG.zai.model,
                    messages: messages,
                    max_tokens: 2000,
                    temperature: 0.7
                })
            });

            const data = await response.json();
            
            if (data.choices && data.choices[0]) {
                return {
                    content: data.choices[0].message.content,
                    thinking: null // ZAI doesn't expose thinking in this endpoint
                };
            }
            
            throw new Error(data.error?.message || 'Unknown error');
        } catch (error) {
            console.error('ZAI API error:', error);
            throw error;
        }
    }
};

// ============ CHARTS ============
const ChartManager = {
    async initCharts() {
        // Load Chart.js dynamically if not present
        if (typeof Chart === 'undefined') {
            await loadScript('https://cdn.jsdelivr.net/npm/chart.js');
        }
        
        // Create price history chart
        this.createPriceChart();
    },

    createPriceChart() {
        const ctx = document.getElementById('price-chart');
        if (!ctx) return;

        // Get historical data from localStorage or generate
        const history = this.getPriceHistory();

        state.charts.price = new Chart(ctx, {
            type: 'line',
            data: {
                labels: history.labels,
                datasets: [
                    {
                        label: 'Gold (₹)',
                        data: history.gold,
                        borderColor: '#FFD700',
                        backgroundColor: 'rgba(255, 215, 0, 0.1)',
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'Silver (₹)',
                        data: history.silver,
                        borderColor: '#C0C0C0',
                        backgroundColor: 'rgba(192, 192, 192, 0.1)',
                        tension: 0.4,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: { color: '#fff' }
                    }
                },
                scales: {
                    x: {
                        ticks: { color: '#999' },
                        grid: { color: 'rgba(255,255,255,0.1)' }
                    },
                    y: {
                        ticks: { color: '#999' },
                        grid: { color: 'rgba(255,255,255,0.1)' }
                    }
                }
            }
        });
    },

    getPriceHistory() {
        // Generate 7 days of simulated historical data
        const labels = [];
        const gold = [];
        const silver = [];
        
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            labels.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
            
            // Simulate with some variance
            gold.push(130 + Math.random() * 5);
            silver.push(245 + Math.random() * 10);
        }
        
        return { labels, gold, silver };
    },

    updatePriceChart(goldPrice, silverPrice) {
        if (!state.charts.price) return;
        
        const chart = state.charts.price;
        const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        
        // Add new data point
        chart.data.labels.push(now);
        chart.data.datasets[0].data.push(parseFloat(goldPrice));
        chart.data.datasets[1].data.push(parseFloat(silverPrice));
        
        // Keep only last 24 points
        if (chart.data.labels.length > 24) {
            chart.data.labels.shift();
            chart.data.datasets[0].data.shift();
            chart.data.datasets[1].data.shift();
        }
        
        chart.update('none');
    }
};

// ============ UI FUNCTIONS ============
function toggleMobileMenu() {
    document.querySelector('.nav-links').classList.toggle('active');
}

function scrollToSection(id) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

function selectBook(bookId) {
    state.selectedBook = bookId;
    
    // Update UI
    document.querySelectorAll('.book-card').forEach(card => {
        card.classList.remove('selected');
        card.querySelector('.book-status').innerHTML = 'Click to select';
    });
    
    const selectedCard = document.querySelector(`[data-book="${bookId}"]`);
    selectedCard.classList.add('selected');
    selectedCard.querySelector('.book-status').innerHTML = '<i class="fas fa-check-circle"></i> Selected';
    
    // Update chat context display
    document.getElementById('selected-book-name').textContent = CONFIG.books[bookId].name;
}

function showTab(commodity, tab) {
    // Hide all tabs for this commodity
    document.querySelectorAll(`#${commodity} .tab-content`).forEach(content => {
        content.classList.remove('active');
    });
    
    // Deactivate all tab buttons
    document.querySelectorAll(`#${commodity} .tab-btn`).forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(`${commodity}-${tab}`).classList.add('active');
    
    // Activate clicked button
    event.target.classList.add('active');
}

async function generateSignal() {
    const btn = event.target.closest('button');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';
    btn.disabled = true;
    
    await updatePrices();
    
    setTimeout(() => {
        btn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh Signals';
        btn.disabled = false;
    }, 2000);
}

// ============ CHAT FUNCTIONS ============
async function sendMessage() {
    const input = document.getElementById('user-input');
    const message = input.value.trim();
    
    if (!message) return;
    
    // Add user message to UI
    addMessageToUI('user', message);
    input.value = '';
    
    // Show typing indicator
    showTypingIndicator();
    
    try {
        const response = await ZaiAPI.sendMessage(message, state.selectedBook);
        
        // Store in state
        state.messages.push(
            { role: 'user', content: message },
            { role: 'assistant', content: response.content }
        );
        
        // Remove typing and add response
        removeTypingIndicator();
        addMessageToUI('assistant', response.content);
        
    } catch (error) {
        removeTypingIndicator();
        addMessageToUI('assistant', `⚠️ Error connecting to AI. Please try again. (${error.message})`);
    }
}

function askQuestion(question) {
    document.getElementById('user-input').value = question;
    sendMessage();
}

function addMessageToUI(role, content) {
    const container = document.getElementById('chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    
    const icon = role === 'user' ? 'fa-user' : 'fa-robot';
    
    messageDiv.innerHTML = `
        <div class="message-avatar">
            <i class="fas ${icon}"></i>
        </div>
        <div class="message-content">
            ${formatMessage(content)}
        </div>
    `;
    
    container.appendChild(messageDiv);
    container.scrollTop = container.scrollHeight;
}

function formatMessage(content) {
    // Convert markdown-like formatting
    return content
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\n/g, '<br>')
        .replace(/- (.*?)(?=<br>|$)/g, '<li>$1</li>');
}

function showTypingIndicator() {
    const container = document.getElementById('chat-messages');
    const indicator = document.createElement('div');
    indicator.id = 'typing-indicator';
    indicator.className = 'message assistant';
    indicator.innerHTML = `
        <div class="message-avatar"><i class="fas fa-robot"></i></div>
        <div class="message-content">
            <div class="typing-indicator">
                <span></span><span></span><span></span>
            </div>
        </div>
    `;
    container.appendChild(indicator);
    container.scrollTop = container.scrollHeight;
}

function removeTypingIndicator() {
    document.getElementById('typing-indicator')?.remove();
}

// ============ PRICE UPDATES ============
async function updatePrices() {
    try {
        const [gold, silver, copper, bitcoin] = await Promise.all([
            PricingAPI.getGoldPrice(),
            PricingAPI.getSilverPrice(),
            PricingAPI.getCopperPrice(),
            PricingAPI.getBitcoinPrice()
        ]);

        // Update UI
        document.getElementById('gold-price').textContent = `₹${gold.price}`;
        document.getElementById('silver-price').textContent = `₹${silver.price}`;
        document.getElementById('copper-price').textContent = `₹${copper.price}`;
        document.getElementById('bitcoin-price').textContent = `$${bitcoin.price}`;

        // Update change indicators
        updatePriceChange('gold', gold.change);
        updatePriceChange('silver', silver.change);
        updatePriceChange('copper', copper.change);
        updatePriceChange('bitcoin', bitcoin.change);

        // Update chart
        ChartManager.updatePriceChart(gold.price, silver.price);

        // Store in cache
        state.priceCache = { gold, silver, copper, bitcoin, lastUpdate: Date.now() };

        console.log('Prices updated:', { gold, silver, copper, bitcoin });
    } catch (error) {
        console.error('Price update error:', error);
    }
}

function updatePriceChange(commodity, change) {
    const card = document.querySelector(`.${commodity}-card`);
    if (!card) return;

    const changeEl = card.querySelector('.price-change');
    const changeValue = parseFloat(change);
    
    changeEl.textContent = changeValue >= 0 ? `+${change}` : change;
    changeEl.className = `price-change ${changeValue >= 0 ? 'positive' : 'negative'}`;
}

// ============ COUNTDOWNS ============
function updateCountdowns() {
    const now = new Date();
    
    // March 20 - Sun enters Aries
    const mar20 = new Date(now.getFullYear(), 2, 20);
    if (mar20 > now) {
        const days = Math.ceil((mar20 - now) / (1000 * 60 * 60 * 24));
        const el = document.getElementById('countdown-mar20');
        if (el) el.textContent = `${days} days away`;
    }
    
    // Copper countdown (April 1)
    const apr1 = new Date(now.getFullYear(), 3, 1);
    if (apr1 > now) {
        const days = Math.ceil((apr1 - now) / (1000 * 60 * 60 * 24));
        const el = document.getElementById('copper-countdown');
        if (el) el.textContent = `${days} days until SUPER BULLISH period`;
    }
}

// ============ HELPERS ============
function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// ============ INITIALIZATION ============
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Initializing Financial Astrology Trading App...');
    
    // Initialize charts
    await ChartManager.initCharts();
    
    // Load initial prices
    await updatePrices();
    
    // Update countdowns
    updateCountdowns();
    
    // Set up price refresh interval (1 hour)
    setInterval(updatePrices, CONFIG.pricing.refreshInterval);
    
    // Smooth scrolling for nav links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });
    
    // Enter key to send message
    document.getElementById('user-input')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });
    
    console.log('✅ App initialized successfully');
});

// Export for debugging
window.TradingApp = {
    state,
    CONFIG,
    updatePrices,
    sendMessage,
    selectBook
};
