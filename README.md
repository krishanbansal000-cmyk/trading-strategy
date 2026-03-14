# Financial Astrology Trading Strategies

A trading dashboard with Netlify Function based `glm-4.7` chat, local commodity context, and built-in charting.

## Covered Assets

| Asset | Instrument | Planetary Ruler |
|-------|------------|-----------------|
| Gold | Tata Gold ETF | Sun |
| Silver | Groww Silver ETF | Moon |
| Copper | Hindustan Copper | Venus |
| Bitcoin | BTC | Rahu |

## How It Works

The chat runs through `/.netlify/functions/agent`. The ZAI key stays server-side in Netlify environment variables, and the function builds a context pack from:

- the four commodity analysis files in the repo
- the `book_text/*.txt` corpus
- the built-in timing-window strategy rules and the personal chart/profile context
- any optional `strategy.md`, `strategy.txt`, `trading-strategy.md`, or `trading-strategy.txt`
- the current chart state sent from the frontend
- a lightweight server-side astrology backtest when the user asks for historical validation

## Netlify Setup

Create these environment variables in Netlify:

- `ZAI_API_KEY`
- optional: `ZAI_PRIMARY_MODEL` (default `glm-4.7`)
- optional: `ZAI_FALLBACK_MODEL` (default `GLM-4.7-Flash`)

The function config is in [netlify.toml](/home/angle/projects/astrology/astrology/netlify.toml). It includes the books, analysis files, and optional strategy files in the function bundle.

## Running Locally

For a quick frontend preview:

```bash
python3 -m http.server 3000
```

Then open `http://127.0.0.1:3000`.

## Deployment

This version is intended for `Netlify` because the agent depends on a Netlify Function.

GitHub Pages is no longer enough for the full agent because it cannot run the server-side function that holds the ZAI key and backtest logic.

## Swiss Ephemeris Note

The current Netlify agent uses rule-based astrology timing plus server-side market-data backtests. That is the most reliable free/serverless path.

If you want full Swiss Ephemeris calculations inside the function, prefer a JS/WASM-compatible adapter. Native C bindings are more fragile on serverless platforms and are usually a better fit for Railway or another full backend host.

## Testing

Run the local smoke test:

```bash
npm run test:e2e
```

The Playwright test runs a local server that serves the frontend and the Netlify function endpoint with `MOCK_ZAI=1`, so the full UI-to-function flow is verified without a real key.

## Disclaimer

Educational only. Not financial advice.
