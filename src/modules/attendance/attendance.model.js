const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema({
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

  status: {
    type: String,
    enum: [
      "PRESENT",
      "LATE",
      "ABSENT",
      "LEAVE",
      "WEEK_OFF",
      "NOT_MARKED"
    ],
    default: "PRESENT"
  },

  workedMinutes: {
    type: Number,
    default: 0
  },

  breakMinutes: {
    type: Number,
    default: 0
  },

  firstPunchIn: Date,
  lastPunchOut: Date

}, { timestamps: true });

attendanceSchema.index(
  { companyId: 1, employeeId: 1, date: 1 },
  { unique: true }
);

module.exports = mongoose.model("Attendance", attendanceSchema);
