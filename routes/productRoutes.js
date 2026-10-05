const productController = require("../controllers/productController");

module.exports = [
  { method: "GET", path: "/api/products", handler: productController.listProducts },
  { method: "POST", path: "/api/products", handler: productController.addProduct },
  { method: "POST", path: /^\/api\/products\/(?<id>[^/]+)\/sell\/?$/, handler: productController.sellProduct },
  { method: "POST", path: "/api/products/sell", handler: productController.sellProduct },
  { method: "PUT", path: /^\/api\/products\/(?<id>[^/]+)$/, handler: productController.updateProduct },
  { method: "DELETE", path: /^\/api\/products\/(?<id>[^/]+)$/, handler: productController.deleteProduct },
];