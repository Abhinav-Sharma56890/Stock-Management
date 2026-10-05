const { requireUser } = require("../middleware/authMiddleware");
const { sendJson } = require("../middleware/httpMiddleware");
const kpiModel = require("../models/kpiModel");

async function getKpis({ db, req, res }) {
  const user = await requireUser(db, req);
  const userId = user._id || user.id;

  const kpis = await kpiModel.getKpis(db, userId);

  return sendJson(res, 200, kpis);
}

module.exports = {
  getKpis,
};

