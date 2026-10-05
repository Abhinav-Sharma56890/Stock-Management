function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(httpError(413, "Request body too large."));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(httpError(400, "Invalid JSON body."));
      }
    });
    req.on("error", reject);
  });
}

function sendJson(res, status, payload, headers = {}) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    ...headers,
  });
  res.end(body);
}

function validateRequired(data, fields) {
  for (const field of fields) {
    if (data[field] === undefined || String(data[field]).trim() === "") {
      return `${field.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())} is required.`;
    }
  }
  return null;
}

function asPositiveNumber(value, label, allowZero = false) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw httpError(400, `${label} must be a number.`);
  }
  if (allowZero ? number < 0 : number <= 0) {
    throw httpError(
      400,
      allowZero ? `${label} cannot be negative.` : `${label} must be greater than zero.`
    );
  }
  return number;
}

module.exports = {
  asPositiveNumber,
  httpError,
  parseBody,
  sendJson,
  validateRequired,
};

