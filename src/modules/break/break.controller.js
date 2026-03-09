const service = require("./break.service");

exports.startBreak = async (req, res) => {
  try {
    const data = await service.startBreak({
      companyId: req.user.companyId,
      employeeId: req.user.id
    });
    res.json({ message: "Break started", data });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
};

exports.endBreak = async (req, res) => {
  try {
    const data = await service.endBreak({
      companyId: req.user.companyId,
      employeeId: req.user.id
    });
    res.json({ message: "Break ended", data });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
};

exports.breakStatus = async (req, res) => {
  try {
    const data = await service.getBreakStatus({
      companyId: req.user.companyId,
      employeeId: req.user.id
    });
    res.json(data);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
};

exports.todayBreaks = async (req, res) => {
  try {
    const data = await service.getTodayBreaks({
      companyId: req.user.companyId,
      employeeId: req.user.id
    });
    res.json(data);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
};
