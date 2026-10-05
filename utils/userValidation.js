const NAME_MIN_LENGTH = 2;
const NAME_MAX_LENGTH = 40;
const EMAIL_MAX_LENGTH = 254;

function normalizeName(name) {
  return String(name || "").trim().replace(/\s+/g, " ");
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function validateName(name) {
  const normalized = normalizeName(name);
  if (normalized.length < NAME_MIN_LENGTH) {
    return `Name must be at least ${NAME_MIN_LENGTH} characters.`;
  }
  if (normalized.length > NAME_MAX_LENGTH) {
    return `Name cannot be more than ${NAME_MAX_LENGTH} characters.`;
  }
  if (!/^[A-Za-z][A-Za-z .'-]*$/.test(normalized)) {
    return "Name can only contain letters, spaces, apostrophes, periods, and hyphens.";
  }
  if (/([ .'-])\1/.test(normalized)) {
    return "Name cannot contain repeated special characters or extra spaces.";
  }
  return null;
}

function validateEmail(email) {
  const normalized = normalizeEmail(email);
  if (normalized.length > EMAIL_MAX_LENGTH) {
    return `Email cannot be more than ${EMAIL_MAX_LENGTH} characters.`;
  }
  if (/\s/.test(normalized)) {
    return "Email cannot contain spaces.";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return "Enter a valid email address.";
  }

  const [localPart, domain] = normalized.split("@");
  if (!localPart || !domain || normalized.split("@").length !== 2) {
    return "Enter a valid email address.";
  }
  if (localPart.length > 64 || localPart.startsWith(".") || localPart.endsWith(".")) {
    return "Enter a valid email address.";
  }
  if (normalized.includes("..")) {
    return "Email cannot contain consecutive dots.";
  }
  if (!/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(localPart)) {
    return "Email contains invalid characters before @.";
  }

  const labels = domain.split(".");
  if (
    labels.length < 2 ||
    labels.some((label) => !label || label.length > 63 || label.startsWith("-") || label.endsWith("-"))
  ) {
    return "Enter a valid email domain.";
  }
  if (!labels.every((label) => /^[a-z0-9-]+$/.test(label))) {
    return "Email domain can only contain letters, numbers, dots, and hyphens.";
  }
  if (!/^[a-z]{2,24}$/.test(labels.at(-1))) {
    return "Email domain extension is invalid.";
  }

  return null;
}

function validateUserInput({ name, email }) {
  return validateName(name) || validateEmail(email);
}

module.exports = {
  EMAIL_MAX_LENGTH,
  NAME_MAX_LENGTH,
  NAME_MIN_LENGTH,
  normalizeEmail,
  normalizeName,
  validateEmail,
  validateName,
  validateUserInput,
};

