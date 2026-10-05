const profileController = require("../controllers/profileController");

module.exports = [
  { method: "GET", path: "/api/me", handler: profileController.getProfile },
  { method: "PUT", path: "/api/me", handler: profileController.updateProfile },
  { method: "PUT", path: "/api/me/password", handler: profileController.changePassword },
];

