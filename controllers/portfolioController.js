const { requireUser } = require("../middleware/authMiddleware");
const {
  asPositiveNumber,
  httpError,
  parseBody,
  sendJson,
  validateRequired,
} = require("../middleware/httpMiddleware");
const portfolioModel = require("../models/portfolioModel");
const transactionModel = require("../models/transactionModel");
const userModel = require("../models/userModel");
const { utcNow } = require("./authController");
const { STOCK_API_KEY } = require("../config/env");

const STOCK_SEARCH_LIBRARY = [
  { symbol: "RELIANCE", name: "Reliance Industries", price: 2750.35 },
  { symbol: "TCS", name: "Tata Consultancy Services", price: 3350.1 },
  { symbol: "HDFC", name: "HDFC Bank", price: 1505.25 },
  { symbol: "INFY", name: "Infosys", price: 1410.5 },
  { symbol: "ICICIBANK", name: "ICICI Bank", price: 950.4 },
  { symbol: "BAJFINANCE", name: "Bajaj Finance", price: 7200.85 },
  { symbol: "ASIANPAINT", name: "Asian Paints", price: 3100.3 },
  { symbol: "SBIN", name: "State Bank of India", price: 650.2 },
  { symbol: "LT", name: "Larsen & Toubro", price: 2450.75 },
  { symbol: "MARUTI", name: "Maruti Suzuki", price: 7200.6 },
  { symbol: "TATAMOTORS", name: "Tata Motors", price: 560.7 },
  { symbol: "TATAPOWER", name: "Tata Power", price: 330.1 },
  { symbol: "TATACHEM", name: "Tata Chemicals", price: 940.8 },
  { symbol: "TATACONSUM", name: "Tata Consumer Products", price: 820.5 },
  { symbol: "TATAELXSI", name: "Tata Elxsi", price: 5350.4 },
  { symbol: "TATACLIQ", name: "Tata CLiQ", price: 210.0 },
  { symbol: "TATASTEEL", name: "Tata Steel", price: 128.6 },
  { symbol: "TATAINVEST", name: "Tata Investment Corporation", price: 141.2 },
  { symbol: "TATAMTRDVR", name: "Tata Motors DVR", price: 235.3 },
  { symbol: "M&M", name: "Mahindra & Mahindra", price: 2875.4, market: "India" },
  { symbol: "M&MFIN", name: "Mahindra & Mahindra Financial Services", price: 278.6, market: "India" },
  { symbol: "MPHASIS", name: "Mphasis", price: 2454.8, market: "India" },
  { symbol: "ACC", name: "ACC", price: 2218.9, market: "India" },
  { symbol: "ADANIENT", name: "Adani Enterprises", price: 2460.5, market: "India" },
  { symbol: "ADANIPORTS", name: "Adani Ports and SEZ", price: 1197.8, market: "India" },
  { symbol: "AXISBANK", name: "Axis Bank", price: 1098.5, market: "India" },
  { symbol: "BEL", name: "Bharat Electronics", price: 287.4, market: "India" },
  { symbol: "BHARTIARTL", name: "Bharti Airtel", price: 1518.1, market: "India" },
  { symbol: "CIPLA", name: "Cipla", price: 1490.6, market: "India" },
  { symbol: "COALINDIA", name: "Coal India", price: 469.3, market: "India" },
  { symbol: "DRREDDY", name: "Dr. Reddy's Laboratories", price: 1320.5, market: "India" },
  { symbol: "EICHERMOT", name: "Eicher Motors", price: 4825.2, market: "India" },
  { symbol: "GRASIM", name: "Grasim Industries", price: 2525.4, market: "India" },
  { symbol: "HINDUNILVR", name: "Hindustan Unilever", price: 2475.5, market: "India" },
  { symbol: "INDUSINDBK", name: "IndusInd Bank", price: 1010.4, market: "India" },
  { symbol: "ITC", name: "ITC", price: 462.9, market: "India" },
  { symbol: "JSWSTEEL", name: "JSW Steel", price: 925.2, market: "India" },
  { symbol: "KOTAKBANK", name: "Kotak Mahindra Bank", price: 1775.6, market: "India" },
  { symbol: "NESTLEIND", name: "Nestle India", price: 2275.6, market: "India" },
  { symbol: "NTPC", name: "NTPC", price: 385.1, market: "India" },
  { symbol: "ONGC", name: "Oil and Natural Gas Corporation", price: 287.2, market: "India" },
  { symbol: "POWERGRID", name: "Power Grid Corporation of India", price: 328.6, market: "India" },
  { symbol: "SUNPHARMA", name: "Sun Pharmaceutical Industries", price: 1798.5, market: "India" },
  { symbol: "TITAN", name: "Titan Company", price: 3370.8, market: "India" },
  { symbol: "ULTRACEMCO", name: "UltraTech Cement", price: 11250.5, market: "India" },
  { symbol: "WIPRO", name: "Wipro", price: 540.3, market: "India" },
  { symbol: "ZOMATO", name: "Zomato", price: 225.6, market: "India" },
  { symbol: "AAPL", name: "Apple", market: "United States", exchange: "NASDAQ" },
  { symbol: "AAPL.MX", name: "Apple", market: "Mexico", exchange: "BMV" },
  { symbol: "GOOGL", name: "Alphabet", market: "United States" },
  { symbol: "AMZN", name: "Amazon", market: "United States" },
  { symbol: "MSFT", name: "Microsoft", market: "United States" },
  { symbol: "META", name: "Meta Platforms", market: "United States" },
  { symbol: "NVDA", name: "NVIDIA", market: "United States" },
  { symbol: "TSLA", name: "Tesla", market: "United States" },
  { symbol: "BRK.B", name: "Berkshire Hathaway", market: "United States" },
  { symbol: "JPM", name: "JPMorgan Chase", market: "United States" },
  { symbol: "V", name: "Visa", market: "United States" },
  { symbol: "WMT", name: "Walmart", market: "United States" },
  { symbol: "LLY", name: "Eli Lilly and Company", market: "United States" },
  { symbol: "AVGO", name: "Broadcom", market: "United States" },
  { symbol: "NFLX", name: "Netflix", market: "United States" },
  { symbol: "ADBE", name: "Adobe", market: "United States" },
  { symbol: "CSCO", name: "Cisco Systems", market: "United States" },
  { symbol: "INTC", name: "Intel", market: "United States" },
  { symbol: "ORCL", name: "Oracle", market: "United States" },
  { symbol: "CRM", name: "Salesforce", market: "United States" },
  { symbol: "IBM", name: "IBM", market: "United States" },
  { symbol: "UBER", name: "Uber Technologies", market: "United States" },
  { symbol: "KO", name: "Coca-Cola", market: "United States" },
  { symbol: "PEP", name: "PepsiCo", market: "United States" },
  { symbol: "MCD", name: "McDonald's", market: "United States" },
  { symbol: "DIS", name: "Walt Disney", market: "United States" },
  { symbol: "BA", name: "Boeing", market: "United States" },
  { symbol: "XOM", name: "Exxon Mobil", market: "United States" },
  { symbol: "CVX", name: "Chevron", market: "United States" },
  { symbol: "PFE", name: "Pfizer", market: "United States" },
  { symbol: "MRK", name: "Merck & Co.", market: "United States" },
  { symbol: "MA", name: "Mastercard", market: "United States" },
  { symbol: "PYPL", name: "PayPal", market: "United States" },
  { symbol: "MRVL", name: "Marvell Technology", market: "United States" },
  { symbol: "MGA", name: "Magna International", market: "Canada" },
  { symbol: "MFC", name: "Manulife Financial", market: "Canada" },
  { symbol: "SHOP", name: "Shopify", market: "Canada" },
  { symbol: "TM", name: "Toyota Motor", market: "Japan" },
  { symbol: "SONY", name: "Sony Group", market: "Japan" },
  { symbol: "TSM", name: "Taiwan Semiconductor Manufacturing", market: "Taiwan" },
  { symbol: "ASML", name: "ASML Holding", market: "Netherlands" },
  { symbol: "SIEGY", name: "Siemens", market: "Germany" },
  { symbol: "SAP", name: "SAP", market: "Germany" },
  { symbol: "NESN.SW", name: "Nestle", market: "Switzerland" },
  { symbol: "NVS", name: "Novartis", market: "Switzerland" },
  { symbol: "TCEHY", name: "Tencent Holdings", market: "China" },
  { symbol: "BABA", name: "Alibaba Group", market: "China" },
  { symbol: "BIDU", name: "Baidu", market: "China" },
  { symbol: "SHEL", name: "Shell", market: "United Kingdom" },
  { symbol: "HSBC", name: "HSBC Holdings", market: "United Kingdom" },
  { symbol: "BP", name: "BP", market: "United Kingdom" },
  { symbol: "RIO", name: "Rio Tinto", market: "United Kingdom" },
  { symbol: "AZN", name: "AstraZeneca", market: "United Kingdom" },
  { symbol: "UL", name: "Unilever", market: "United Kingdom" },
  { symbol: "MC.PA", name: "LVMH", market: "France" },
  { symbol: "BHP", name: "BHP Group", market: "Australia" },
];

const STOCK_QUOTE_CACHE_TTL_MS = 60 * 1000;
const STOCK_SEARCH_CACHE_TTL_MS = 2 * 60 * 1000;
const stockQuoteCache = new Map();
const stockSearchCache = new Map();

function stockIdFromParams(params) {
  const id = String(params.id || "").trim();
  if (!id) {
    throw httpError(400, "Invalid stock id.");
  }
  return id;
}

function stockPayload(data) {
  return {
    stockName: String(data.stock_name).trim(),
    stockSymbol: String(data.stock_symbol || "").trim(),
    quantity: asPositiveNumber(data.quantity, "Quantity"),
    buyPrice: asPositiveNumber(data.buy_price, "Buy price"),
    currentPrice: asPositiveNumber(data.current_price, "Current price", true),
  };
}

function getCacheEntry(cache, key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

function setCacheEntry(cache, key, value, ttlMs) {
  cache.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  });
  return value;
}

function fallbackStockBySymbol(sym) {
  const item = STOCK_SEARCH_LIBRARY.find((stock) => stock.symbol.toUpperCase() === sym);
  return item ? stockSuggestion(item) : null;
}

function normalizeSearchText(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function stockSuggestion(item) {
  const related = {
    Apple: ["Apple suppliers", "Technology", "Consumer electronics"],
    Microsoft: ["Cloud computing", "Enterprise software", "Technology"],
    NVIDIA: ["AI", "Semiconductors", "Data centers"],
  };
  return {
    symbol: item.symbol,
    name: item.name,
    market: item.market || "India",
    exchange: item.exchange || "Global market",
    related: related[item.name] || ["Global equities", "Large cap", "Market research"],
    current_price: Number(item.price || 0),
  };
}

function suggestionRank(item, query) {
  const normalizedQuery = normalizeSearchText(query);
  const symbol = normalizeSearchText(item.symbol);
  const name = normalizeSearchText(item.name);
  const words = String(item.name).toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);

  if (symbol.startsWith(normalizedQuery)) return 0;
  if (name.startsWith(normalizedQuery)) return 1;
  if (words.some((word) => word.startsWith(normalizedQuery))) return 2;
  if (symbol.includes(normalizedQuery)) return 3;
  if (name.includes(normalizedQuery)) return 4;
  return Number.POSITIVE_INFINITY;
}

function fallbackStockSuggestions(searchTerm) {
  return STOCK_SEARCH_LIBRARY
    .map((item) => ({ item, rank: suggestionRank(item, searchTerm) }))
    .filter(({ rank }) => Number.isFinite(rank))
    .sort((a, b) => a.rank - b.rank || a.item.name.localeCompare(b.item.name))
    .slice(0, 12)
    .map(({ item }) => stockSuggestion(item));
}

async function fetchQuoteForSymbol(symbol, fallbackName = "") {
  const normalizedSymbol = String(symbol || "").trim().toUpperCase();
  if (!normalizedSymbol) return null;

  const cached = getCacheEntry(stockQuoteCache, normalizedSymbol);
  if (cached) return cached;

  const fallback = fallbackStockBySymbol(normalizedSymbol);
  if (!STOCK_API_KEY) {
    return fallback ? setCacheEntry(stockQuoteCache, normalizedSymbol, fallback, STOCK_QUOTE_CACHE_TTL_MS) : null;
  }

  try {
    const quoteUrl = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(normalizedSymbol)}&apikey=${STOCK_API_KEY}`;
    const quoteResponse = await fetch(quoteUrl, { signal: AbortSignal.timeout(3500) });
    const quoteData = await quoteResponse.json();
    const price = parseFloat(quoteData["Global Quote"]?.["05. price"]);

    if (Number.isFinite(price) && price > 0) {
      return setCacheEntry(stockQuoteCache, normalizedSymbol, {
        symbol: normalizedSymbol,
        name: fallbackName || quoteData["Global Quote"]?.["01. symbol"] || fallback?.name || normalizedSymbol,
        current_price: price,
      }, STOCK_QUOTE_CACHE_TTL_MS);
    }
  } catch (error) {
    console.error("Stock price API error:", error);
  }

  return fallback ? setCacheEntry(stockQuoteCache, normalizedSymbol, fallback, STOCK_QUOTE_CACHE_TTL_MS) : null;
}

async function listPortfolio({ db, req, res, url }) {
  const user = await requireUser(db, req);
  const search = String(url.searchParams.get("search") || "").trim();
  const filter = String(url.searchParams.get("filter") || "all");
  let stocks = (await portfolioModel.listStocks(db, user._id || user.id, search)).map(portfolioModel.stockPublic);

  if (filter === "profit") stocks = stocks.filter((stock) => stock.profit_loss > 0);
  if (filter === "loss") stocks = stocks.filter((stock) => stock.profit_loss < 0);
  if (filter === "neutral") stocks = stocks.filter((stock) => stock.profit_loss === 0);
  return sendJson(res, 200, { stocks });
}

async function listPortfolioByEmail({ db, req, res }) {
  await requireUser(db, req);

  const users = await userModel.listUsers(db);
  const portfolios = await Promise.all(
    users.map(async (user) => {
      const userId = user._id || user.id;
      const [stocks, transactions] = await Promise.all([
        portfolioModel.listStocks(db, userId),
        transactionModel.listTransactions(db, userId, "", "ALL"),
      ]);

      return {
        email: user.email,
        name: user.name,
        created_at: user.created_at,
        stocks: stocks.map(portfolioModel.stockPublic),
        added_stock_history: transactions
          .filter((transaction) => transaction.type === "BUY")
          .map(transactionModel.transactionPublic),
      };
    })
  );

  return sendJson(res, 200, { portfolios });
}

async function getStockPrice({ res, url }) {
  const symbol = String(url.searchParams.get("symbol") || "").trim().toUpperCase();
  if (!symbol) {
    return sendJson(res, 400, { error: "Symbol required" });
  }
  const result = await fetchQuoteForSymbol(symbol);
  if (!result) return sendJson(res, 404, { error: STOCK_API_KEY ? "Price unavailable" : "Stock not found" });
  return sendJson(res, 200, result);
}

async function searchStock({ res, url }) {
  const query = String(url.searchParams.get("query") || "").trim();

  if (!query) {
    return sendJson(res, 200, { results: [] });
  }
  const normalizedQuery = query.toLowerCase();
  const cached = getCacheEntry(stockSearchCache, normalizedQuery);
  if (cached) {
    return sendJson(res, 200, { results: cached });
  }

  const localResults = fallbackStockSuggestions(query);
  if (!STOCK_API_KEY) {
    return sendJson(res, 200, {
      results: setCacheEntry(stockSearchCache, normalizedQuery, localResults, STOCK_SEARCH_CACHE_TTL_MS),
    });
  }

  try {
    const searchUrl = `https://www.alphavantage.co/query?function=SYMBOL_SEARCH&keywords=${encodeURIComponent(query)}&apikey=${STOCK_API_KEY}`;
    const searchResponse = await fetch(searchUrl, { signal: AbortSignal.timeout(2500) });
    const searchData = await searchResponse.json();

    if (!searchData?.bestMatches?.length) {
      return sendJson(res, 200, {
        results: setCacheEntry(stockSearchCache, normalizedQuery, fallbackStockSuggestions(query), STOCK_SEARCH_CACHE_TTL_MS),
      });
    }

    const seenSymbols = new Set(localResults.map((item) => item.symbol.toUpperCase()));
    const remoteResults = searchData.bestMatches
      .map((match) => ({
        symbol: String(match["1. symbol"] || "").trim(),
        name: String(match["2. name"] || "").trim(),
        market: [match["4. region"], match["3. type"]].filter(Boolean).join(" · "),
        current_price: 0,
      }))
      .filter((item) => item.symbol && item.name && !seenSymbols.has(item.symbol.toUpperCase()))
      .slice(0, Math.max(0, 12 - localResults.length));

    const finalResults = [...localResults, ...remoteResults].slice(0, 12);
    return sendJson(res, 200, {
      results: setCacheEntry(stockSearchCache, normalizedQuery, finalResults, STOCK_SEARCH_CACHE_TTL_MS),
    });
  } catch (error) {
    console.error("Stock API error:", error);
    return sendJson(res, 200, {
      results: setCacheEntry(stockSearchCache, normalizedQuery, fallbackStockSuggestions(query), STOCK_SEARCH_CACHE_TTL_MS),
    });
  }
}

async function addStock({ db, req, res }) {
  const user = await requireUser(db, req);
  const data = await parseBody(req);
  const error = validateRequired(data, ["stock_name", "quantity", "buy_price", "current_price"]);
  if (error) throw httpError(400, error);

  const stock = stockPayload(data);
  const now = utcNow();
  const userId = user._id || user.id;
  const stockId = await portfolioModel.createStock(db, userId, {
    ...stock,
    createdAt: now,
    updatedAt: now,
  });
  await transactionModel.recordTransaction(db, userId, stock.stockName, "BUY", stock.quantity, stock.buyPrice, now);
  const row = await portfolioModel.fetchStock(db, stockId, userId);
  return sendJson(res, 201, { message: "Stock added.", stock: portfolioModel.stockPublic(row) });
}

async function updateStock({ db, req, res, params }) {
  const user = await requireUser(db, req);
  const userId = user._id || user.id;
  const stockId = stockIdFromParams(params);
  const data = await parseBody(req);
  const error = validateRequired(data, ["stock_name", "quantity", "buy_price", "current_price"]);
  if (error) throw httpError(400, error);

  if (!(await portfolioModel.fetchStock(db, stockId, userId))) {
    return sendJson(res, 404, { error: "Stock not found." });
  }

  const stock = stockPayload(data);
  const now = utcNow();
  const updated = await portfolioModel.updateStock(db, stockId, userId, {
    ...stock,
    updatedAt: now,
  });
  await transactionModel.recordTransaction(db, userId, stock.stockName, "UPDATE", stock.quantity, stock.currentPrice, now);
  return sendJson(res, 200, { message: "Stock updated.", stock: portfolioModel.stockPublic(updated) });
}

async function deleteStock({ db, req, res, params }) {
  const user = await requireUser(db, req);
  const userId = user._id || user.id;
  const stockId = stockIdFromParams(params);
  const stock = await portfolioModel.fetchStock(db, stockId, userId);
  if (!stock) return sendJson(res, 404, { error: "Stock not found." });

  await portfolioModel.deleteStock(db, stockId, userId);
  await transactionModel.recordTransaction(
    db,
    userId,
    stock.stock_name,
    "DELETE",
    stock.quantity,
    stock.current_price,
    utcNow()
  );
  return sendJson(res, 200, { message: "Stock deleted." });
}

async function sellStock({ db, req, res, params }) {
  const user = await requireUser(db, req);
  const userId = user._id || user.id;
  const stockId = stockIdFromParams(params);

  const stock = await portfolioModel.fetchStock(db, stockId, userId);
  if (!stock) return sendJson(res, 404, { error: "Stock not found." });

  const data = await parseBody(req);
  const sellQuantity = asPositiveNumber(data.sell_quantity, "Sell quantity");
  const sellPrice = asPositiveNumber(data.sell_price, "Sell price");

  if (sellQuantity > stock.quantity) {
    throw httpError(400, "Sell quantity cannot exceed current holdings.");
  }

  const now = utcNow();
  const remainingQuantity = stock.quantity - sellQuantity;

  await transactionModel.recordTransaction(
    db,
    userId,
    stock.stock_name,
    "SELL",
    sellQuantity,
    sellPrice,
    now
  );

  if (remainingQuantity <= 0) {
    await portfolioModel.deleteStock(db, stockId, userId);
    return sendJson(res, 200, { message: "Stock sold and removed from portfolio." });
  }

  const updated = await portfolioModel.updateQuantityAfterSale(
    db,
    stockId,
    userId,
    remainingQuantity,
    sellPrice,
    now
  );

  return sendJson(res, 200, {
    message: "Stock sold.",
    stock: portfolioModel.stockPublic(updated),
  });
}

module.exports = {
  addStock,
  deleteStock,
  getStockPrice,
  listPortfolioByEmail,
  listPortfolio,
  searchStock,
  sellStock,
  updateStock,
};
