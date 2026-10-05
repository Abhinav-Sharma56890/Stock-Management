const { requireUser } = require("../middleware/authMiddleware");
const { sendJson } = require("../middleware/httpMiddleware");
const transactionModel = require("../models/transactionModel");

async function transactions({ db, req, res, url }) {
  const user = await requireUser(db, req);
  const search = String(url.searchParams.get("search") || "").trim();
  const type = String(url.searchParams.get("type") || "all").toUpperCase();
  return sendJson(res, 200, {
    transactions: (await transactionModel
      .listTransactions(db, user._id || user.id, search, type))
      .map(transactionModel.transactionPublic),
  });
}

module.exports = {
  transactions,
};
