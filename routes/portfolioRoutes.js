const portfolioController = require("../controllers/portfolioController");

module.exports = [
  { method: "GET", path: "/api/portfolio", handler: portfolioController.listPortfolio },
  { method: "GET", path: "/api/portfolio/by-email", handler: portfolioController.listPortfolioByEmail },
  { method: "GET", path: "/api/stock-search", handler: portfolioController.searchStock },
  { method: "GET", path: "/api/stock/price", handler: portfolioController.getStockPrice },

  { method: "POST", path: "/api/portfolio", handler: portfolioController.addStock },
  {
    method: "PUT",
    path: /^\/api\/portfolio\/(?<id>[^/]+)$/,
    handler: portfolioController.updateStock,
  },
  {
    method: "DELETE",
    path: /^\/api\/portfolio\/(?<id>[^/]+)$/,
    handler: portfolioController.deleteStock,
  },
  {
    method: "POST",
    path: /^\/api\/portfolio\/(?<id>[^/]+)\/sell$/,
    handler: portfolioController.sellStock,
  },
];
