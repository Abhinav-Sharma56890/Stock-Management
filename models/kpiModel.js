const { toMongoId } = require("../config/db");

const LOW_STOCK_THRESHOLD = 10;

async function getTotalInventoryValue(db, userId) {
  const inventory = await db.collection("inventory")
    .find({ user_id: toMongoId(userId) })
    .toArray();

  const products = await db.collection("products")
    .find({ user_id: toMongoId(userId) })
    .toArray();

  const productMap = new Map();
  for (const product of products) {
    productMap.set(product.product_name.toLowerCase(), product.unit_price || 0);
  }

  let totalValue = 0;
  for (const item of inventory) {
    const unitPrice = productMap.get(item.item_name.toLowerCase()) || 0;
    totalValue += (item.quantity || 0) * unitPrice;
  }

  return totalValue;
}

async function getLowStockAlerts(db, userId) {
  const inventory = await db.collection("inventory")
    .find({ user_id: toMongoId(userId) })
    .toArray();

  const alerts = inventory
    .filter((item) => (item.quantity || 0) < LOW_STOCK_THRESHOLD)
    .map((item) => ({
      item_name: item.item_name,
      location_name: item.location_name,
      quantity: item.quantity || 0,
    }));

  return {
    count: alerts.length,
    items: alerts,
  };
}

async function getPendingOrders(db, userId) {
  const inventory = await db.collection("inventory")
    .find({ user_id: toMongoId(userId) })
    .toArray();

  const totalInTransit = inventory.reduce((sum, item) => sum + (item.in_transit_quantity || 0), 0);
  const itemCount = inventory.filter((item) => (item.in_transit_quantity || 0) > 0).length;

  return {
    total_in_transit: totalInTransit,
    item_count: itemCount,
  };
}

async function getTotalProducts(db, userId) {
  const count = await db.collection("products")
    .countDocuments({ user_id: toMongoId(userId) });

  return count;
}

async function getKpis(db, userId) {
  const [
    total_inventory_value,
    low_stock_alerts,
    pending_orders,
    total_products,
  ] = await Promise.all([
    getTotalInventoryValue(db, userId),
    getLowStockAlerts(db, userId),
    getPendingOrders(db, userId),
    getTotalProducts(db, userId),
  ]);

  return {
    total_inventory_value,
    low_stock_alerts,
    pending_orders,
    total_products,
  };
}

module.exports = {
  getKpis,
  getTotalInventoryValue,
  getLowStockAlerts,
  getPendingOrders,
  getTotalProducts,
};

