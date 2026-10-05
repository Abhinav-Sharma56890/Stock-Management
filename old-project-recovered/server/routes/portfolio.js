import express from "express";
import { body, query, validationResult } from "express-validator";
import Portfolio from "../models/Portfolio.js";
import Transaction from "../models/Transaction.js";
import { protect } from "../middleware/auth.js";
import { ApiError } from "../middleware/errorHandler.js";

const router = express.Router();

// @route   GET /api/portfolio
// @desc    Get all stocks in user's portfolio
// @access  Private
router.get("/", protect, async (req, res, next) => {
  try {
    const { search, sort, filter } = req.query;
    let query = { user: req.user._id };

    if (search) {
      query.stockName = { $regex: search, $options: "i" };
    }

    let stocks = await Portfolio.find(query);

    if (filter === "profit") {
      stocks = stocks.filter((s) => s.profitLoss > 0);
    } else if (filter === "loss") {
      stocks = stocks.filter((s) => s.profitLoss < 0);
    }

    if (sort === "name") {
      stocks.sort((a, b) => a.stockName.localeCompare(b.stockName));
    } else if (sort === "profit") {
      stocks.sort((a, b) => b.profitLoss - a.profitLoss);
    } else if (sort === "quantity") {
      stocks.sort((a, b) => b.quantity - a.quantity);
    }

    res.json({ success: true, count: stocks.length, stocks });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/portfolio/dashboard
// @desc    Get portfolio dashboard with calculations
// @access  Private
router.get("/dashboard", protect, async (req, res, next) => {
  try {
    const stocks = await Portfolio.find({ user: req.user._id });

    const totalInvestment = stocks.reduce(
      (sum, s) => sum + s.totalInvestment,
      0,
    );
    const currentValue = stocks.reduce((sum, s) => sum + s.currentValue, 0);
    const totalProfitLoss = currentValue - totalInvestment;
    const profitLossPercent =
      totalInvestment > 0
        ? ((totalProfitLoss / totalInvestment) * 100).toFixed(2)
        : 0;

    const topPerformer =
      stocks.length > 0
        ? stocks.reduce(
            (max, s) => (s.profitLossPercent > max.profitLossPercent ? s : max),
            stocks[0],
          )
        : null;
    const worstPerformer =
      stocks.length > 0
        ? stocks.reduce(
            (min, s) => (s.profitLossPercent < min.profitLossPercent ? s : min),
            stocks[0],
          )
        : null;

    res.json({
      success: true,
      dashboard: {
        totalStocks: stocks.length,
        totalInvestment,
        currentValue,
        totalProfitLoss,
        profitLossPercent,
        topPerformer,
        worstPerformer,
      },
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/portfolio
// @desc    Add new stock to portfolio
// @access  Private
router.post(
  "/",
  protect,
  [
    body("stockName").trim().notEmpty().withMessage("Stock name is required"),
    body("quantity")
      .isInt({ min: 1 })
      .withMessage("Quantity must be at least 1"),
    body("buyPrice")
      .isFloat({ min: 0 })
      .withMessage("Buy price must be positive"),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return next(new ApiError(400, errors.array()[0].msg));
      }

      const {
        stockName,
        stockSymbol,
        quantity,
        buyPrice,
        currentPrice,
        notes,
      } = req.body;

      let stock = await Portfolio.findOne({ user: req.user._id, stockName });
      if (stock) {
        return next(
          new ApiError(
            400,
            "Stock already exists in portfolio. Use update instead.",
          ),
        );
      }

      stock = await Portfolio.create({
        user: req.user._id,
        stockName,
        stockSymbol,
        quantity,
        buyPrice,
        currentPrice: currentPrice || buyPrice,
        notes,
      });

      await Transaction.create({
        user: req.user._id,
        stockName,
        stockSymbol,
        type: "BUY",
        quantity,
        price: buyPrice,
        totalAmount: quantity * buyPrice,
        notes: `Added ${quantity} shares at ₹${buyPrice}`,
      });

      res
        .status(201)
        .json({ success: true, message: "Stock added to portfolio", stock });
    } catch (error) {
      next(error);
    }
  },
);

// @route   PUT /api/portfolio/:id
// @desc    Update stock quantity/price
// @access  Private
router.put(
  "/:id",
  protect,
  [
    body("quantity")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Quantity must be at least 1"),
    body("currentPrice")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("Price must be positive"),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return next(new ApiError(400, errors.array()[0].msg));
      }

      const stock = await Portfolio.findOne({
        _id: req.params.id,
        user: req.user._id,
      });
      if (!stock) {
        return next(new ApiError(404, "Stock not found in portfolio"));
      }

      const { quantity, currentPrice, notes } = req.body;
      const oldQuantity = stock.quantity;

      if (quantity !== undefined) stock.quantity = quantity;
      if (currentPrice !== undefined) stock.currentPrice = currentPrice;
      if (notes !== undefined) stock.notes = notes;

      await stock.save();

      if (quantity && quantity !== oldQuantity) {
        await Transaction.create({
          user: req.user._id,
          stockName: stock.stockName,
          stockSymbol: stock.stockSymbol,
          type: "UPDATE",
          quantity: quantity - oldQuantity,
          price: stock.currentPrice,
          notes: `Quantity updated from ${oldQuantity} to ${quantity}`,
        });
      }

      res.json({ success: true, message: "Stock updated", stock });
    } catch (error) {
      next(error);
    }
  },
);

// @route   DELETE /api/portfolio/:id
// @desc    Delete stock from portfolio
// @access  Private
router.delete("/:id", protect, async (req, res, next) => {
  try {
    const stock = await Portfolio.findOne({
      _id: req.params.id,
      user: req.user._id,
    });
    if (!stock) {
      return next(new ApiError(404, "Stock not found in portfolio"));
    }

    await stock.deleteOne();

    await Transaction.create({
      user: req.user._id,
      stockName: stock.stockName,
      stockSymbol: stock.stockSymbol,
      type: "DELETE",
      quantity: stock.quantity,
      price: stock.currentPrice,
      notes: "Stock removed from portfolio",
    });

    res.json({ success: true, message: "Stock deleted from portfolio" });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/portfolio/sell/:id
// @desc    Sell stock (partial or full)
// @access  Private
router.post(
  "/sell/:id",
  protect,
  [
    body("quantity")
      .isInt({ min: 1 })
      .withMessage("Quantity must be at least 1"),
    body("sellPrice")
      .isFloat({ min: 0 })
      .withMessage("Sell price must be positive"),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return next(new ApiError(400, errors.array()[0].msg));
      }

      const { quantity, sellPrice } = req.body;
      const stock = await Portfolio.findOne({
        _id: req.params.id,
        user: req.user._id,
      });
      if (!stock) {
        return next(new ApiError(404, "Stock not found in portfolio"));
      }

      if (quantity > stock.quantity) {
        return next(new ApiError(400, "Cannot sell more than owned"));
      }

      if (quantity === stock.quantity) {
        await stock.deleteOne();
      } else {
        stock.quantity -= quantity;
        await stock.save();
      }

      await Transaction.create({
        user: req.user._id,
        stockName: stock.stockName,
        stockSymbol: stock.stockSymbol,
        type: "SELL",
        quantity,
        price: sellPrice,
        totalAmount: quantity * sellPrice,
        notes: `Sold ${quantity} shares at ₹${sellPrice}`,
      });

      res.json({
        success: true,
        message: `Sold ${quantity} shares of ${stock.stockName}`,
        stock,
      });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
