const mongoose = require("mongoose");

const leaveBalanceSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },

  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },

  year: {
    type: Number,
    required: true
  },

  balances: {
    annual: { total: { type: Number, default: 0 }, used: { type: Number, default: 0 } },
    sick: { total: { type: Number, default: 0 }, used: { type: Number, default: 0 } },
    casual: { total: { type: Number, default: 0 }, used: { type: Number, default: 0 } },
    compOff: { total: { type: Number, default: 0 }, used: { type: Number, default: 0 } }
  }

}, { timestamps: true });

leaveBalanceSchema.index(
  { companyId: 1, employeeId: 1, year: 1 },
  { unique: true }
);

module.exports = mongoose.model("LeaveBalance", leaveBalanceSchema);
