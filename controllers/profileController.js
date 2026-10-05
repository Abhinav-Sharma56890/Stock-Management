const { makeSessionCookie, requireUser } = require("../middleware/authMiddleware");
const { httpError, parseBody, sendJson, validateRequired } = require("../middleware/httpMiddleware");
const sessionModel = require("../models/sessionModel");
const userModel = require("../models/userModel");
const { hashPassword, verifyPassword } = require("./authController");
const { validateUserInput } = require("../utils/userValidation");

async function getProfile({ db, req, res }) {
  const user = await requireUser(db, req);
  return sendJson(res, 200, { user: userModel.userPublic(user) });
}

async function updateProfile({ db, req, res }) {
  const user = await requireUser(db, req);
  const data = await parseBody(req);
  const error = validateRequired(data, ["name", "email"]);
  if (error) throw httpError(400, error);

  const validationError = validateUserInput({ name: data.name, email: data.email });
  if (validationError) throw httpError(400, validationError);

  const updated = await userModel.updateProfile(db, user._id || user.id, data);
  return sendJson(res, 200, { message: "Profile updated.", user: userModel.userPublic(updated) });
}

async function changePassword({ db, req, res }) {
  const user = await requireUser(db, req);
  const data = await parseBody(req);
  const error = validateRequired(data, ["current_password", "new_password"]);
  if (error) throw httpError(400, error);
  if (String(data.new_password).length < 6) {
    throw httpError(400, "New password must be at least 6 characters.");
  }
  if (!verifyPassword(String(data.current_password), user.password_hash)) {
    return sendJson(res, 401, { error: "Current password is incorrect." });
  }

  await userModel.updatePassword(db, user._id || user.id, hashPassword(String(data.new_password)));
  await sessionModel.deleteByUserId(db, user._id || user.id);
  return sendJson(res, 200, { message: "Password changed. Please login again." }, {
    "Set-Cookie": makeSessionCookie("", true),
  });
}

module.exports = {
  changePassword,
  getProfile,
  updateProfile,
};
