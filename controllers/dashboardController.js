const { requireUser } = require("../middleware/authMiddleware");
const { sendJson } = require("../middleware/httpMiddleware");
const portfolioModel = require("../models/portfolioModel");

async function dashboard({ db, req, res }) {
  const user = await requireUser(db, req);
  const stocks = (await portfolioModel
    .listDashboardStocks(db, user._id || user.id))
    .map(portfolioModel.stockPublic);
  const totalInvestment = stocks.reduce((sum, stock) => sum + stock.investment, 0);
  const currentValue = stocks.reduce((sum, stock) => sum + stock.current_value, 0);
  const profitLoss = currentValue - totalInvestment;

  return sendJson(res, 200, {
    summary: {
      total_investment: totalInvestment,
      current_value: currentValue,
      profit_loss: profitLoss,
      profit_loss_percent: totalInvestment ? (profitLoss / totalInvestment) * 100 : 0,
      stock_count: stocks.length,
    },
    stocks,
  });
}

module.exports = {
  dashboard,
};
