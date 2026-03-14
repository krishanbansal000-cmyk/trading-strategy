# Financial Astrology Trading Strategies

A frontend-only trading dashboard with a browser-side LangChain `glm-4.7` chat flow, local commodity context, and built-in Chart.js visualizations.

## Covered Assets

| Asset | Instrument | Planetary Ruler |
|-------|------------|-----------------|
| Gold | Tata Gold ETF | Sun |
| Silver | Groww Silver ETF | Moon |
| Copper | Hindustan Copper | Venus |
| Bitcoin | BTC | Rahu |

## How It Works

The chat runs fully in the browser. The user supplies their own `ZAI` API key, and the frontend LangChain flow builds a context pack from:

- the four commodity analysis files in the repo
- the `book_text/*.txt` corpus
- the built-in timing-window strategy rules and the personal chart/profile context
- any optional `strategy.md`, `strategy.txt`, `trading-strategy.md`, or `trading-strategy.txt`
- the current chart state and recent price history in the browser
- a lightweight local backtest when the user asks for historical validation

The browser runtime uses:

- `@langchain/openai` bundled locally for browser use
- `glm-4.7` as the primary model
- `GLM-4.7-Flash` as the fallback model
- `Chart.js` for all inline and dashboard charts

## Running Locally

For a quick frontend preview:

```bash
python3 -m http.server 3000
```

Then open `http://127.0.0.1:3000`.

## Deployment

This version can be deployed to static hosting such as GitHub Pages or Netlify because the active chat path no longer depends on a backend runtime.

Important: because the agent runs in the browser, the ZAI key is not hidden from the current browser session. This setup is appropriate only when the user provides their own key.

## Testing

Run the local smoke test:

```bash
npm run test:e2e
```

The Playwright test runs a local static server, mocks the ZAI chat completion API, saves a browser-side key, sends a chat prompt, and verifies the inline Chart.js render without requiring a real key.

## Disclaimer

Educational only. Not financial advice.
