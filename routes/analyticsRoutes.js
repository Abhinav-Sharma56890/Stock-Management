const analyticsController = require("../controllers/analyticsController");

module.exports = [
  { method: "GET", path: "/api/analytics", handler: analyticsController.getAnalytics },
];

