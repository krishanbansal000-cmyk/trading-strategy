# Financial Astrology Trading Strategies

A static trading dashboard with browser-side `glm-4.7` chat, local commodity context, and built-in charting.

## Covered Assets

| Asset | Instrument | Planetary Ruler |
|-------|------------|-----------------|
| Gold | Tata Gold ETF | Sun |
| Silver | Groww Silver ETF | Moon |
| Copper | Hindustan Copper | Venus |
| Bitcoin | BTC | Rahu |

## How It Works

The chat no longer requires an app backend. The browser sends requests directly to the ZAI API and includes a local context pack built from:

- the four commodity analysis files in the repo
- the `book_text/*.txt` corpus
- the built-in timing-window strategy rules
- any optional `strategy.md`, `strategy.txt`, `trading-strategy.md`, or `trading-strategy.txt`
- the current 7-day chart data loaded in the dashboard

## Running Locally

Any static host is enough.

```bash
python3 -m http.server 3000
```

Then open `http://127.0.0.1:3000`.

Paste your `ZAI_API_KEY` into the chat panel. The key is stored only in that browser's local storage. It is not written into the repo.

## Deployment

This version can be hosted on GitHub Pages, Netlify, or any static host because it does not require a Node backend for chat.

Important tradeoff:

- the API key is user-supplied in the browser
- that means the key is not public in the repo, but it is available to the browser session that uses it

If you want the key to remain fully server-side and hidden from users, a backend is still required.

## Testing

Run the local smoke test:

```bash
npm run test:e2e
```

The Playwright test runs the app on a local static server and mocks the ZAI API so the UI flow can be verified without a real key.

## Disclaimer

Educational only. Not financial advice.
