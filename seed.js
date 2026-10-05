const { initDb, openDb, toMongoId } = require("./config/db");
const { hashPassword, verifyPassword } = require("./controllers/authController");
const userModel = require("./models/userModel");
const portfolioModel = require("./models/portfolioModel");
const transactionModel = require("./models/transactionModel");
const productModel = require("./models/productModel");
const inventoryModel = require("./models/inventoryModel");

async function createOrGetUser(db, userData) {
  let user = await userModel.findByEmail(db, userData.email);
  if (!user) {
    const userId = await userModel.createUser(db, {
      name: userData.name,
      email: userData.email,
      passwordHash: hashPassword(userData.password),
      createdAt: new Date().toISOString(),
    });
    user = await userModel.findById(db, userId);
    console.log(`Created user ${userData.email}`);
  } else {
    let updated = false;
    if (userData.name && user.name !== userData.name) {
      await userModel.updateProfile(db, user._id || user.id, {
        name: userData.name,
        email: userData.email,
      });
      updated = true;
    }
    if (userData.password && !verifyPassword(userData.password, user.password_hash)) {
      await userModel.updatePassword(db, user._id || user.id, hashPassword(userData.password));
      updated = true;
    }
    user = await userModel.findById(db, user._id || user.id);
    console.log(updated ? `Updated seeded user ${userData.email}` : `User already exists: ${userData.email}`);
  }
  return { ...user, id: String(user._id || user.id) };
}

async function ensureStock(db, userId, stock) {
  const exists = await db.collection("portfolio").findOne({
    user_id: toMongoId(userId),
    stock_name: stock.stockName,
  });
  if (!exists) {
    await portfolioModel.createStock(db, userId, {
      stockName: stock.stockName,
      quantity: stock.quantity,
      buyPrice: stock.buyPrice,
      currentPrice: stock.currentPrice,
      createdAt: stock.createdAt,
      updatedAt: stock.updatedAt,
    });
    console.log(`Added stock ${stock.stockName} for user ${String(userId)}`);
  } else {
    console.log(`Stock already exists for user: ${stock.stockName}`);
  }
}

async function ensureTransactions(db, userId, transactions) {
  const existing = await db.collection("transactions").countDocuments({ user_id: toMongoId(userId) });
  if (existing === 0) {
    for (const tx of transactions) {
      await transactionModel.recordTransaction(
        db,
        userId,
        tx.stockName,
        tx.type,
        tx.quantity,
        tx.price,
        tx.date
      );
    }
    console.log(`Added ${transactions.length} transactions for user ${String(userId)}`);
  } else {
    console.log(`Transactions already exist for user ${String(userId)} (${existing} records)`);
  }
}

async function ensureProduct(db, userId, product) {
  const exists = await db.collection("products").findOne({
    user_id: toMongoId(userId),
    sku: product.sku,
  });
  if (!exists) {
    const now = new Date().toISOString();
    await productModel.createProduct(db, userId, {
      productName: product.productName,
      sku: product.sku,
      description: product.description,
      unitPrice: product.unitPrice,
      category: product.category,
      createdAt: now,
      updatedAt: now,
    });
    console.log(`Added product ${product.productName} for user ${String(userId)}`);
  } else {
    console.log(`Product already exists for user: ${product.productName}`);
  }
}

async function ensureInventoryItem(db, userId, item) {
  const exists = await db.collection("inventory").findOne({
    user_id: toMongoId(userId),
    item_name: item.itemName,
    location_name: item.locationName,
  });
  if (!exists) {
    const now = new Date().toISOString();
    await inventoryModel.createInventoryItem(db, userId, {
      itemName: item.itemName,
      locationName: item.locationName,
      quantity: item.quantity,
      inTransitQuantity: item.inTransitQuantity,
      createdAt: now,
      updatedAt: now,
    });
    console.log(`Added inventory ${item.itemName} @ ${item.locationName} for user ${String(userId)}`);
  } else {
    console.log(`Inventory already exists for user: ${item.itemName} @ ${item.locationName}`);
  }
}

const seedUsers = [
  {
    name: "Abhinav Kumar Sharma",
    email: "abhinavsharma.30oct@gmail.com",
    password: "Password123!",
    stocks: [
      {
        stockName: "Reliance Industries",
        quantity: 12,
        buyPrice: 2600,
        currentPrice: 2750,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        stockName: "Tata Consultancy Services",
        quantity: 8,
        buyPrice: 3200,
        currentPrice: 3350,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    transactions: [
      {
        stockName: "Reliance Industries",
        type: "BUY",
        quantity: 12,
        price: 2600,
        date: new Date().toISOString(),
      },
      {
        stockName: "Tata Consultancy Services",
        type: "BUY",
        quantity: 8,
        price: 3200,
        date: new Date().toISOString(),
      },
    ],
    products: [
      {
        productName: "Wireless Mouse",
        sku: "WMS-1001",
        description: "Ergonomic wireless mouse with 2.4 GHz connectivity.",
        unitPrice: 899.0,
        category: "Electronics",
      },
      {
        productName: "USB-C Hub",
        sku: "UCH-2002",
        description: "7-in-1 USB-C hub with HDMI, USB 3.0 and SD card reader.",
        unitPrice: 2499.0,
        category: "Electronics",
      },
      {
        productName: "A4 Notebook",
        sku: "NTB-3003",
        description: "Premium 200-page A4 ruled notebook.",
        unitPrice: 149.0,
        category: "Stationery",
      },
    ],
    inventory: [
      {
        itemName: "Wireless Mouse",
        locationName: "Warehouse A",
        quantity: 42,
        inTransitQuantity: 8,
      },
      {
        itemName: "USB-C Hub",
        locationName: "Store Front",
        quantity: 18,
        inTransitQuantity: 4,
      },
      {
        itemName: "A4 Notebook",
        locationName: "Back Office",
        quantity: 95,
        inTransitQuantity: 20,
      },
    ],
  },
  {
    name: "Demo Investor",
    email: "demo@example.com",
    password: "Demo1234!",
    stocks: [
      {
        stockName: "HDFC Bank",
        quantity: 20,
        buyPrice: 1450,
        currentPrice: 1505,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        stockName: "Infosys",
        quantity: 15,
        buyPrice: 1350,
        currentPrice: 1410,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    transactions: [
      {
        stockName: "HDFC Bank",
        type: "BUY",
        quantity: 20,
        price: 1450,
        date: new Date().toISOString(),
      },
      {
        stockName: "Infosys",
        type: "BUY",
        quantity: 15,
        price: 1350,
        date: new Date().toISOString(),
      },
    ],
    products: [
      {
        productName: "Mechanical Keyboard",
        sku: "MEC-4004",
        description: "RGB backlit mechanical keyboard with blue switches.",
        unitPrice: 3499.0,
        category: "Electronics",
      },
      {
        productName: "Office Chair",
        sku: "OFC-5005",
        description: "Ergonomic mesh office chair with lumbar support.",
        unitPrice: 8999.0,
        category: "Furniture",
      },
    ],
    inventory: [
      {
        itemName: "Mechanical Keyboard",
        locationName: "Warehouse B",
        quantity: 14,
        inTransitQuantity: 3,
      },
      {
        itemName: "Office Chair",
        locationName: "Showroom",
        quantity: 6,
        inTransitQuantity: 2,
      },
    ],
  },
];

async function main() {
  const db = await initDb(await openDb());
  try {
    for (const userData of seedUsers) {
      const user = await createOrGetUser(db, userData);
      for (const stock of userData.stocks) {
        await ensureStock(db, user.id, stock);
      }
      await ensureTransactions(db, user.id, userData.transactions);
      for (const product of userData.products || []) {
        await ensureProduct(db, user.id, product);
      }
      for (const item of userData.inventory || []) {
        await ensureInventoryItem(db, user.id, item);
      }
    }

    console.log("Seed complete. Open MongoDB Compass and inspect the 'project' database.");
  } catch (error) {
    console.error("Failed to seed MongoDB:", error);
    process.exit(1);
  } finally {
    await db.close();
    }
}

if (require.main === module) {
  main();
}

module.exports = {
  createOrGetUser,
  ensureInventoryItem,
  ensureProduct,
  ensureStock,
  ensureTransactions,
  main,
  seedUsers,
};
