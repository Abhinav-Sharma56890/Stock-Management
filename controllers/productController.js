const { requireUser } = require("../middleware/authMiddleware");
const {
  asPositiveNumber,
  httpError,
  parseBody,
  sendJson,
  validateRequired,
} = require("../middleware/httpMiddleware");
const productModel = require("../models/productModel");
const transactionModel = require("../models/transactionModel");
const { utcNow } = require("./authController");

function productPayload(data) {
  return {
    productName: String(data.product_name || "").trim(),
    sku: String(data.sku || "").trim(),
    description: String(data.description || "").trim(),
    unitPrice: asPositiveNumber(data.unit_price, "Unit price"),
    category: String(data.category || "").trim(),
  };
}

async function listProducts({ db, req, res, url }) {
  const user = await requireUser(db, req);
  const search = String(url.searchParams.get("search") || "").trim();
  const category = String(url.searchParams.get("category") || "").trim();
  const products = await productModel.listProducts(db, user._id || user.id, search, category);
  return sendJson(res, 200, { products });
}

async function addProduct({ db, req, res }) {
  const user = await requireUser(db, req);
  const data = await parseBody(req);
  const error = validateRequired(data, ["product_name", "sku", "unit_price", "category"]);
  if (error) throw httpError(400, error);

  const payload = productPayload(data);
  if (!payload.productName) throw httpError(400, "Product name is required.");
  if (!payload.sku) throw httpError(400, "SKU/barcode is required.");
  if (!payload.category) throw httpError(400, "Category is required.");

  const now = utcNow();
  const product = await productModel.createProduct(db, user._id || user.id, {
    ...payload,
    createdAt: now,
    updatedAt: now,
  });

  return sendJson(res, 201, { message: "Product catalog item created.", product: productModel.productPublic(product) });
}

async function updateProduct({ db, req, res, params }) {
  const user = await requireUser(db, req);
  const productId = String(params.id || "").trim();
  if (!productId) throw httpError(400, "Invalid product id.");

  const data = await parseBody(req);
  const error = validateRequired(data, ["product_name", "sku", "unit_price", "category"]);
  if (error) throw httpError(400, error);

  const payload = productPayload(data);
  if (!payload.productName) throw httpError(400, "Product name is required.");
  if (!payload.sku) throw httpError(400, "SKU/barcode is required.");
  if (!payload.category) throw httpError(400, "Category is required.");

  const updated = await productModel.updateProduct(db, productId, user._id || user.id, {
    product_name: payload.productName,
    sku: payload.sku,
    description: payload.description,
    unit_price: payload.unitPrice,
    category: payload.category,
    updated_at: utcNow(),
  });
  if (!updated) return sendJson(res, 404, { error: "Product catalog item not found." });
  return sendJson(res, 200, { message: "Product catalog item updated.", product: productModel.productPublic(updated) });
}

async function deleteProduct({ db, req, res, params }) {
  const user = await requireUser(db, req);
  const productId = String(params.id || "").trim();
  if (!productId) throw httpError(400, "Invalid product id.");

  const result = await productModel.deleteProduct(db, productId, user._id || user.id);
  if (!result.deletedCount) return sendJson(res, 404, { error: "Product catalog item not found." });
  return sendJson(res, 200, { message: "Product catalog item removed." });
}

async function sellProduct({ db, req, res, params }) {
  const user = await requireUser(db, req);
  const body = await parseBody(req);
  const productId = String(params.id || body.id || "").trim();
  if (!productId) throw httpError(400, "Invalid product id.");

  const product = await productModel.fetchProduct(db, productId, user._id || user.id);
  if (!product) return sendJson(res, 404, { error: "Product not found." });

  const sellQuantity = asPositiveNumber(body.sell_quantity, "Sell quantity");
  const sellPrice = asPositiveNumber(body.sell_price, "Sell price");

  await transactionModel.recordTransaction(
    db,
    user._id || user.id,
    product.product_name,
    "SELL",
    sellQuantity,
    sellPrice,
    utcNow()
  );

  return sendJson(res, 200, { message: "Product sale recorded." });
}

module.exports = {
  addProduct,
  deleteProduct,
  listProducts,
  sellProduct,
  updateProduct,
};