const { requireUser } = require("../middleware/authMiddleware");
const {
  asPositiveNumber,
  httpError,
  parseBody,
  sendJson,
  validateRequired,
} = require("../middleware/httpMiddleware");
const inventoryModel = require("../models/inventoryModel");
const { utcNow } = require("./authController");

function inventoryPayload(data) {
  return {
    itemName: String(data.item_name || "").trim(),
    locationName: String(data.location_name || "").trim(),
    quantity: asPositiveNumber(data.quantity, "Quantity", true),
    inTransitQuantity: asPositiveNumber(data.in_transit_quantity || 0, "In transit quantity", true),
  };
}

async function listInventory({ db, req, res, url }) {
  const user = await requireUser(db, req);
  const search = String(url.searchParams.get("search") || "").trim();
  const items = await inventoryModel.listInventory(db, user._id || user.id, search);
  return sendJson(res, 200, {
    summary: inventoryModel.inventorySummary(items),
    items,
  });
}

async function addInventoryItem({ db, req, res }) {
  const user = await requireUser(db, req);
  const data = await parseBody(req);
  const error = validateRequired(data, ["item_name", "location_name", "quantity"]);
  if (error) throw httpError(400, error);

  const payload = inventoryPayload(data);
  if (!payload.itemName) throw httpError(400, "Item name is required.");
  if (!payload.locationName) throw httpError(400, "Location name is required.");

  const now = utcNow();
  const item = await inventoryModel.createInventoryItem(db, user._id || user.id, {
    ...payload,
    createdAt: now,
    updatedAt: now,
  });

  return sendJson(res, 201, { message: "Inventory item added.", item: inventoryModel.inventoryPublic(item) });
}

async function updateInventoryItem({ db, req, res, params }) {
  const user = await requireUser(db, req);
  const itemId = String(params.id || "").trim();
  if (!itemId) throw httpError(400, "Invalid inventory id.");

  const data = await parseBody(req);
  const error = validateRequired(data, ["item_name", "location_name", "quantity"]);
  if (error) throw httpError(400, error);

  const payload = inventoryPayload(data);
  if (!payload.itemName) throw httpError(400, "Item name is required.");
  if (!payload.locationName) throw httpError(400, "Location name is required.");

  const updated = await inventoryModel.updateInventoryItem(db, itemId, user._id || user.id, {
    item_name: payload.itemName,
    location_name: payload.locationName,
    quantity: payload.quantity,
    in_transit_quantity: payload.inTransitQuantity,
    updated_at: utcNow(),
  });

  if (!updated) return sendJson(res, 404, { error: "Inventory item not found." });
  return sendJson(res, 200, { message: "Inventory item updated.", item: inventoryModel.inventoryPublic(updated) });
}

async function deleteInventoryItem({ db, req, res, params }) {
  const user = await requireUser(db, req);
  const itemId = String(params.id || "").trim();
  if (!itemId) throw httpError(400, "Invalid inventory id.");

  const result = await inventoryModel.deleteInventoryItem(db, itemId, user._id || user.id);
  if (!result.deletedCount) return sendJson(res, 404, { error: "Inventory item not found." });
  return sendJson(res, 200, { message: "Inventory item removed." });
}

module.exports = {
  addInventoryItem,
  deleteInventoryItem,
  listInventory,
  updateInventoryItem,
};