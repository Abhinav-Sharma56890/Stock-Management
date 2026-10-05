const kpiController = require("../controllers/kpiController");

module.exports = [
  { method: "GET", path: "/api/kpis", handler: kpiController.getKpis },
];

