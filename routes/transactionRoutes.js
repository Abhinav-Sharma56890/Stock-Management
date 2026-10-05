const transactionController = require("../controllers/transactionController");

module.exports = [
  { method: "GET", path: "/api/transactions", handler: transactionController.transactions },
];

