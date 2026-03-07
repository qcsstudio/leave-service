const service = require("./regularization.service");

// ===== Employee: Create Regularization =====
exports.create = async (req, res) => {
  try {
    const { date, type, punchIn, punchOut, hours, minutes, mode, reason, note } = req.body;

    if (!date || !type) {
      return res.status(400).json({ message: "Date and type are required" });
    }

    const data = await service.createRegularization({
      companyId: req.user.companyId,
      employeeId: req.user.id,
      date, type, punchIn, punchOut, hours, minutes, mode,
      reason, note,
      attachmentUrl: req.file?.location || null
    });

    res.status(201).json({ message: "Regularization request submitted", data });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// ===== Employee: My Requests =====
exports.myRequests = async (req, res) => {
  try {
    const { status, limit } = req.query;

    const data = await service.getMyRequests({
      companyId: req.user.companyId,
      employeeId: req.user.id,
      status: status || undefined,
      limit: limit ? Number(limit) : undefined
    });

    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ===== HR: Pending Requests =====
exports.pendingRequests = async (req, res) => {
  try {
    if (!["HR"].includes(req.user.role)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const data = await service.getPendingRequests({
      companyId: req.user.companyId
    });

    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ===== HR: All Requests =====
exports.allRequests = async (req, res) => {
  try {
    if (!["HR"].includes(req.user.role)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const { status, employeeId } = req.query;

    const data = await service.getAllRequests({
      companyId: req.user.companyId,
      status: status || undefined,
      employeeId: employeeId || undefined
    });

    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ===== HR: Approve / Reject =====
exports.takeAction = async (req, res) => {
  try {
    if (!["HR"].includes(req.user.role)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const { action, remark } = req.body;

    const data = await service.takeAction({
      companyId: req.user.companyId,
      regularizationId: req.params.id,
      action,
      actionBy: req.user.id,
      remark
    });

    res.json({ message: `Regularization ${action.toLowerCase()}`, data });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};
