const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },

  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },

  title: String,

  message: String,

  type: {
    type: String,
    default: "HOLIDAY"
  },

  isRead: {
    type: Boolean,
    default: false
  }

}, { timestamps: true });

module.exports = mongoose.model("Notification", notificationSchema);