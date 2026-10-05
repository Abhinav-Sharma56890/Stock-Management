const { MONGODB_DB_NAME, MONGODB_URI } = require("./env");

function loadMongoDriver() {
  try {
    return require("mongodb");
  } catch (error) {
    const message = [
      "MongoDB driver is not installed.",
      "Run `npm install` before starting the server.",
      "If PowerShell blocks npm, run `npm.cmd install`.",
    ].join(" ");
    const installError = new Error(message);
    installError.cause = error;
    throw installError;
  }
}

async function openDb(uri = MONGODB_URI, dbName = MONGODB_DB_NAME) {
  const { MongoClient } = loadMongoDriver();
  const client = new MongoClient(uri);
  await client.connect();
  const database = client.db(dbName);

  return {
    client,
    database,
    collection(name) {
      return database.collection(name);
    },
    async close() {
      await client.close();
    },
  };
}

async function initDb(db) {
  await db.collection("users").createIndex({ email: 1 }, { unique: true });
  await db.collection("sessions").createIndex({ token: 1 }, { unique: true });
  await db.collection("sessions").createIndex({ user_id: 1 });
  await db.collection("portfolio").createIndex({ user_id: 1 });
  await db.collection("portfolio").createIndex({ stock_name: 1 });
  await db.collection("transactions").createIndex({ user_id: 1, date: -1 });
  await db.collection("products").createIndex({ user_id: 1, sku: 1 }, { unique: true });
  return db;
}

function toMongoId(id) {
  if (typeof id !== "string") return id;

  try {
    const { ObjectId } = loadMongoDriver();
    if (ObjectId.isValid(id)) return new ObjectId(id);
  } catch {
    return id;
  }

  return id;
}

module.exports = {
  initDb,
  openDb,
  toMongoId,
};
