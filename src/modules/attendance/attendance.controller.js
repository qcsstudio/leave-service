const service = require("./attendance.service");

exports.punchIn = async (req, res) => {
  try {
    const data = await service.punchIn({
      companyId: req.user.companyId,
      employeeId: req.user.id
    });
    res.json({ message: "Punched in", data });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
};

exports.punchOut = async (req, res) => {
  try {
    const data = await service.punchOut({
      companyId: req.user.companyId,
      employeeId: req.user.id
    });
    res.json({ message: "Punched out", data });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
};

exports.todayStatus = async (req, res) => {
  const data = await service.getTodayStatus({
    companyId: req.user.companyId,
    employeeId: req.user.id
  });
  res.json(data);
};

exports.monthCalendar = async (req, res) => {
  const { month, year } = req.query;
  let employeeId;

  if (req.user.role === "EMPLOYEE") employeeId = req.user.id;

  if (req.user.role === "HR" || req.user.role === "TL") employeeId = req.query.id;

  const data = await service.getMonthlyCalendar({
    companyId: req.user.companyId,
    employeeId,
    month: Number(month),
    year: Number(year)
  });

  res.json(data);
};

