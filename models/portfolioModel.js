const { toMongoId } = require("../config/db");

function stockPublic(row) {
  const investment = row.quantity * row.buy_price;
  const currentValue = row.quantity * row.current_price;
  const profitLoss = currentValue - investment;
  return {
    id: String(row._id || row.id),
    stock_name: row.stock_name,
    stock_symbol: row.stock_symbol || "",
    quantity: row.quantity,
    buy_price: row.buy_price,
    current_price: row.current_price,
    investment,
    current_value: currentValue,
    profit_loss: profitLoss,
    profit_loss_percent: investment ? (profitLoss / investment) * 100 : 0,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function createStock(db, userId, stock) {
  const result = await db.collection("portfolio").insertOne({
    user_id: toMongoId(userId),
    stock_name: stock.stockName,
    stock_symbol: stock.stockSymbol || null,
    quantity: stock.quantity,
    buy_price: stock.buyPrice,
    current_price: stock.currentPrice,
    created_at: stock.createdAt,
    updated_at: stock.updatedAt,
  });
  return result.insertedId;
}

async function deleteStock(db, stockId, userId) {
  await db.collection("portfolio").deleteOne({
    _id: toMongoId(stockId),
    user_id: toMongoId(userId),
  });
}

async function fetchStock(db, stockId, userId) {
  return db.collection("portfolio").findOne({
    _id: toMongoId(stockId),
    user_id: toMongoId(userId),
  });
}

async function listStocks(db, userId, search = "") {
  const query = { user_id: toMongoId(userId) };
  if (search) {
    query.$or = [
      { stock_name: { $regex: search, $options: "i" } },
      { stock_symbol: { $regex: search, $options: "i" } },
    ];
  }

  return db
    .collection("portfolio")
    .find(query)
    .sort({ updated_at: -1, _id: -1 })
    .toArray();
}

async function listDashboardStocks(db, userId) {
  return db
    .collection("portfolio")
    .find({ user_id: toMongoId(userId) })
    .sort({ stock_name: 1 })
    .toArray();
}

async function updateStock(db, stockId, userId, stock) {
  await db.collection("portfolio").updateOne(
    {
      _id: toMongoId(stockId),
      user_id: toMongoId(userId),
    },
    {
      $set: {
        stock_name: stock.stockName,
        stock_symbol: stock.stockSymbol || null,
        quantity: stock.quantity,
        buy_price: stock.buyPrice,
        current_price: stock.currentPrice,
        updated_at: stock.updatedAt,
      },
    }
  );
  return fetchStock(db, stockId, userId);
}

async function updateQuantityAfterSale(db, stockId, userId, quantity, currentPrice, updatedAt) {
  await db.collection("portfolio").updateOne(
    {
      _id: toMongoId(stockId),
      user_id: toMongoId(userId),
    },
    {
      $set: {
        quantity,
        current_price: currentPrice,
        updated_at: updatedAt,
      },
    }
  );
  return fetchStock(db, stockId, userId);
}

module.exports = {
  createStock,
  deleteStock,
  fetchStock,
  listDashboardStocks,
  listStocks,
  stockPublic,
  updateQuantityAfterSale,
  updateStock,
};

