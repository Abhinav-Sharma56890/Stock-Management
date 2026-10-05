const { SESSION_COOKIE } = require("../config/env");
const sessionModel = require("../models/sessionModel");
const { httpError } = require("./httpMiddleware");

function parseCookies(cookieHeader = "") {
  return Object.fromEntries(
    cookieHeader
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf("=");
        return index === -1
          ? [part, ""]
          : [decodeURIComponent(part.slice(0, index)), decodeURIComponent(part.slice(index + 1))];
      })
  );
}

function getSessionToken(req) {
  return parseCookies(req.headers.cookie || "")[SESSION_COOKIE] || "";
}

function makeSessionCookie(token, clear = false) {
  const maxAge = clear ? 0 : 60 * 60 * 24 * 7;
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`;
}

async function currentUser(db, req) {
  const token = getSessionToken(req);
  if (!token) return null;
  return sessionModel.findUserByToken(db, token);
}

async function requireUser(db, req) {
  const user = await currentUser(db, req);
  if (!user) {
    throw httpError(401, "Authentication required.");
  }
  return user;
}

module.exports = {
  currentUser,
  getSessionToken,
  makeSessionCookie,
  parseCookies,
  requireUser,
};
