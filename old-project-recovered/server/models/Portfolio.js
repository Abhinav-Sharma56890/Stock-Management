import mongoose from "mongoose";

const portfolioSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    stockName: {
      type: String,
      required: [true, "Stock name is required"],
      trim: true,
    },
    stockSymbol: {
      type: String,
      uppercase: true,
      trim: true,
      default: "",
    },
    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      min: [1, "Quantity must be at least 1"],
    },
    buyPrice: {
      type: Number,
      required: [true, "Buy price is required"],
      min: [0, "Buy price cannot be negative"],
    },
    currentPrice: {
      type: Number,
      default: function () {
        return this.buyPrice;
      },
    },
    notes: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  },
);

// Compound index for user and stock
portfolioSchema.index({ user: 1, stockName: 1 }, { unique: true });

// Virtual for total investment
portfolioSchema.virtual("totalInvestment").get(function () {
  return this.quantity * this.buyPrice;
});

// Virtual for current value
portfolioSchema.virtual("currentValue").get(function () {
  return this.quantity * this.currentPrice;
});

// Virtual for profit/loss
portfolioSchema.virtual("profitLoss").get(function () {
  return this.currentValue - this.totalInvestment;
});

// Virtual for profit/loss percentage
portfolioSchema.virtual("profitLossPercent").get(function () {
  if (this.totalInvestment === 0) return 0;
  return ((this.profitLoss / this.totalInvestment) * 100).toFixed(2);
});

// Ensure virtuals are included in JSON
portfolioSchema.set("toJSON", { virtuals: true });
portfolioSchema.set("toObject", { virtuals: true });

const Portfolio = mongoose.model("Portfolio", portfolioSchema);
export default Portfolio;
