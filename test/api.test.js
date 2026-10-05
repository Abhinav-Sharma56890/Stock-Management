const assert = require("node:assert/strict");
const test = require("node:test");
const { createServer, initDb } = require("../server");
const { createOrGetUser, seedUsers } = require("../seed");
const { FakeMongoDb } = require("./fakeMongo");

function listen(server) {
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve(server.address().port));
  });
}

function close(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

test("portfolio API supports signup, add, dashboard, and history", async () => {
  const db = await initDb(new FakeMongoDb());
  const server = createServer(db);
  const port = await listen(server);
  const baseUrl = `http://127.0.0.1:${port}`;
  let cookie = "";

  async function request(path, options = {}) {
    const response = await fetch(`${baseUrl}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...(cookie ? { Cookie: cookie } : {}),
        ...(options.headers || {}),
      },
      ...options,
    });
    const setCookie = response.headers.get("set-cookie");
    if (setCookie) cookie = setCookie.split(";")[0];
    const payload = await response.json();
    assert.equal(response.ok, true, payload.error);
    return payload;
  }

  try {
    const signup = await request("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        name: "Student User",
        email: "student@example.com",
        password: "secret123",
      }),
    });
    assert.equal(signup.user.email, "student@example.com");

    const added = await request("/api/portfolio", {
      method: "POST",
      body: JSON.stringify({
        stock_name: "Reliance Industries",
        quantity: 10,
        buy_price: 100,
        current_price: 125,
      }),
    });
    assert.equal(added.stock.profit_loss, 250);

    const dashboard = await request("/api/dashboard");
    assert.equal(dashboard.summary.total_investment, 1000);
    assert.equal(dashboard.summary.current_value, 1250);
    assert.equal(dashboard.summary.profit_loss, 250);

    const portfolio = await request("/api/portfolio");
    assert.equal(portfolio.stocks[0].quantity, 10);

    const history = await request("/api/transactions");
    assert.equal(history.transactions.length, 1);
    assert.equal(history.transactions[0].type, "BUY");
  } finally {
    await close(server);
    await db.close();
  }
});

test("seeded account credentials can log in and create an authenticated session", async () => {
  const db = await initDb(new FakeMongoDb());
  const server = createServer(db);
  const port = await listen(server);
  const seededUser = seedUsers.find((user) => user.email === "abhinavsharma.30oct@gmail.com");

  try {
    await createOrGetUser(db, seededUser);

    const response = await fetch(`http://127.0.0.1:${port}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: seededUser.email,
        password: seededUser.password,
      }),
    });
    const payload = await response.json();

    assert.equal(response.status, 200, payload.error);
    assert.equal(payload.user.email, seededUser.email);
    assert.match(response.headers.get("set-cookie") || "", /^stock_session=/);
  } finally {
    await close(server);
    await db.close();
  }
});

test("stock search returns fast ranked global suggestions for partial queries", async () => {
  const db = await initDb(new FakeMongoDb());
  const server = createServer(db);
  const port = await listen(server);

  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/stock-search?query=ma`);
    const payload = await response.json();
    const names = payload.results.map((item) => item.name);

    assert.equal(response.status, 200);
    assert.ok(payload.results.length >= 3, "partial search should return several matches");
    assert.ok(names.includes("Mahindra & Mahindra"));
    assert.ok(names.includes("Maruti Suzuki"));
    assert.ok(names.includes("Mastercard"));
    assert.ok(payload.results.length <= 12, "results should be capped for a responsive menu");

    const singleCharacter = await fetch(`http://127.0.0.1:${port}/api/stock-search?query=m`);
    const singleCharacterPayload = await singleCharacter.json();
    assert.ok(singleCharacterPayload.results.length > 0, "single-character search should work");
    assert.ok(singleCharacterPayload.results.some((item) => item.market === "United States"));
  } finally {
    await close(server);
    await db.close();
  }
});

test("market quotes validate input and return clearly labelled delayed fallback data", async () => {
  const db = await initDb(new FakeMongoDb());
  const server = createServer(db);
  const port = await listen(server);
  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/market/quotes?symbols=AAPL,NVDA`);
    const payload = await response.json();
    assert.equal(response.status, 200);
    assert.equal(payload.quotes.length, 2);
    assert.equal(payload.quotes[0].delayed, true);
    assert.equal(typeof payload.quotes[0].price, "number");
    const invalid = await fetch(`http://127.0.0.1:${port}/api/market/quotes?symbols=AAPL,not-valid!`);
    assert.equal(invalid.status, 400);
  } finally {
    await close(server);
    await db.close();
  }
});

test("portfolio by email returns grouped stock data and prior BUY history", async () => {
  const db = await initDb(new FakeMongoDb());
  const server = createServer(db);
  const port = await listen(server);
  const baseUrl = `http://127.0.0.1:${port}`;
  let cookie = "";

  async function request(path, options = {}) {
    const response = await fetch(`${baseUrl}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...(cookie ? { Cookie: cookie } : {}),
        ...(options.headers || {}),
      },
      ...options,
    });
    const setCookie = response.headers.get("set-cookie");
    if (setCookie) cookie = setCookie.split(";")[0];
    const payload = await response.json();
    assert.equal(response.ok, true, payload.error);
    return payload;
  }

  try {
    await request("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        name: "Student User",
        email: "student@example.com",
        password: "secret123",
      }),
    });

    await request("/api/portfolio", {
      method: "POST",
      body: JSON.stringify({
        stock_name: "Reliance Industries",
        quantity: 10,
        buy_price: 100,
        current_price: 125,
      }),
    });

    await request("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        name: "Second User",
        email: "second@example.com",
        password: "secret123",
      }),
    });

    await request("/api/portfolio", {
      method: "POST",
      body: JSON.stringify({
        stock_name: "Infosys",
        quantity: 5,
        buy_price: 200,
        current_price: 240,
      }),
    });

    const grouped = await request("/api/portfolio/by-email");
    assert.equal(grouped.portfolios.length, 2);

    const student = grouped.portfolios.find((item) => item.email === "student@example.com");
    const second = grouped.portfolios.find((item) => item.email === "second@example.com");

    assert.equal(student.stocks.length, 1);
    assert.equal(student.stocks[0].stock_name, "Reliance Industries");
    assert.equal(student.added_stock_history.length, 1);
    assert.equal(student.added_stock_history[0].type, "BUY");

    assert.equal(second.stocks.length, 1);
    assert.equal(second.stocks[0].stock_name, "Infosys");
    assert.equal(second.added_stock_history.length, 1);
    assert.equal(second.added_stock_history[0].type, "BUY");
  } finally {
    await close(server);
    await db.close();
  }
});

test("forgot password endpoint returns success for registered email", async () => {
  const db = await initDb(new FakeMongoDb());
  const server = createServer(db);
  const port = await listen(server);
  const baseUrl = `http://127.0.0.1:${port}`;

  async function request(path, options = {}) {
    const response = await fetch(`${baseUrl}${path}`, {
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      ...options,
    });
    const payload = await response.json();
    assert.equal(response.ok, true, payload.error);
    return payload;
  }

  try {
    await request("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        name: "Student User",
        email: "student@example.com",
        password: "secret123",
      }),
    });

    const forgot = await request("/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email: "student@example.com" }),
    });
    assert.equal(forgot.message, "If your email is registered, an OTP has been sent.");

    const user = await db.collection("users").findOne({ email: "student@example.com" });
    assert.ok(user.password_reset_token, "OTP should be generated");
    assert.ok(user.password_reset_expires_at, "OTP expiry should be set");

    const reset = await request("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({
        email: "student@example.com",
        otp: user.password_reset_token,
        new_password: "newsecret456",
        confirm_password: "newsecret456",
      }),
    });
    assert.equal(reset.message, "Password has been reset. Please log in with your new password.");

    const login = await request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "student@example.com", password: "newsecret456" }),
    });
    assert.equal(login.user.email, "student@example.com");
  } finally {
    await close(server);
    await db.close();
  }
});

test("login upgrades legacy password records", async () => {
  const db = await initDb(new FakeMongoDb());
  const server = createServer(db);
  const port = await listen(server);
  const baseUrl = `http://127.0.0.1:${port}`;

  async function request(path, options = {}) {
    const response = await fetch(`${baseUrl}${path}`, {
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      ...options,
    });
    const payload = await response.json();
    assert.equal(response.ok, true, payload.error);
    return payload;
  }

  try {
    await db.collection("users").insertOne({
      name: "Legacy User",
      email: "legacy@example.com",
      password: "legacy123",
      created_at: new Date().toISOString(),
    });

    const login = await request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "legacy@example.com", password: "legacy123" }),
    });
    assert.equal(login.user.email, "legacy@example.com");

    const upgradedUser = await db.collection("users").findOne({ email: "legacy@example.com" });
    assert.ok(
      String(upgradedUser.password_hash || "").startsWith("pbkdf2_sha256$"),
      "legacy user should be upgraded to a PBKDF2 password hash"
    );
    assert.equal("password" in upgradedUser, false);
  } finally {
    await close(server);
    await db.close();
  }
});

test("inventory API tracks live counts across locations", async () => {
  const db = await initDb(new FakeMongoDb());
  const server = createServer(db);
  const port = await listen(server);
  const baseUrl = `http://127.0.0.1:${port}`;
  let cookie = "";

  async function request(path, options = {}) {
    const response = await fetch(`${baseUrl}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...(cookie ? { Cookie: cookie } : {}),
        ...(options.headers || {}),
      },
      ...options,
    });
    const setCookie = response.headers.get("set-cookie");
    if (setCookie) cookie = setCookie.split(";")[0];
    const payload = await response.json();
    assert.equal(response.ok, true, payload.error);
    return payload;
  }

  try {
    await request("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        name: "Inventory User",
        email: "inventory@example.com",
        password: "secret123",
      }),
    });

    await request("/api/inventory", {
      method: "POST",
      body: JSON.stringify({
        item_name: "Widget A",
        location_name: "Warehouse 1",
        quantity: 50,
        in_transit_quantity: 5,
      }),
    });

    await request("/api/inventory", {
      method: "POST",
      body: JSON.stringify({
        item_name: "Widget A",
        location_name: "Store 2",
        quantity: 20,
        in_transit_quantity: 2,
      }),
    });

    const inventory = await request("/api/inventory");
    assert.equal(inventory.summary.total_quantity, 70);
    assert.equal(inventory.summary.total_in_transit, 7);
    assert.equal(inventory.summary.location_count, 2);
    assert.equal(inventory.items.length, 2);
  } finally {
    await close(server);
    await db.close();
  }
});

test("product catalog API supports add, list, update, and delete", async () => {
  const db = await initDb(new FakeMongoDb());
  const server = createServer(db);
  const port = await listen(server);
  const baseUrl = `http://127.0.0.1:${port}`;
  let cookie = "";

  async function request(path, options = {}) {
    const response = await fetch(`${baseUrl}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...(cookie ? { Cookie: cookie } : {}),
        ...(options.headers || {}),
      },
      ...options,
    });
    const setCookie = response.headers.get("set-cookie");
    if (setCookie) cookie = setCookie.split(";")[0];
    const payload = await response.json();
    assert.equal(response.ok, true, payload.error);
    return payload;
  }

  try {
    await request("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        name: "Catalog User",
        email: "catalog@example.com",
        password: "secret123",
      }),
    });

    const add = await request("/api/products", {
      method: "POST",
      body: JSON.stringify({
        product_name: "Widget A",
        sku: "WID-1001",
        description: "A useful widget.",
        unit_price: 99.95,
        category: "Hardware",
      }),
    });
    assert.equal(add.product.product_name, "Widget A");
    assert.equal(add.product.sku, "WID-1001");

    const list = await request("/api/products");
    assert.equal(list.products.length, 1);
    assert.equal(list.products[0].category, "Hardware");

    const updated = await request(`/api/products/${add.product.id}`, {
      method: "PUT",
      body: JSON.stringify({
        product_name: "Widget A+",
        sku: "WID-1001",
        description: "Updated widget description.",
        unit_price: 109.95,
        category: "Hardware",
      }),
    });
    assert.equal(updated.product.product_name, "Widget A+");
    assert.equal(updated.product.unit_price, 109.95);

    await request(`/api/products/${add.product.id}`, { method: "DELETE" });
    const afterDelete = await request("/api/products");
    assert.equal(afterDelete.products.length, 0);
  } finally {
    await close(server);
    await db.close();
  }
});

test("social login endpoint allows provider login", async () => {
  const db = await initDb(new FakeMongoDb());
  const server = createServer(db);
  const port = await listen(server);
  const baseUrl = `http://127.0.0.1:${port}`;

  async function request(path, options = {}) {
    const response = await fetch(`${baseUrl}${path}`, {
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      ...options,
    });
    const payload = await response.json();
    assert.equal(response.ok, true, payload.error);
    return payload;
  }

  try {
    const social = await request("/api/auth/social-login", {
      method: "POST",
      body: JSON.stringify({ provider: "google" }),
    });
    assert.equal(social.user.email, "google-user@example.com");
    assert.equal(social.user.name, "Google User");
  } finally {
    await close(server);
    await db.close();
  }
});
