const Leave = require("./leave.model");


exports.applyLeave = async (req, res) => {
  try {
    const { leaveType, fromDate, toDate, reason } = req.body;

    const role = req.user.role;

    let approvals = {};

    // If EMPLOYEE applies
    if (role === "EMPLOYEE") {
      approvals = {
        tl: { status: "PENDING" },
        hr: { status: "PENDING" }
      };
    }

    // If TL applies
    if (role === "TL") {
      approvals = {
        tl: { status: "APPROVED" },
        hr: { status: "PENDING" }
      };
    }

    const leave = await Leave.create({
      companyId: req.user.companyId,
      employeeId: req.user.id,
      leaveType,
      fromDate,
      toDate,
      reason,
      attachmentUrl: req.file?.location || null,
      approvals
    });

    res.status(201).json({
      message: "Leave applied successfully",
      leave,
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


exports.takeAction = async (req, res) => {
  try {
    const { leaveId } = req.params;
    const { action } = req.body; // ONLY action now

    if (!["APPROVED", "REJECTED"].includes(action)) {
      return res.status(400).json({ message: "Invalid action" });
    }

    const leave = await Leave.findOne({
      _id: leaveId,
      companyId: req.user.companyId
    });

    if (!leave) {
      return res.status(404).json({ message: "Leave not found" });
    }

    const role = req.user.role;

    // 🔹 TL action
    if (role === "TL") {
      if (leave.approvals.tl.status !== "PENDING") {
        return res.status(400).json({ message: "Already acted by TL" });
      }

      leave.approvals.tl.status = action;
      leave.approvals.tl.actionBy = req.user.id; // Who approved
      leave.approvals.tl.actionDate = new Date();
      leave.approvals.tl.remark = action === "APPROVED" ? "Approved by TL" : "Rejected by TL";

      if (action === "REJECTED") leave.status = "REJECTED";
    }

    // 🔹 HR action
    else if (role === "HR") {
      if (leave.approvals.hr.status !== "PENDING") {
        return res.status(400).json({ message: "Already acted by HR" });
      }

      leave.approvals.hr.status = action;
      leave.approvals.hr.actionBy = req.user.id; // Who approved
      leave.approvals.hr.actionDate = new Date();
      leave.approvals.hr.remark = action === "APPROVED" ? "Approved by HR" : "Rejected by HR";

      if (action === "REJECTED") leave.status = "REJECTED";

      // ✅ Final approval
      if (leave.approvals.tl.status === "APPROVED" && leave.approvals.hr.status === "APPROVED") {
        leave.status = "APPROVED";
      }
    }

    else {
      return res.status(403).json({ message: "Not authorized" });
    }

    await leave.save();

    res.json({
      message: `Leave ${action} successfully`,
      leave
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};



exports.myLeaves = async (req, res) => {
  try {
    const leaves = await Leave.find({
      employeeId: req.user.id,
      companyId: req.user.companyId
    }).sort({ createdAt: -1 });

    res.json(leaves);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


exports.pendingLeaves = async (req, res) => {
  try {
    const role = req.user.role;

    let filter = {
      companyId: req.user.companyId,
      status: "PENDING"
    };

    // TL sees only leaves where TL approval is pending
    if (role === "TL") {
      filter["approvals.tl.status"] = "PENDING";
    }

    // HR sees only leaves where HR approval is pending
    if (role === "HR") {
      filter["approvals.hr.status"] = "PENDING";
    }

    if (!["TL", "HR"].includes(role)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const leaves = await Leave.find(filter).sort({ createdAt: -1 });

    res.json(leaves);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
