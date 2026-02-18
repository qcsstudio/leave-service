const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    deviceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },

    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true
    },

    employeeCode: {
      type: String,
      required: true
    },

    timestamp: {
      type: Date,
      required: true
    },

    rawPayload: Object,

    processed: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("BiometricEvent", schema);
