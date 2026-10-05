const { toMongoId } = require("../config/db");

async function createSession(db, { token, userId, createdAt }) {
  await db.collection("sessions").insertOne({
    token,
    user_id: toMongoId(userId),
    created_at: createdAt,
  });
}

async function deleteByToken(db, token) {
  await db.collection("sessions").deleteOne({ token });
}

async function deleteByUserId(db, userId) {
  await db.collection("sessions").deleteMany({ user_id: toMongoId(userId) });
}

async function findUserByToken(db, token) {
  const session = await db.collection("sessions").findOne({ token });
  if (!session) return null;
  return db.collection("users").findOne({ _id: session.user_id });
}

module.exports = {
  createSession,
  deleteByToken,
  deleteByUserId,
  findUserByToken,
};

