const { toMongoId } = require("../config/db");

async function getStockTurnover(db, userId) {
  const stocks = await db.collection("portfolio")
    .find({ user_id: toMongoId(userId) })
    .toArray();

  const result = [];
  for (const stock of stocks) {
    const transactions = await db.collection("transactions")
      .find({
        user_id: toMongoId(userId),
        stock_name: stock.stock_name,
      })
      .toArray();

    const totalBuy = transactions
      .filter((t) => t.type === "BUY")
      .reduce((sum, t) => sum + (t.quantity || 0), 0);
    const totalSell = transactions
      .filter((t) => t.type === "SELL")
      .reduce((sum, t) => sum + (t.quantity || 0), 0);

    const turnoverRate = stock.quantity > 0
      ? Number(((totalBuy + totalSell) / stock.quantity).toFixed(2))
      : 0;

    result.push({
      stock_name: stock.stock_name,
      stock_symbol: stock.stock_symbol || "",
      current_holdings: stock.quantity,
      total_buy_quantity: totalBuy,
      total_sell_quantity: totalSell,
      turnover_rate: turnoverRate,
    });
  }

  const totalHoldings = result.reduce((sum, s) => sum + s.current_holdings, 0);
  const totalVolume = result.reduce((sum, s) => sum + s.total_buy_quantity + s.total_sell_quantity, 0);
  const portfolioTurnover = totalHoldings > 0 ? Number((totalVolume / totalHoldings).toFixed(2)) : 0;

  return {
    stocks: result,
    portfolio_turnover_rate: portfolioTurnover,
  };
}

async function getBestWorstPerformers(db, userId) {
  const stocks = await db.collection("portfolio")
    .find({ user_id: toMongoId(userId) })
    .toArray();

  const mapped = stocks.map((stock) => {
    const investment = stock.quantity * stock.buy_price;
    const currentValue = stock.quantity * stock.current_price;
    const profitLoss = currentValue - investment;
    const profitLossPercent = investment ? (profitLoss / investment) * 100 : 0;

    return {
      stock_name: stock.stock_name,
      stock_symbol: stock.stock_symbol || "",
      profit_loss: profitLoss,
      profit_loss_percent: Number(profitLossPercent.toFixed(2)),
      investment,
      current_value: currentValue,
    };
  });

  mapped.sort((a, b) => b.profit_loss_percent - a.profit_loss_percent);

  return {
    best: mapped.slice(0, 5),
    worst: mapped.slice(-5).reverse(),
  };
}

async function getInventoryValuation(db, userId) {
  const inventory = await db.collection("inventory")
    .find({ user_id: toMongoId(userId) })
    .toArray();

  const products = await db.collection("products")
    .find({ user_id: toMongoId(userId) })
    .toArray();

  const productMap = new Map();
  for (const product of products) {
    productMap.set(product.product_name.toLowerCase(), product);
  }

  let totalValue = 0;
  const items = [];

  for (const item of inventory) {
    const product = productMap.get(item.item_name.toLowerCase());
    const unitPrice = product ? product.unit_price : 0;
    const itemValue = item.quantity * unitPrice;
    totalValue += itemValue;

    items.push({
      item_name: item.item_name,
      location_name: item.location_name,
      quantity: item.quantity,
      unit_price: unitPrice,
      total_value: itemValue,
      matched: !!product,
    });
  }

  const locationMap = {};
  for (const item of items) {
    if (!locationMap[item.location_name]) {
      locationMap[item.location_name] = { quantity: 0, value: 0 };
    }
    locationMap[item.location_name].quantity += item.quantity;
    locationMap[item.location_name].value += item.total_value;
  }

  return {
    total_value: totalValue,
    item_count: items.length,
    items,
    location_breakdown: Object.entries(locationMap).map(([name, data]) => ({
      location_name: name,
      total_quantity: data.quantity,
      total_value: data.value,
    })),
  };
}

async function getTransactionSummary(db, userId) {
  const transactions = await db.collection("transactions")
    .find({ user_id: toMongoId(userId) })
    .toArray();

  const summary = {
    total_count: transactions.length,
    total_value: transactions.reduce((sum, t) => sum + (t.amount || 0), 0),
    by_type: {},
  };

  for (const type of ["BUY", "SELL", "UPDATE", "DELETE"]) {
    const typeTx = transactions.filter((t) => t.type === type);
    summary.by_type[type] = {
      count: typeTx.length,
      total_quantity: typeTx.reduce((sum, t) => sum + (t.quantity || 0), 0),
      total_amount: typeTx.reduce((sum, t) => sum + (t.amount || 0), 0),
    };
  }

  return summary;
}

async function getCategoryBreakdown(db, userId) {
  const [products, sales] = await Promise.all([
    db.collection("products")
      .find({ user_id: toMongoId(userId) })
      .toArray(),
    db.collection("transactions")
      .find({ user_id: toMongoId(userId), type: "SELL" })
      .toArray(),
  ]);

  const productMap = new Map();
  for (const product of products) {
    productMap.set(String(product.product_name || "").toLowerCase(), product);
  }

  const categoryMap = {};
  for (const sale of sales) {
    const product = productMap.get(String(sale.stock_name || "").toLowerCase());
    const category = product?.category || "Uncategorized";
    const qty = sale.quantity || 0;
    const value = sale.amount || (qty * (sale.price || 0));

    if (!categoryMap[category]) {
      categoryMap[category] = {
        product_count: 0,
        total_quantity: 0,
        total_value: 0,
        soldProducts: new Set(),
      };
    }

    categoryMap[category].soldProducts.add(String(sale.stock_name || "").trim() || "Unnamed Item");
    categoryMap[category].total_quantity += qty;
    categoryMap[category].total_value += value;
  }

  return Object.entries(categoryMap)
    .map(([category, data]) => ({
      category,
      product_count: data.soldProducts.size,
      total_quantity: data.total_quantity,
      total_value: data.total_value,
    }))
    .sort((a, b) => b.total_value - a.total_value);
}

module.exports = {
  getStockTurnover,
  getBestWorstPerformers,
  getInventoryValuation,
  getTransactionSummary,
  getCategoryBreakdown,
};

