const authController = require("../controllers/authController");

module.exports = [
  { method: "POST", path: "/api/auth/signup", handler: authController.signup },
  { method: "POST", path: "/api/auth/login", handler: authController.login },
  { method: "POST", path: "/api/auth/social-login", handler: authController.socialLogin },
  { method: "POST", path: "/api/auth/forgot-password", handler: authController.forgotPassword },
  { method: "POST", path: "/api/auth/reset-password", handler: authController.resetPassword },
  { method: "POST", path: "/api/auth/logout", handler: authController.logout },
];

