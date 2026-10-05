const authRoutes = require("./authRoutes");
const dashboardRoutes = require("./dashboardRoutes");
const portfolioRoutes = require("./portfolioRoutes");
const profileRoutes = require("./profileRoutes");
const transactionRoutes = require("./transactionRoutes");
const inventoryRoutes = require("./inventoryRoutes");
const productRoutes = require("./productRoutes");
const analyticsRoutes = require("./analyticsRoutes");
const kpiRoutes = require("./kpiRoutes");
const salesAnalyticsRoutes = require("./salesAnalyticsRoutes");
const marketRoutes = require("./marketRoutes");
const { sendJson } = require("../middleware/httpMiddleware");

const routes = [
  ...authRoutes,
  ...profileRoutes,
  ...portfolioRoutes,
  ...dashboardRoutes,
  ...transactionRoutes,
  ...inventoryRoutes,
  ...productRoutes,
  ...analyticsRoutes,
  ...kpiRoutes,
  ...salesAnalyticsRoutes,
  ...marketRoutes,
];

function matchPath(routePath, pathname) {
  if (typeof routePath === "string") {
    return routePath === pathname ? {} : null;
  }
  const match = pathname.match(routePath);
  return match ? match.groups || {} : null;
}

async function routeApi(context) {
  const { req, res, url } = context;
  for (const route of routes) {
    if (route.method !== req.method) continue;
    const params = matchPath(route.path, url.pathname);
    if (!params) continue;
    return route.handler({ ...context, params });
  }
  return sendJson(res, 404, { error: "Endpoint not found." });
}

module.exports = {
  routeApi,
  routes,
};
