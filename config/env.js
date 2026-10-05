const path = require("node:path");
const fs = require("node:fs");

const BASE_DIR = path.resolve(__dirname, "..");
const ENV_PATH = path.join(BASE_DIR, ".env");

function loadEnvFile() {
  if (!fs.existsSync(ENV_PATH)) return;

  const lines = fs.readFileSync(ENV_PATH, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;

    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim();
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadEnvFile();

function normalizeOptionalSetting(value, placeholders = []) {
  const trimmed = String(value || "").trim();
  return placeholders.includes(trimmed) ? "" : trimmed;
}

function parseBooleanSetting(value, defaultValue = false) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return defaultValue;
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return defaultValue;
}

module.exports = {
  BASE_DIR,
  STATIC_DIR: path.join(BASE_DIR, "static"),
  HOST: process.env.HOST || "127.0.0.1",
  PORT: Number(process.env.PORT || 8000),
  OPEN_BROWSER: parseBooleanSetting(process.env.OPEN_BROWSER, Boolean(process.env.VSCODE_PID)),
  MONGODB_URI: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017",
  MONGODB_DB_NAME: process.env.MONGODB_DB_NAME || "project",
  SESSION_COOKIE: "stock_session",
  PASSWORD_ITERATIONS: 260000,
  STOCK_API_KEY: normalizeOptionalSetting(process.env.STOCK_API_KEY, ["YOUR_API_KEY_HERE"]),
  SMTP_HOST: process.env.SMTP_HOST || "",
  SMTP_PORT: Number(process.env.SMTP_PORT || 587),
  SMTP_USER: process.env.SMTP_USER || "",
  SMTP_PASS: process.env.SMTP_PASS || "",
  SMTP_FROM: process.env.SMTP_FROM || "noreply@inventory360.local",
  OTP_EXPIRY_MINUTES: Number(process.env.OTP_EXPIRY_MINUTES || 10),
};
