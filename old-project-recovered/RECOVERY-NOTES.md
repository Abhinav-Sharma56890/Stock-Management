# Recovered older project snapshot

Restored from the earliest VS Code Local History snapshot available for each saved `client/` and `server/` file. Snapshot dates are included below. The current project files and database were left untouched.

This is a partial recovery: VS Code history only contained the files listed below; unsaved/untracked source files, assets, dependency manifests, and data from the older layout may be missing.

## Missing pieces found during inspection

The saved files refer to these files, but no VS Code history snapshot for them was available:

- `client/src/main.jsx` (referenced by `client/index.html`)
- `client/src/App.jsx` and `client/src/context/AuthContext.jsx` (needed by the saved client components)
- `server/models/Transaction.js` (imported by the saved portfolio and transaction routes)
- A server `package.json` and server environment configuration

The restored server also has a reference to `jwt` in `server/models/User.js` without a saved import. These gaps are recorded rather than filled with newly invented code, so this folder remains a recovery of saved history instead of a claimed exact reconstruction.

| File | Saved snapshot time |
| --- | --- |
| `client/src/pages/Dashboard.jsx` | 2026-04-22 05:19:46 |
| `server/middleware/auth.js` | 2026-04-22 05:14:59 |
| `server/middleware/errorHandler.js` | 2026-04-22 05:14:59 |
| `client/src/components/PrivateRoute.jsx` | 2026-04-22 05:19:46 |
| `server/routes/user.js` | 2026-04-22 05:14:59 |
| `client/src/components/Navbar.jsx` | 2026-04-22 05:19:46 |
| `client/package.json` | 2026-04-22 05:15:31 |
| `server/routes/auth.js` | 2026-04-22 05:14:59 |
| `client/src/index.css` | 2026-04-22 05:19:46 |
| `server/models/User.js` | 2026-04-22 05:14:59 |
| `server/index.js` | 2026-04-22 05:14:59 |
| `server/models/Portfolio.js` | 2026-04-22 05:14:59 |
| `client/index.html` | 2026-04-22 05:15:31 |
| `server/routes/portfolio.js` | 2026-04-22 05:14:59 |
| `server/routes/transaction.js` | 2026-04-22 05:14:59 |
