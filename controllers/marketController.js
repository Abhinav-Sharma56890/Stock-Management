const { sendJson } = require("../middleware/httpMiddleware");
const { STOCK_API_KEY } = require("../config/env");

// Quotes intentionally have a deterministic local fallback. It keeps the demo usable
// without credentials and is labelled as delayed/simulated by the client.
const SEED_QUOTES = {
  AAPL: [224.18, 1.24, "Apple"], MSFT: [510.42, 0.82, "Microsoft"],
  NVDA: [171.09, -1.16, "NVIDIA"], GOOGL: [204.35, 0.61, "Alphabet"],
  AMZN: [223.65, -0.42, "Amazon"], TSLA: [331.11, 1.84, "Tesla"],
  META: [543.77, 0.58, "Meta Platforms"], NFLX: [1192.80, -0.31, "Netflix"],
};
const cache = new Map();
const TTL = 60 * 1000;
const historyCache = new Map();
const HISTORY_TTL = 5 * 60 * 1000;

function fallbackQuote(symbol) {
  const [price, change, name] = SEED_QUOTES[symbol] || [100 + symbol.length * 13.17, 0.35, symbol];
  return { symbol, name, price, change_percent: change, currency: "USD", source: "fallback", delayed: true };
}

async function remoteQuote(symbol) {
  if (!STOCK_API_KEY) return null;
  try {
    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(symbol)}&apikey=${STOCK_API_KEY}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(3000) });
    const data = await response.json();
    const quote = data["Global Quote"] || {};
    const price = Number(quote["05. price"]);
    if (!Number.isFinite(price) || price <= 0) return null;
    return {
      symbol, name: SEED_QUOTES[symbol]?.[2] || quote["01. symbol"] || symbol, price,
      change_percent: Number(quote["10. change percent"]?.replace("%", "")) || 0,
      currency: "USD", source: "alpha-vantage", delayed: true,
    };
  } catch { return null; }
}

async function getQuotes({ res, url }) {
  const raw = String(url.searchParams.get("symbols") || "").trim();
  if (!raw) return sendJson(res, 400, { error: "Provide one to eight comma-separated symbols." });
  const symbols = [...new Set(raw.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean))];
  if (!symbols.length || symbols.length > 8 || symbols.some((s) => !/^[A-Z.]{1,10}$/.test(s))) {
    return sendJson(res, 400, { error: "Symbols must be one to eight valid ticker symbols." });
  }
  const quotes = await Promise.all(symbols.map(async (symbol) => {
    const existing = cache.get(symbol);
    if (existing?.expiresAt > Date.now()) return existing.quote;
    const quote = await remoteQuote(symbol) || fallbackQuote(symbol);
    cache.set(symbol, { quote, expiresAt: Date.now() + TTL });
    return quote;
  }));
  return sendJson(res, 200, { quotes, as_of: new Date().toISOString(), delayed: true });
}

function fallbackHistory(symbol) {
  const quote = fallbackQuote(symbol);
  const points = Array.from({ length: 60 }, (_, index) => {
    const trend = (index / 59) * quote.price * (quote.change_percent >= 0 ? 0.22 : -0.12);
    const wave = Math.sin(index * 0.55 + symbol.length) * quote.price * 0.035;
    return { date: new Date(Date.now() - (59 - index) * 30 * 86400000).toISOString().slice(0, 10), close: Number(Math.max(1, quote.price * 0.82 + trend + wave).toFixed(2)) };
  });
  return { symbol, points, source: "fallback", delayed: true };
}

async function remoteHistory(symbol) {
  if (!STOCK_API_KEY) return null;
  try {
    const url = `https://www.alphavantage.co/query?function=TIME_SERIES_MONTHLY&symbol=${encodeURIComponent(symbol)}&apikey=${STOCK_API_KEY}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    const data = await response.json();
    const series = data["月ly Time Series"] || data["Monthly Time Series"] || {};
    const points = Object.entries(series).slice(0, 60).reverse().map(([date, values]) => ({ date, close: Number(values["4. close"]) })).filter((point) => Number.isFinite(point.close) && point.close > 0);
    return points.length >= 2 ? { symbol, points, source: "alpha-vantage", delayed: true } : null;
  } catch { return null; }
}

async function getHistory({ res, url }) {
  const symbol = String(url.searchParams.get("symbol") || "").trim().toUpperCase();
  if (!/^[A-Z.]{1,10}$/.test(symbol)) return sendJson(res, 400, { error: "Provide one valid ticker symbol." });
  const existing = historyCache.get(symbol);
  if (existing?.expiresAt > Date.now()) return sendJson(res, 200, existing.history);
  const history = await remoteHistory(symbol) || fallbackHistory(symbol);
  historyCache.set(symbol, { history, expiresAt: Date.now() + HISTORY_TTL });
  return sendJson(res, 200, history);
}

function fallbackNews(symbol) {
  const quote = fallbackQuote(symbol);
  const now = Date.now();
  return {
    symbol,
    source: "fallback",
    delayed: true,
    as_of: new Date(now).toISOString(),
    articles: [
      { title: `${quote.name} market update and investor watchpoints`, summary: "Illustrative headline for the research workspace.", source: "Vertex research demo", published_at: new Date(now - 2 * 3600000).toISOString(), url: "" },
      { title: `${quote.name} supplier and industry signals`, summary: "Illustrative sector context while a news provider is not connected.", source: "Vertex research demo", published_at: new Date(now - 5 * 3600000).toISOString(), url: "" },
      { title: `Analysts revisit the ${quote.name} outlook`, summary: "Use this page for exploration, not investment advice.", source: "Vertex research demo", published_at: new Date(now - 24 * 3600000).toISOString(), url: "" },
    ],
  };
}

async function getNews({ res, url }) {
  const symbol = String(url.searchParams.get("symbol") || "").trim().toUpperCase();
  if (!/^[A-Z.]{1,10}$/.test(symbol)) return sendJson(res, 400, { error: "Provide one valid ticker symbol." });
  if (!STOCK_API_KEY) return sendJson(res, 200, fallbackNews(symbol));
  try {
    const endpoint = `https://www.alphavantage.co/query?function=NEWS_SENTIMENT&tickers=${encodeURIComponent(symbol)}&limit=6&apikey=${STOCK_API_KEY}`;
    const response = await fetch(endpoint, { signal: AbortSignal.timeout(5000) });
    const data = await response.json();
    const articles = (data.feed || []).slice(0, 6).map(article => ({
      title: String(article.title || "Market update"), summary: String(article.summary || ""), source: String(article.source || "External source"), published_at: String(article.time_published || "").replace(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2}).*$/, "$1-$2-$3T$4:$5:$6Z"), url: String(article.url || ""),
    }));
    return sendJson(res, 200, articles.length ? { symbol, source: "alpha-vantage", delayed: true, as_of: new Date().toISOString(), articles } : fallbackNews(symbol));
  } catch { return sendJson(res, 200, fallbackNews(symbol)); }
}

module.exports = { getHistory, getNews, getQuotes };
