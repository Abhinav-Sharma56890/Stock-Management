const salesAnalyticsController = require("../controllers/salesAnalyticsController");

module.exports = [
  { method: "GET", path: "/api/sales-analytics", handler: salesAnalyticsController.getSalesAnalytics },
];

