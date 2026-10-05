const { requireUser } = require("../middleware/authMiddleware");
const { sendJson } = require("../middleware/httpMiddleware");
const salesAnalyticsModel = require("../models/salesAnalyticsModel");

async function getSalesAnalytics({ db, req, res }) {
  const user = await requireUser(db, req);
  const userId = user._id || user.id;

  const [kpis, trend, topSelling, recentSales] = await Promise.all([
    salesAnalyticsModel.getSalesKpis(db, userId),
    salesAnalyticsModel.getSalesTrend(db, userId),
    salesAnalyticsModel.getTopSelling(db, userId),
    salesAnalyticsModel.getRecentSales(db, userId),
  ]);

  return sendJson(res, 200, {
    kpis,
    trend,
    top_selling: topSelling,
    recent_sales: recentSales.map((t) => ({
      id: String(t._id || t.id),
      stock_name: t.stock_name,
      quantity: t.quantity,
      price: t.price,
      amount: t.amount,
      date: t.date,
    })),
  });
}

module.exports = {
  getSalesAnalytics,
};

