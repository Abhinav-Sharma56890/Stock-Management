# Stock Portfolio Management System

A self-contained web application for managing stock investments. It includes user authentication, profile management, portfolio CRUD operations, dashboard profit/loss analytics, transaction history, search, and profit/loss filters.

## Tech Stack

- Backend: Node.js standard library HTTP server
- Database: MongoDB
- Frontend: HTML, CSS, JavaScript
- Authentication: Session tokens with PBKDF2 password hashing

Uses the official MongoDB Node.js driver.

## Setup

Install dependencies:

```powershell
npm install
```

Make sure MongoDB is running locally, or update `.env` with your MongoDB Atlas connection string:

```text
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DB_NAME=project
```

If you use MongoDB Compass, create a new connection named `project`:

- Connection String: `mongodb://127.0.0.1:27017`
- Connection Name: `project`
- Database Name: `project`

After the app runs, the following collections are updated automatically:

- `users` — account profiles and user email/password data
- `sessions` — active login sessions
- `portfolio` — each user's stocks and current prices
- `transactions` — buy/sell history and portfolio activity

To seed sample users and portfolio data for Compass, run:

```powershell
npm run seed
```

The seeded accounts can then sign in with:

- `abhinavsharma.30oct@gmail.com` / `Password123!`
- `demo@example.com` / `Demo1234!`

Running the seed command again safely restores the documented password for these demo accounts and retains their existing portfolio records.

Then start the app and open `http://127.0.0.1:8000`.

## Run The App

```powershell
npm run dev
```

Open:

```text
http://127.0.0.1:8000
```

MongoDB creates the `stock_portfolio` database and collections automatically on first use.

## Run Tests

```powershell
npm test
```

If PowerShell blocks `npm`, use `npm.cmd install`, `npm.cmd run dev`, `npm.cmd start`, or `npm.cmd test`.

## Project Structure

```text
stock/
  config/
    db.js
    env.js
  controllers/
    authController.js
    dashboardController.js
    portfolioController.js
    profileController.js
    transactionController.js
  middleware/
    authMiddleware.js
    httpMiddleware.js
  models/
    portfolioModel.js
    sessionModel.js
    transactionModel.js
    userModel.js
  routes/
    authRoutes.js
    dashboardRoutes.js
    portfolioRoutes.js
    profileRoutes.js
    transactionRoutes.js
  static/
    index.html
    styles.css
    app.js
  test/
    api.test.js
    core.test.js
    run-tests.js
  .env
  .gitignore
  package-lock.json
  package.json
  server.js
```

## Features

- Signup, login, logout
- Secure password storage using salted PBKDF2 hashes
- View and edit profile
- Change password
- Add, sell, update, and delete stocks
- Dashboard with total investment, current value, and profit/loss
- Individual stock performance
- Transaction history for buy, sell, update, and delete operations
- Search stocks by name
- Filter portfolio by profit, loss, or neutral positions
- Global Investing public page at `/global-investing` with a local, illustrative return simulator and mobile onboarding validation
- Global market explorer with region filters, delayed quote cards, cancellable search, and terminal handoff for worldwide symbols
- Demo Trading Terminal at `/terminal` with client-side watchlists, sandbox orders, chart controls, depth and option-chain panels persisted in browser localStorage
- `GET /api/market/quotes?symbols=AAPL,NVDA` provides delayed public quotes when `STOCK_API_KEY` is configured, with deterministic labelled fallback quotes if it is not
- `GET /api/stock-search?query=Toyota` searches the local global symbol index and supplements it with Alpha Vantage symbol matches when `STOCK_API_KEY` is configured

## Global Investing and Terminal

The new experiences are additive and require no account to preview:

- Open `/global-investing` for the Vertex Invest public discovery page. Its onboarding form validates Indian 10-digit mobile numbers locally and never creates or changes an account.
- Open `/terminal` for a clearly marked sandbox. Watchlist entries, layout choices, and simulated orders are saved only in the browser's `localStorage`; no order is sent to a broker or stored in the portfolio database.
- Quote rail data is always labelled delayed. If `STOCK_API_KEY` is configured, the safe server endpoint requests Alpha Vantage with a 3-second timeout and 60-second in-memory cache. Without a key, on timeout, or when data is unavailable, it returns deterministic seed prices with `source: "fallback"` and `delayed: true` so the UI stays usable without presenting it as live data.

For example:

```text
GET /api/market/quotes?symbols=AAPL,NVDA
```

The endpoint accepts one to eight comma-separated ticker symbols containing only letters and dots. It returns `400` for invalid input and never exposes the configured API key.

## MongoDB Collections

- `users`: stores account and profile data
- `sessions`: stores active login sessions
- `portfolio`: stores each user's stock holdings
- `transactions`: stores portfolio activity history
