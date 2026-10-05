const inventoryController = require("../controllers/inventoryController");

module.exports = [
  { method: "GET", path: "/api/inventory", handler: inventoryController.listInventory },
  { method: "POST", path: "/api/inventory", handler: inventoryController.addInventoryItem },
  { method: "PUT", path: /^\/api\/inventory\/(?<id>[^/]+)$/, handler: inventoryController.updateInventoryItem },
  { method: "DELETE", path: /^\/api\/inventory\/(?<id>[^/]+)$/, handler: inventoryController.deleteInventoryItem },
];