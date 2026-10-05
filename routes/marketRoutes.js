const { getHistory, getNews, getQuotes } = require("../controllers/marketController");

module.exports = [
	{ method: "GET", path: "/api/market/quotes", handler: getQuotes },
	{ method: "GET", path: "/api/market/history", handler: getHistory },
	{ method: "GET", path: "/api/market/news", handler: getNews },
];
