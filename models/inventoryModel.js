const { toMongoId } = require("../config/db");

function inventoryPublic(row) {
  const quantity = Number(row.quantity || 0);
  let stock_health = "healthy";
  if (quantity === 0) {
    stock_health = "stockout";
  } else if (quantity < 10) {
    stock_health = "low";
  }

  return {
    id: String(row._id || row.id),
    item_name: row.item_name,
    location_name: row.location_name,
    quantity: row.quantity,
    in_transit_quantity: row.in_transit_quantity,
    stock_health,
    updated_at: row.updated_at,
  };
}

async function createInventoryItem(db, userId, { itemName, locationName, quantity, inTransitQuantity, createdAt, updatedAt }) {
  const result = await db.collection("inventory").insertOne({
    user_id: toMongoId(userId),
    item_name: itemName,
    location_name: locationName,
    quantity,
    in_transit_quantity: inTransitQuantity,
    created_at: createdAt,
    updated_at: updatedAt,
  });
  return fetchInventoryItem(db, result.insertedId, userId);
}

async function listInventory(db, userId, search = "") {
  const query = { user_id: toMongoId(userId) };
  if (search) {
    const term = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    query.$or = [{ item_name: term }, { location_name: term }];
  }
  const rows = await db.collection("inventory").find(query).sort({ updated_at: -1 }).toArray();
  return rows.map(inventoryPublic);
}

async function fetchInventoryItem(db, itemId, userId) {
  return db.collection("inventory").findOne({
    _id: toMongoId(itemId),
    user_id: toMongoId(userId),
  });
}

async function updateInventoryItem(db, itemId, userId, update) {
  const result = await db.collection("inventory").updateOne(
    { _id: toMongoId(itemId), user_id: toMongoId(userId) },
    { $set: update }
  );
  if (!result.matchedCount) return null;
  return fetchInventoryItem(db, itemId, userId);
}

async function deleteInventoryItem(db, itemId, userId) {
  return db.collection("inventory").deleteOne({
    _id: toMongoId(itemId),
    user_id: toMongoId(userId),
  });
}

function inventorySummary(items) {
  const totalQuantity = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const totalTransit = items.reduce((sum, item) => sum + Number(item.in_transit_quantity || 0), 0);
  const locations = new Set(items.map((item) => item.location_name));
  return {
    total_quantity: totalQuantity,
    total_in_transit: totalTransit,
    location_count: locations.size,
  };
}

module.exports = {
  createInventoryItem,
  deleteInventoryItem,
  fetchInventoryItem,
  inventoryPublic,
  inventorySummary,
  listInventory,
  updateInventoryItem,
};