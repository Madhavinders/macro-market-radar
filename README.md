# 📡 Macro Market Radar

> Real-time macro intelligence dashboard tracking global equities, commodities, rates, FX, and crypto with a live, signal-scored Reuters news feed.

![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=flat-square&logo=vite)
![TailwindCSS](https://img.shields.io/badge/Tailwind-3-06B6D4?style=flat-square&logo=tailwindcss)
![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)

---

## Overview

**Macro Market Radar** is a professional-grade, browser-native financial dashboard built to give investors and analysts a single-screen view of global market conditions in real time.

It tracks 15 key macro assets across every major asset class, aggregates live prices from multiple data sources with automatic failover, and surfaces investment-relevant news ranked by signal strength, not just recency.

Built as a personal project to demonstrate full-stack product thinking, data engineering, and frontend execution in a finance context.

---

## Features

- **15 Live Asset Feeds** — equities, commodities, fixed income, FX, volatility, and crypto updated in real time
- **Multi-Source Data Pipeline** — cascading failover across RapidAPI (Yahoo Finance), Alpha Vantage, and Coinbase with automatic conflict resolution
- **Signal-Scored News Feed** — Reuters and financial news ranked by investment relevance using a keyword scoring model (Fed decisions, CPI prints, OPEC moves, earnings surprises score highest)
- **Asset Inspector** — click any card for a detailed breakdown of the selected instrument
- **Category Filtering** — filter by Equities, Commodities, Rates, Currencies, or view all
- **Live Ticker Ribbon** — scrolling price ribbon across the top of the dashboard
- **Market Statistics Panel** — aggregate market breadth, average change, advancing vs declining assets
- **15-Second Refresh Throttle** — prevents API rate limit abuse while keeping data fresh
- **Fully Browser-Native** — no backend server required; all data fetched client-side

---

## Asset Coverage

| Class | Assets |
|---|---|
| **Equities** | SPY (S&P 500), QQQ (Nasdaq), DIA (Dow Jones), EEM (Emerging Markets) |
| **Fixed Income** | TLT (20Y Treasury), ^TNX (10Y Yield), ^IRX (3M Yield) |
| **Commodities** | GC=F (Gold), SI=F (Silver), CL=F (WTI Crude), BZ=F (Brent Crude), HG=F (Copper) |
| **Currencies** | DX-Y.NYB (US Dollar Index) |
| **Volatility** | ^VIX (CBOE Volatility Index) |
| **Crypto** | BTC-USD (Bitcoin) |

---

## Data Sources

| Source | Coverage | Auth |
|---|---|---|
| Yahoo Finance via RapidAPI | All 15 symbols — equities, futures, indices, crypto | API Key |
| Alpha Vantage | Equities, ETFs, BTC fallback | API Key |
| Coinbase Public API | BTC-USD | None — open CORS |
| Reuters RSS | Business, markets, wealth news | None |
| Google News RSS | Signal-filtered Reuters & FT headlines | None |

Data sources are queried in parallel with priority-based conflict resolution to ensure the highest-quality source wins per symbol.

---

## News Intelligence

Headlines are not simply sorted by time. Each article is scored by investment signal strength before display:

**High-signal keywords** (each adds +1 to score):
`Fed · interest rates · CPI · inflation · GDP · recession · OPEC · oil · gold · bitcoin · tariff · sanctions · S&P · earnings · yield · VIX · dollar · downgrade · upgrade · volatility` and more.

**Recency bonus:**
- Published < 6 hours ago → +3
- Published < 24 hours ago → +1

A breaking Fed rate decision story from 2 hours ago will always rank above a general business feature published yesterday.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript |
| Build Tool | Vite |
| Styling | Tailwind CSS |
| Icons | Lucide React |
| Data Fetching | Native browser `fetch` — no backend |
| News Parsing | Native `DOMParser` for RSS/Atom XML |
| State Management | React hooks (`useState`, `useEffect`, `useMemo`, `useCallback`) |

---

## Getting Started

### Prerequisites

- Node.js 18+
- A [RapidAPI](https://rapidapi.com) account subscribed to:
  - [yahoo-finance1 by apidojo](https://rapidapi.com/apidojo/api/yahoo-finance1) (free tier)
  - [yahoo-finance15 by sparior](https://rapidapi.com/sparior/api/yahoo-finance15) (free tier)
- An [Alpha Vantage](https://www.alphavantage.co/support/#api-key) API key (free)

### Installation

```bash
git clone https://github.com/Madhavinders/macro-market-radar.git
cd macro-market-radar
npm install
```

### Configuration

Open `src/App.tsx` and replace the keys at the top of the file under the head of marketData.ts:

```ts
const RAPIDAPI_KEY      = 'your_rapidapi_key_here';
const ALPHA_VANTAGE_KEY = 'your_alpha_vantage_key_here';
```

### Run

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build for Production

```bash
npm run build
npm run preview
```

---

## Project Structure

```
macro-market-radar/
├── src/
│   ├── App.tsx                  # Root component, layout, state
│   ├── marketData.ts            # All data fetching, source cascade, news scoring
│   ├── types.ts                 # TypeScript interfaces
│   ├── constants.ts             # Asset metadata (names, categories, descriptions)
│   └── components/
│       ├── MetricCard.tsx       # Individual asset price card
│       ├── AssetInspector.tsx   # Detailed view for selected asset
│       ├── MarketStats.tsx      # Aggregate market breadth panel
│       ├── NewsFeed.tsx         # Signal-scored news list
│       └── TickerRibbon.tsx     # Scrolling top ticker bar
├── public/
├── index.html
├── vite.config.ts
├── tailwind.config.ts
└── package.json
```

---

## Architecture Decisions

**Why browser-native fetch instead of a backend?**
Deploying a Node/Express backend adds hosting complexity. Since all required APIs support CORS from the browser, a pure client-side approach keeps the project deployable as a static site on any CDN (Vercel, Netlify, GitHub Pages).

**Why a cascading multi-source pipeline?**
No single free-tier API reliably covers all 15 asset classes including futures, indices with `^` prefixes, and crypto each require different endpoints. The cascade ensures maximum symbol coverage even when individual sources fail or rate-limit.

**Why score news instead of sorting by time?**
Recency alone is a poor signal-to-noise filter. A breaking FOMC statement published 3 hours ago is more actionable than a company profile published 10 minutes ago. The scoring model approximates what a sell-side analyst would consider market-moving.

---

## Roadmap

- [ ] Sparkline charts per asset card (7-day price history)
- [ ] Portfolio overlay (input your holdings, see weighted exposure)
- [ ] Sector heatmap (S&P 500 sector breakdown)
- [ ] Email/push alerts when VIX spikes or key levels are breached
- [ ] Sentiment indicator derived from news signal scores
- [ ] Dark/light theme toggle

---

## License

MIT — free to use, fork, and build on.

---
