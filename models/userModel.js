const { toMongoId } = require("../config/db");
const { normalizeEmail, normalizeName } = require("../utils/userValidation");

function userPublic(row) {
  return {
    id: String(row._id || row.id),
    name: row.name,
    email: row.email,
    created_at: row.created_at,
  };
}

async function createUser(db, { name, email, passwordHash, createdAt }) {
  const result = await db.collection("users").insertOne({
    name: normalizeName(name),
    email: normalizeEmail(email),
    password_hash: passwordHash,
    created_at: createdAt,
  });
  return result.insertedId;
}

async function findById(db, userId) {
  return db.collection("users").findOne({ _id: toMongoId(userId) });
}

async function findByEmail(db, email) {
  return db.collection("users").findOne({ email: normalizeEmail(email) });
}

async function listUsers(db) {
  return db.collection("users").find({}).sort({ created_at: 1, _id: 1 }).toArray();
}

async function updateProfile(db, userId, { name, email }) {
  await db.collection("users").updateOne(
    { _id: toMongoId(userId) },
    {
      $set: {
        name: normalizeName(name),
        email: normalizeEmail(email),
      },
    }
  );
  return findById(db, userId);
}

async function updatePassword(db, userId, passwordHash) {
  await db.collection("users").updateOne(
    { _id: toMongoId(userId) },
    {
      $set: { password_hash: passwordHash },
      $unset: { password: "" },
    }
  );
}

async function createPasswordResetToken(db, userId, token, expiresAt) {
  await db.collection("users").updateOne(
    { _id: toMongoId(userId) },
    {
      $set: {
        password_reset_token: token,
        password_reset_expires_at: expiresAt,
      },
    }
  );
}

async function findByPasswordResetToken(db, token) {
  return db.collection("users").findOne({
    password_reset_token: String(token).trim(),
    password_reset_expires_at: { $gt: new Date().toISOString() },
  });
}

async function clearPasswordResetToken(db, userId) {
  await db.collection("users").updateOne(
    { _id: toMongoId(userId) },
    {
      $unset: {
        password_reset_token: "",
        password_reset_expires_at: "",
      },
    }
  );
}

/* OTP helpers for email-based password reset */

async function createOtpReset(db, userId, otp, expiresAt) {
  await db.collection("users").updateOne(
    { _id: toMongoId(userId) },
    {
      $set: {
        password_reset_token: String(otp).trim(),
        password_reset_expires_at: expiresAt,
      },
    }
  );
}

async function findByOtp(db, email, otp) {
  return db.collection("users").findOne({
    email: normalizeEmail(email),
    password_reset_token: String(otp).trim(),
    password_reset_expires_at: { $gt: new Date().toISOString() },
  });
}

async function clearOtpReset(db, userId) {
  await db.collection("users").updateOne(
    { _id: toMongoId(userId) },
    {
      $unset: {
        password_reset_token: "",
        password_reset_expires_at: "",
      },
    }
  );
}

module.exports = {
  createUser,
  findByEmail,
  findById,
  listUsers,
  normalizeEmail,
  updatePassword,
  updateProfile,
  userPublic,
  createPasswordResetToken,
  findByPasswordResetToken,
  clearPasswordResetToken,
  createOtpReset,
  findByOtp,
  clearOtpReset,
};
