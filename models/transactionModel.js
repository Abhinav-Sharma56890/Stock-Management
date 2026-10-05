const { toMongoId } = require("../config/db");

function transactionPublic(row) {
  return {
    id: String(row._id || row.id),
    stock_name: row.stock_name,
    type: row.type,
    quantity: row.quantity,
    price: row.price,
    amount: row.amount,
    date: row.date,
  };
}

async function recordTransaction(db, userId, stockName, type, quantity, price, date) {
  await db.collection("transactions").insertOne({
    user_id: toMongoId(userId),
    stock_name: stockName,
    type,
    quantity,
    price,
    amount: quantity * price,
    date,
  });
}

async function listTransactions(db, userId, search = "", type = "all") {
  const query = { user_id: toMongoId(userId) };
  if (search) {
    query.stock_name = { $regex: search, $options: "i" };
  }
  if (type && type !== "ALL") {
    query.type = type;
  }
  return db
    .collection("transactions")
    .find(query)
    .sort({ date: -1, _id: -1 })
    .toArray();
}

module.exports = {
  listTransactions,
  recordTransaction,
  transactionPublic,
};

