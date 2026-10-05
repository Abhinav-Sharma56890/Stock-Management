const { toMongoId } = require("../config/db");

async function getSalesKpis(db, userId) {
  const sales = await db.collection("transactions")
    .find({ user_id: toMongoId(userId), type: "SELL" })
    .toArray();

  const totalRevenue = sales.reduce((sum, t) => sum + (t.amount || 0), 0);
  const totalQuantity = sales.reduce((sum, t) => sum + (t.quantity || 0), 0);
  const salesCount = sales.length;
  const avgSale = salesCount > 0 ? totalRevenue / salesCount : 0;

  return {
    total_revenue: totalRevenue,
    total_quantity: totalQuantity,
    sales_count: salesCount,
    avg_sale_value: Number(avgSale.toFixed(2)),
  };
}

async function getSalesTrend(db, userId) {
  const sales = await db.collection("transactions")
    .find({ user_id: toMongoId(userId), type: "SELL" })
    .sort({ date: 1 })
    .toArray();

  const monthMap = {};
  for (const sale of sales) {
    const date = new Date(sale.date);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    if (!monthMap[key]) {
      monthMap[key] = { revenue: 0, quantity: 0, count: 0 };
    }
    monthMap[key].revenue += sale.amount || 0;
    monthMap[key].quantity += sale.quantity || 0;
    monthMap[key].count += 1;
  }

  const sortedKeys = Object.keys(monthMap).sort();
  return sortedKeys.map((key) => ({
    month: key,
    revenue: monthMap[key].revenue,
    quantity: monthMap[key].quantity,
    count: monthMap[key].count,
  }));
}

async function getTopSelling(db, userId, limit = 5) {
  const sales = await db.collection("transactions")
    .find({ user_id: toMongoId(userId), type: "SELL" })
    .toArray();

  const stockMap = {};
  for (const sale of sales) {
    const name = sale.stock_name;
    if (!stockMap[name]) {
      stockMap[name] = { stock_name: name, total_revenue: 0, total_quantity: 0, sales_count: 0 };
    }
    stockMap[name].total_revenue += sale.amount || 0;
    stockMap[name].total_quantity += sale.quantity || 0;
    stockMap[name].sales_count += 1;
  }

  return Object.values(stockMap)
    .sort((a, b) => b.total_revenue - a.total_revenue)
    .slice(0, limit);
}

async function getRecentSales(db, userId, limit = 10) {
  return db.collection("transactions")
    .find({ user_id: toMongoId(userId), type: "SELL" })
    .sort({ date: -1, _id: -1 })
    .limit(limit)
    .toArray();
}

module.exports = {
  getSalesKpis,
  getSalesTrend,
  getTopSelling,
  getRecentSales,
};

