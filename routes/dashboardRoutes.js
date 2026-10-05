const dashboardController = require("../controllers/dashboardController");

module.exports = [
  { method: "GET", path: "/api/dashboard", handler: dashboardController.dashboard },
];

