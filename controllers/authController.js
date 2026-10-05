const crypto = require("node:crypto");
const { PASSWORD_ITERATIONS, OTP_EXPIRY_MINUTES } = require("../config/env");
const { getSessionToken, makeSessionCookie } = require("../middleware/authMiddleware");
const { httpError, parseBody, sendJson, validateRequired } = require("../middleware/httpMiddleware");
const sessionModel = require("../models/sessionModel");
const userModel = require("../models/userModel");
const { validateEmail, validateUserInput } = require("../utils/userValidation");
const { sendOtpEmail } = require("../utils/emailService");

function utcNow() {
  return new Date().toISOString();
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const digest = crypto.pbkdf2Sync(
    password,
    salt,
    PASSWORD_ITERATIONS,
    32,
    "sha256"
  );
  return `pbkdf2_sha256$${PASSWORD_ITERATIONS}$${salt.toString("base64")}$${digest.toString("base64")}`;
}

function verifyPassword(password, storedHash) {
  try {
    const [algorithm, iterations, saltBase64, digestBase64] = storedHash.split("$");
    if (algorithm !== "pbkdf2_sha256") return false;
    const actual = crypto.pbkdf2Sync(
      password,
      Buffer.from(saltBase64, "base64"),
      Number(iterations),
      32,
      "sha256"
    );
    const expected = Buffer.from(digestBase64, "base64");
    return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

function verifyLegacyPassword(password, user) {
  if (!user) return false;

  if (typeof user.password === "string") {
    return password === user.password;
  }

  if (typeof user.password_hash === "string" && !user.password_hash.startsWith("pbkdf2_sha256$")) {
    return password === user.password_hash;
  }

  return false;
}

async function signup({ db, req, res }) {
  const data = await parseBody(req);
  const error = validateRequired(data, ["name", "email", "password"]);
  if (error) throw httpError(400, error);
  if (String(data.password).length < 6) {
    throw httpError(400, "Password must be at least 6 characters.");
  }
  const validationError = validateUserInput({ name: data.name, email: data.email });
  if (validationError) throw httpError(400, validationError);

  const token = crypto.randomBytes(32).toString("base64url");
  const now = utcNow();
  const userId = await userModel.createUser(db, {
    name: data.name,
    email: data.email,
    passwordHash: hashPassword(String(data.password)),
    createdAt: now,
  });
  await sessionModel.createSession(db, { token, userId, createdAt: now });
  const user = await userModel.findById(db, userId);

  return sendJson(res, 201, { message: "Signup successful.", user: userModel.userPublic(user) }, {
    "Set-Cookie": makeSessionCookie(token),
  });
}

async function login({ db, req, res }) {
  const data = await parseBody(req);

  const error = validateRequired(data, ["email", "password"]);
  if (error) throw httpError(400, error);

  let user = await userModel.findByEmail(db, data.email);
  const password = String(data.password);
  const valid = verifyPassword(password, user?.password_hash);
  const legacyValid = verifyLegacyPassword(password, user);
  if (!user || (!valid && !legacyValid)) {
    return sendJson(res, 401, { error: "Invalid email or password." });
  }

  if (legacyValid && !valid) {
    await userModel.updatePassword(db, user._id || user.id, hashPassword(password));
    user = await userModel.findById(db, user._id || user.id);
  }

  const token = crypto.randomBytes(32).toString("base64url");
  await sessionModel.createSession(db, { token, userId: user._id || user.id, createdAt: utcNow() });
  return sendJson(res, 200, { message: "Login successful.", user: userModel.userPublic(user) }, {
    "Set-Cookie": makeSessionCookie(token),
  });
}

async function forgotPassword({ db, req, res }) {
  const data = await parseBody(req);
  const error = validateRequired(data, ["email"]);
  if (error) throw httpError(400, error);

  const email = String(data.email).trim();
  const validationError = validateEmail(email);
  if (validationError) throw httpError(400, validationError);

  const user = await userModel.findByEmail(db, email);
  let deliveryInfo = null;
  if (user) {
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();
    await userModel.createOtpReset(db, user._id || user.id, otp, expiresAt);
    try {
      deliveryInfo = await sendOtpEmail(email, otp);
    } catch (err) {
      console.error("Failed to send OTP email:", err.message);
    }
  }

  const response = {
    message: "If your email is registered, an OTP has been sent.",
  };
  if (deliveryInfo?.previewOtp) {
    response.preview_otp = deliveryInfo.previewOtp;
    response.delivery_mode = "local";
  } else if (deliveryInfo?.previewUrl) {
    response.preview_url = deliveryInfo.previewUrl;
    response.delivery_mode = "test";
  } else if (deliveryInfo?.mode === "production") {
    response.delivery_mode = "production";
  }

  return sendJson(res, 200, response);
}

async function resetPassword({ db, req, res }) {
  const data = await parseBody(req);
  const error = validateRequired(data, ["email", "otp", "new_password", "confirm_password"]);
  if (error) throw httpError(400, error);

  const newPassword = String(data.new_password);
  const confirmPassword = String(data.confirm_password);
  if (newPassword !== confirmPassword) {
    throw httpError(400, "Passwords do not match.");
  }
  if (newPassword.length < 6) {
    throw httpError(400, "Password must be at least 6 characters.");
  }

  const user = await userModel.findByOtp(db, String(data.email).trim(), String(data.otp).trim());
  if (!user) {
    throw httpError(400, "Invalid or expired OTP.");
  }

  await userModel.updatePassword(db, user._id || user.id, hashPassword(newPassword));
  await userModel.clearOtpReset(db, user._id || user.id);

  return sendJson(res, 200, {
    message: "Password has been reset. Please log in with your new password.",
  });
}

async function socialLogin({ db, req, res }) {
  const data = await parseBody(req);
  const provider = String(data.provider || "").trim().toLowerCase();
  const providers = {
    google: { name: "Google User", email: "google-user@example.com" },
    github: { name: "GitHub User", email: "github-user@example.com" },
    apple: { name: "Apple User", email: "apple-user@example.com" },
  };

  const account = providers[provider];
  if (!account) throw httpError(400, "Unsupported social provider.");

  let user = await userModel.findByEmail(db, account.email);
  if (!user) {
    const token = crypto.randomBytes(32).toString("base64url");
    const now = utcNow();
    const userId = await userModel.createUser(db, {
      name: account.name,
      email: account.email,
      passwordHash: hashPassword(crypto.randomBytes(16).toString("hex")),
      createdAt: now,
    });
    user = await userModel.findById(db, userId);
  }

  const sessionToken = crypto.randomBytes(32).toString("base64url");
  await sessionModel.createSession(db, {
    token: sessionToken,
    userId: user._id || user.id,
    createdAt: utcNow(),
  });

  return sendJson(res, 200, {
    message: `Logged in with ${provider}.`,
    user: userModel.userPublic(user),
  }, {
    "Set-Cookie": makeSessionCookie(sessionToken),
  });
}

async function logout({ db, req, res }) {
  const token = getSessionToken(req);
  if (token) {
    await sessionModel.deleteByToken(db, token);
  }
  return sendJson(res, 200, { message: "Logged out." }, {
    "Set-Cookie": makeSessionCookie("", true),
  });
}

module.exports = {
  hashPassword,
  login,
  logout,
  signup,
  forgotPassword,
  resetPassword,
  socialLogin,
  utcNow,
  verifyPassword,
};
