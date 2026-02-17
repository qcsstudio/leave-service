const mongoose = require("mongoose");

const punchSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },

  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },

  attendanceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Attendance",
    required: true
  },

  punchIn: {
    type: Date,
    required: true
  },

  punchOut: Date,

  type: {
    type: String,
    enum: ["WORK", "BREAK"],
    default: "WORK"
  }

}, { timestamps: true });

module.exports = mongoose.model("Punch", punchSchema);
