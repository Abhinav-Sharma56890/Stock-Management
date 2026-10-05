import express from "express";
import { query, validationResult } from "express-validator";
import Transaction from "../models/Transaction.js";
import { protect } from "../middleware/auth.js";
import { ApiError } from "../middleware/errorHandler.js";

const router = express.Router();

// @route   GET /api/transactions
// @desc    Get all transactions for user
// @access  Private
router.get("/", protect, async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      type,
      stockName,
      startDate,
      endDate,
    } = req.query;

    const filter = { user: req.user._id };

    if (type) filter.type = type;
    if (stockName) filter.stockName = { $regex: stockName, $options: "i" };
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const transactions = await Transaction.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Transaction.countDocuments(filter);

    res.json({
      success: true,
      count: transactions.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      transactions,
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/transactions/:id
// @desc    Get single transaction
// @access  Private
router.get("/:id", protect, async (req, res, next) => {
  try {
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      user: req.user._id,
    });
    if (!transaction) {
      return next(new ApiError(404, "Transaction not found"));
    }
    res.json({ success: true, transaction });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/transactions/stats/summary
// @desc    Get transaction summary stats
// @access  Private
router.get("/stats/summary", protect, async (req, res, next) => {
  try {
    const transactions = await Transaction.find({ user: req.user._id });

    const buyTransactions = transactions.filter((t) => t.type === "BUY");
    const sellTransactions = transactions.filter((t) => t.type === "SELL");

    const totalBuyValue = buyTransactions.reduce(
      (sum, t) => sum + (t.totalAmount || 0),
      0,
    );
    const totalSellValue = sellTransactions.reduce(
      (sum, t) => sum + (t.totalAmount || 0),
      0,
    );
    const totalBuyQuantity = buyTransactions.reduce(
      (sum, t) => sum + t.quantity,
      0,
    );
    const totalSellQuantity = sellTransactions.reduce(
      (sum, t) => sum + t.quantity,
      0,
    );

    res.json({
      success: true,
      stats: {
        totalTransactions: transactions.length,
        buyCount: buyTransactions.length,
        sellCount: sellTransactions.length,
        totalBuyValue,
        totalSellValue,
        totalBuyQuantity,
        totalSellQuantity,
        netRealizedPL: totalSellValue - totalBuyValue,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
