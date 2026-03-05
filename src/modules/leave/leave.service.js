const Leave = require("./leave.model");
const LeaveBalance = require("./leaveBalance.model");

// Calculate days between two dates (inclusive)
const calcDays = (from, to) => {
  const diff = new Date(to) - new Date(from);
  return Math.floor(diff / 86400000) + 1;
};

// ===== EMPLOYEE DASHBOARD =====
exports.getEmployeeDashboard = async ({ companyId, employeeId, month, year }) => {
  const currentYear = year || new Date().getFullYear();
  const currentMonth = month || (new Date().getMonth() + 1);

  // 1. Leave Balance
  let balance = await LeaveBalance.findOne({
    companyId,
    employeeId,
    year: currentYear
  }).lean();

  if (!balance) {
    balance = {
      balances: {
        annual: { total: 0, used: 0 },
        sick: { total: 0, used: 0 },
        casual: { total: 0, used: 0 },
        compOff: { total: 0, used: 0 }
      }
    };
  }

  const leaveBalance = {
    annual: balance.balances.annual.total - balance.balances.annual.used,
    sick: balance.balances.sick.total - balance.balances.sick.used,
    casual: balance.balances.casual.total - balance.balances.casual.used,
    compOff: balance.balances.compOff.total - balance.balances.compOff.used
  };

  // 2. Recent Leave Requests (last 5, any status)
  const recentRequests = await Leave.find({
    companyId,
    employeeId
  })
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();

  const recentFormatted = recentRequests.map((l) => ({
    _id: l._id,
    leaveType: l.leaveType,
    fromDate: l.fromDate,
    toDate: l.toDate,
    days: calcDays(l.fromDate, l.toDate),
    reason: l.reason,
    status: l.status
  }));

  // 3. Leave History (filtered by month/year)
  const monthStart = new Date(currentYear, currentMonth - 1, 1);
  const monthEnd = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999);

  const history = await Leave.find({
    companyId,
    employeeId,
    fromDate: { $lte: monthEnd },
    toDate: { $gte: monthStart }
  })
    .sort({ fromDate: -1 })
    .lean();

  const leaveHistory = history.map((l) => ({
    _id: l._id,
    leaveType: l.leaveType,
    fromDate: l.fromDate,
    toDate: l.toDate,
    days: calcDays(l.fromDate, l.toDate),
    reason: l.reason,
    status: l.status,
    approvals: l.approvals
  }));

  return {
    leaveBalance,
    recentRequests: recentFormatted,
    leaveHistory
  };
};
