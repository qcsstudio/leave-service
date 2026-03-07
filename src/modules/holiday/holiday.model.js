const mongoose = require("mongoose");

const holidaySchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },

  name: {
    type: String,
    required: true
  },

  date: {
    type: Date,
    required: true
  },

  type: {
    type: String,
    enum: ["FIXED", "REGIONAL", "OPTIONAL"],
    default: "FIXED"
  },

  description: {
    type: String,
    default: ""
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId
  }

}, { timestamps: true });

holidaySchema.index({ companyId: 1, date: 1 });

module.exports = mongoose.model("Holiday", holidaySchema);
