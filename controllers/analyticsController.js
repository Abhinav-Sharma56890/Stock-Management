const { requireUser } = require("../middleware/authMiddleware");
const { sendJson } = require("../middleware/httpMiddleware");
const analyticsModel = require("../models/analyticsModel");

async function getAnalytics({ db, req, res }) {
  const user = await requireUser(db, req);
  const userId = user._id || user.id;

  const [
    stockTurnover,
    performers,
    inventoryValuation,
    transactionSummary,
    categoryBreakdown,
  ] = await Promise.all([
    analyticsModel.getStockTurnover(db, userId),
    analyticsModel.getBestWorstPerformers(db, userId),
    analyticsModel.getInventoryValuation(db, userId),
    analyticsModel.getTransactionSummary(db, userId),
    analyticsModel.getCategoryBreakdown(db, userId),
  ]);

  return sendJson(res, 200, {
    stock_turnover: stockTurnover,
    performers,
    inventory_valuation: inventoryValuation,
    transaction_summary: transactionSummary,
    category_breakdown: categoryBreakdown,
  });
}

module.exports = {
  getAnalytics,
};

