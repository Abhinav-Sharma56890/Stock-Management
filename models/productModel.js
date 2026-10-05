const { toMongoId } = require("../config/db");

function productPublic(row) {
  return {
    id: String(row._id || row.id),
    product_name: row.product_name,
    sku: row.sku,
    description: row.description,
    unit_price: row.unit_price,
    category: row.category,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function createProduct(db, userId, { productName, sku, description, unitPrice, category, createdAt, updatedAt }) {
  const result = await db.collection("products").insertOne({
    user_id: toMongoId(userId),
    product_name: productName,
    sku,
    description,
    unit_price: unitPrice,
    category,
    created_at: createdAt,
    updated_at: updatedAt,
  });
  return fetchProduct(db, result.insertedId, userId);
}

async function listProducts(db, userId, search = "", category = "") {
  const query = { user_id: toMongoId(userId) };
  const filters = [];
  if (search) {
    const term = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filters.push({ product_name: term });
    filters.push({ sku: term });
    filters.push({ description: term });
  }
  if (category) {
    query.category = String(category).trim();
  }
  if (filters.length) {
    query.$or = filters;
  }

  const rows = await db.collection("products").find(query).sort({ updated_at: -1 }).toArray();
  return rows.map(productPublic);
}

async function fetchProduct(db, productId, userId) {
  return db.collection("products").findOne({
    _id: toMongoId(productId),
    user_id: toMongoId(userId),
  });
}

async function updateProduct(db, productId, userId, update) {
  const result = await db.collection("products").updateOne(
    { _id: toMongoId(productId), user_id: toMongoId(userId) },
    { $set: update }
  );
  if (!result.matchedCount) return null;
  return fetchProduct(db, productId, userId);
}

async function deleteProduct(db, productId, userId) {
  return db.collection("products").deleteOne({
    _id: toMongoId(productId),
    user_id: toMongoId(userId),
  });
}

module.exports = {
  createProduct,
  deleteProduct,
  fetchProduct,
  listProducts,
  productPublic,
  updateProduct,
};