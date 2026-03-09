const dashboardService = require("./dashboard.service");

exports.getAttendanceDashboard = async (req, res) => {
  try {
    const { month, year } = req.query;

    const data = await dashboardService.getAttendanceDashboard({
      companyId: req.user.companyId,
      employeeId: req.user.id,
      month: month ? Number(month) : undefined,
      year: year ? Number(year) : undefined
    });

    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
