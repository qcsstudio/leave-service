const mongoose = require("mongoose");

const deviceSchema = new mongoose.Schema({

  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },

  name: {
    type: String,
    required: true
  },

  vendor: String,

  deviceType: {
    type: String,
    enum: ["FINGERPRINT", "FACE", "RFID"],
    required: true
  },

  connectionMode: {
    type: String,
    enum: ["LAN", "CLOUD", "WEBHOOK"],
    required: true
  },

  ipAddress: String,
  port: Number,

  apiKey: {
    type: String,
    unique: true
  },

  locationId: mongoose.Schema.Types.ObjectId,

  isActive: {
    type: Boolean,
    default: true
  }

}, { timestamps: true });

module.exports = mongoose.model("BiometricDevice", deviceSchema);
