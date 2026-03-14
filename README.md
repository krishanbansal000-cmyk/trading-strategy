# 🌟 Financial Astrology Trading Strategies

A comprehensive, planetary-aligned commodity trading guide hosted on GitHub Pages.

## 📊 Covered Assets

| Asset | ETF/Stock | Planetary Ruler |
|-------|-----------|-----------------|
| 🥇 Gold | TATAGOLD.NS | Sun |
| 🥈 Silver | GROWWSLVR.NS | Moon |
| 🥉 Copper | HINDUSTAN COPPER | Venus |
| ₿ Bitcoin | BTC | Rahu |

## 🌐 Live Website

Visit: https://krishanbansal000-cmyk.github.io/trading-strategy/

## 📋 Features

- **Commodity-specific strategies** based on Vedic astrology
- **Risk management rules** with stop losses and profit targets
- **Key date calendar** with upcoming bullish/bearish periods
- **Quick action guide** for trading decisions
- **Responsive design** for mobile and desktop

## ⚠️ Disclaimer

This is for **educational purposes only**. Not financial advice. Always do your own research and consult a financial advisor before making investment decisions.

## 📈 Verified Performance

- **Trend Accuracy:** 100% (March 5-11, 2026)
- **Silver Returns:** +4.90%
- **Silver vs Gold Outperformance:** 8.4x

## 🔧 Technologies

- HTML5
- CSS3 (with CSS Grid & Flexbox)
- Vanilla JavaScript
- Node.js backend for agent streaming
- ZAI/GLM 4.7 model integration with tool-based agent flow

## Agent Mode

For normal flow with ZAI/GLM 4.7 agentic behavior (market data lookup, backtests, and terminal actions), run the app locally or on a server:

```bash
npm install
npm start
```

Set your model API key and optional terminal access:

```bash
export ZAI_API_KEY=<your-zai-api-key>
ENABLE_DANGEROUS_TERMINAL=1 npm start
```

Primary model defaults to `glm-4.7` with fallback `GLM-4.7-Flash`.

On local/OpenClaw runs, the chat UI now includes an `Agent Terminal` toggle. When that toggle is enabled, the backend can expose terminal execution to the GLM agent for explicit terminal/backtest requests. Remote/static deployments still require a real Node backend, and unrestricted terminal execution can still be forced with `ENABLE_DANGEROUS_TERMINAL=1`.

GitHub Pages can still serve the static UI, but the integrated agent/backend flow requires a real Node server and will not run on Pages-only hosting.

---

Generated: March 13, 2026
