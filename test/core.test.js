const assert = require("node:assert/strict");
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const { createOrGetUser, seedUsers } = require("../seed");
const {
  createServer,
  hashPassword,
  initDb,
  listenWithPortFallback,
  stockPublic,
  verifyPassword,
} = require("../server");
const { FakeMongoDb } = require("./fakeMongo");

test("password hashes verify without storing plain text", () => {
  const stored = hashPassword("secret123");

  assert.equal(stored.includes("secret123"), false);
  assert.equal(verifyPassword("secret123", stored), true);
  assert.equal(verifyPassword("wrong", stored), false);
});

test("stockPublic calculates investment, value, and profit/loss", () => {
  const result = stockPublic({
    id: 1,
    stock_name: "Tata Consultancy Services",
    quantity: 10,
    buy_price: 100,
    current_price: 125,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  });

  assert.equal(result.investment, 1000);
  assert.equal(result.current_value, 1250);
  assert.equal(result.profit_loss, 250);
  assert.equal(result.profit_loss_percent, 25);
});

test("database initialization prepares required MongoDB collections", async () => {
  const db = await initDb(new FakeMongoDb());
  const collections = [...db.collections.keys()];

  assert.ok(collections.includes("users"));
  assert.ok(collections.includes("sessions"));
  assert.ok(collections.includes("portfolio"));
  assert.ok(collections.includes("transactions"));
  await db.close();
});

test("frontend app script parses successfully", () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "static", "app.js"), "utf8");
  assert.doesNotThrow(() => new vm.Script(source));
});

test("login page is configured for browser credential autofill", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "static", "index.html"), "utf8");

  assert.match(html, /<form id="login-form" class="form stack" autocomplete="on">/);
  assert.match(html, /name="email" type="email" autocomplete="username"/);
  assert.match(html, /name="password" type="password" autocomplete="current-password"/);
});

test("auth screen preserves browser autofill on normal startup", () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "static", "app.js"), "utf8");

  assert.match(source, /function showAuth\(clearLogin=false\)/);
  assert.match(source, /if\(clearLogin\)qs\("#login-form"\)\?\.reset\(\)/);
});

test("login errors are visible while the auth screen is open", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "static", "index.html"), "utf8");
  const authScreenStart = html.indexOf('<section id="auth-screen"');
  const appScreenStart = html.indexOf('<section id="app-screen"');
  const messagePosition = html.indexOf('id="message"');

  assert.ok(messagePosition >= 0, "a global message element should exist");
  assert.ok(messagePosition < authScreenStart, "the message should be visible before the auth screen");
  assert.ok(messagePosition < appScreenStart, "the message must not be inside the hidden app screen");
});

test("static assets disable browser caching", async () => {
  const db = await initDb(new FakeMongoDb());
  const server = createServer(db);
  const port = await new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server.address().port)));

  try {
    const res = await fetch(`http://127.0.0.1:${port}/app.js`);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("cache-control"), "no-store, no-cache, must-revalidate");
    assert.equal(res.headers.get("pragma"), "no-cache");
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await db.close();
  }
});

test("global investing and terminal routes serve the existing frontend shell", async () => {
  const db = await initDb(new FakeMongoDb());
  const server = createServer(db);
  const port = await new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server.address().port)));
  try {
    for (const pathName of ["/global-investing", "/terminal"]) {
      const response = await fetch(`http://127.0.0.1:${port}${pathName}`);
      const html = await response.text();
      assert.equal(response.status, 200);
      assert.match(html, /global-investing-page/);
      assert.match(html, /terminal-page/);
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await db.close();
  }
});

test("listenWithPortFallback advances once per occupied port and logs a single final URL", async () => {
  const occupied = http.createServer(() => {});
  await new Promise((resolve) => occupied.listen(0, "127.0.0.1", resolve));
  const occupiedPort = occupied.address().port;

  const server = http.createServer(() => {});
  const logs = [];

  try {
    const actualPort = await listenWithPortFallback(server, "127.0.0.1", occupiedPort, (message) => logs.push(message));
    assert.equal(actualPort, occupiedPort + 1);
    assert.deepEqual(logs, [
      `Port ${occupiedPort} is in use, trying ${occupiedPort + 1}...`,
      `Stock Portfolio Management System running at http://127.0.0.1:${occupiedPort + 1}`,
    ]);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await new Promise((resolve) => occupied.close(resolve));
  }
});

test("seed data includes a demo password and repairs stale seeded users", async () => {
  const demoUser = seedUsers.find((user) => user.email === "demo@example.com");
  assert.equal(demoUser?.password, "Demo1234!");
  const abhinavUser = seedUsers.find((user) => user.email === "abhinavsharma.30oct@gmail.com");
  assert.ok(abhinavUser?.inventory?.length > 0);

  const db = await initDb(new FakeMongoDb());
  await createOrGetUser(db, {
    name: "Demo Investor",
    email: "demo@example.com",
    password: "OldPassword1!",
  });
  await createOrGetUser(db, demoUser);

  const user = await db.collection("users").findOne({ email: "demo@example.com" });
  assert.equal(verifyPassword("Demo1234!", user.password_hash), true);
  assert.equal(verifyPassword("OldPassword1!", user.password_hash), false);
  await db.close();
});
