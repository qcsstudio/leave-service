const mongoose = require("mongoose");

const regularizationSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },

  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },

  date: {
    type: Date,
    required: true
  },

  type: {
    type: String,
    enum: [
      "ADD_MISSING_PUNCH",
      "CORRECT_TIME",
      "ON_DUTY",
      "MARK_AS_PRESENT",
      "WORK_FROM_HOME"
    ],
    required: true
  },

  // For ADD_MISSING_PUNCH / CORRECT_TIME
  punchIn: Date,
  punchOut: Date,

  // For MARK_AS_PRESENT / ON_DUTY / WORK_FROM_HOME
  hours: { type: Number, default: 0 },
  minutes: { type: Number, default: 0 },
  mode: { type: String, default: null },  // e.g. "Full Day", "Half Day"

  reason: { type: String, default: null },
  note: { type: String, default: "" },
  attachmentUrl: { type: String, default: null },

  status: {
    type: String,
    enum: ["PENDING", "APPROVED", "REJECTED"],
    default: "PENDING"
  },

  actionBy: { type: mongoose.Schema.Types.ObjectId, default: null },
  actionDate: { type: Date, default: null },
  actionRemark: { type: String, default: "" }

}, { timestamps: true });

regularizationSchema.index({ companyId: 1, employeeId: 1, date: 1 });
regularizationSchema.index({ companyId: 1, status: 1 });

module.exports = mongoose.model("Regularization", regularizationSchema);
