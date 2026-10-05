import express from "express";
import { body, validationResult } from "express-validator";
import User from "../models/User.js";
import { protect } from "../middleware/auth.js";
import { ApiError } from "../middleware/errorHandler.js";

const router = express.Router();

// @route   GET /api/users/profile
// @desc    Get user profile
// @access  Private
router.get("/profile", protect, async (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      phone: req.user.phone,
      avatar: req.user.avatar,
      createdAt: req.user.createdAt,
    },
  });
});

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put(
  "/profile",
  protect,
  [
    body("name")
      .optional()
      .trim()
      .notEmpty()
      .withMessage("Name cannot be empty"),
    body("email")
      .optional()
      .isEmail()
      .withMessage("Please provide a valid email"),
    body("phone").optional().trim(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return next(new ApiError(400, errors.array()[0].msg));
      }

      const { name, email, phone } = req.body;
      const updateFields = {};

      if (name) updateFields.name = name;
      if (email) {
        const existingUser = await User.findOne({
          email,
          _id: { $ne: req.user._id },
        });
        if (existingUser) {
          return next(new ApiError(400, "Email already in use"));
        }
        updateFields.email = email;
      }
      if (phone !== undefined) updateFields.phone = phone;

      const user = await User.findByIdAndUpdate(req.user._id, updateFields, {
        new: true,
        runValidators: true,
      });

      res.json({
        success: true,
        message: "Profile updated",
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

// @route   PUT /api/users/password
// @desc    Change password
// @access  Private
router.put(
  "/password",
  protect,
  [
    body("currentPassword")
      .notEmpty()
      .withMessage("Current password is required"),
    body("newPassword")
      .isLength({ min: 6 })
      .withMessage("New password must be at least 6 characters"),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return next(new ApiError(400, errors.array()[0].msg));
      }

      const { currentPassword, newPassword } = req.body;
      const user = await User.findById(req.user._id).select("+password");

      const isMatch = await user.matchPassword(currentPassword);
      if (!isMatch) {
        return next(new ApiError(400, "Current password is incorrect"));
      }

      user.password = newPassword;
      await user.save();

      res.json({ success: true, message: "Password changed successfully" });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
