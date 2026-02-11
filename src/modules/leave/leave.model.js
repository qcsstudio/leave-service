const mongoose = require("mongoose");
const leaveSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },

  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },

  leaveType: String,
  fromDate: Date,
  toDate: Date,
  reason: String,

  attachmentUrl: String,

  status: {
    type: String,
    enum: ["PENDING", "APPROVED", "REJECTED"],
    default: "PENDING"
  },

  approvals: {
    tl: {
      status: {
        type: String,
        enum: ["PENDING", "APPROVED", "REJECTED"],
        default: "PENDING"
      },
      actionBy: mongoose.Schema.Types.ObjectId,
      actionDate: Date,
      remark: String
    },

    hr: {
      status: {
        type: String,
        enum: ["PENDING", "APPROVED", "REJECTED"],
        default: "PENDING"
      },
      actionBy: mongoose.Schema.Types.ObjectId,
      actionDate: Date,
      remark: String
    }
  }

}, { timestamps: true });


module.exports = mongoose.model("Leave", leaveSchema);
