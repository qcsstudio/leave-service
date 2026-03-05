const Leave = require("./leave.model");
const LeaveBalance = require("./leaveBalance.model");
const Holiday = require("../holiday/holiday.model");
const mongoose = require("mongoose");

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

// ===== HR / TL LEAVE DASHBOARD =====
exports.getHRDashboard = async ({ companyId, userId, role }) => {
  if (!["HR", "TL"].includes(role)) {
    throw new Error("Unauthorized access");
  }

  const companyObjectId = new mongoose.Types.ObjectId(companyId);
  const userObjectId = new mongoose.Types.ObjectId(userId);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const next7Days = new Date(todayStart);
  next7Days.setDate(next7Days.getDate() + 7);

  const currentYear = new Date().getFullYear();

  /* --- Scope: HR sees all, TL sees their team --- */
  let employeeIds = null;

  if (role === "TL") {
    const team = await mongoose.connection
      .collection("teams")
      .findOne({ teamLeadId: userObjectId });

    employeeIds =
      team?.assignedEmployeeList?.map(
        (emp) => new mongoose.Types.ObjectId(emp.employeeId)
      ) || [];
  }

  // Base filter for leaves
  const baseLeaveFilter = { companyId: companyObjectId };
  if (employeeIds) {
    baseLeaveFilter.employeeId = { $in: employeeIds };
  }

  /* --- 1. STATS --- */

  // On Leave Today
  const onLeaveToday = await Leave.countDocuments({
    ...baseLeaveFilter,
    status: "APPROVED",
    fromDate: { $lte: todayEnd },
    toDate: { $gte: todayStart }
  });

  // Upcoming 7 Days
  const upcoming7Days = await Leave.countDocuments({
    ...baseLeaveFilter,
    status: "APPROVED",
    fromDate: { $gt: todayEnd, $lte: next7Days }
  });

  // Pending Approvals
  let pendingFilter = {
    ...baseLeaveFilter,
    status: "PENDING"
  };
  if (role === "TL") {
    pendingFilter["approvals.tl.status"] = "PENDING";
  } else if (role === "HR") {
    pendingFilter["approvals.hr.status"] = "PENDING";
  }
  const pendingApprovals = await Leave.countDocuments(pendingFilter);

  // Avg Approval Time (hours) — from createdAt to final approval date
  const approvedLeaves = await Leave.find({
    ...baseLeaveFilter,
    status: "APPROVED",
    "approvals.hr.actionDate": { $exists: true }
  })
    .select("createdAt approvals.hr.actionDate")
    .lean();

  let avgApprovalHours = 0;
  if (approvedLeaves.length > 0) {
    const totalMs = approvedLeaves.reduce((sum, l) => {
      const created = new Date(l.createdAt);
      const approved = new Date(l.approvals.hr.actionDate);
      return sum + (approved - created);
    }, 0);
    avgApprovalHours = Math.round(totalMs / approvedLeaves.length / 3600000);
  }

  /* --- 2. APPROVAL QUEUE --- */
  const approvalQueue = await Leave.find(pendingFilter)
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  // Enrich with employee names
  const empIds = [...new Set(approvalQueue.map((l) => l.employeeId.toString()))];
  const employees = await mongoose.connection
    .collection("employees")
    .find({
      _id: { $in: empIds.map((id) => new mongoose.Types.ObjectId(id)) }
    })
    .project({ fullName: 1 })
    .toArray();

  const empMap = {};
  employees.forEach((e) => {
    empMap[e._id.toString()] = e.fullName;
  });

  const approvalQueueFormatted = approvalQueue.map((l) => {
    const days = Math.floor((new Date(l.toDate) - new Date(l.fromDate)) / 86400000) + 1;
    return {
      _id: l._id,
      employeeId: l.employeeId,
      employeeName: empMap[l.employeeId.toString()] || "Unknown",
      leaveType: l.leaveType,
      fromDate: l.fromDate,
      toDate: l.toDate,
      days,
      reason: l.reason,
      status: l.status,
      approvals: l.approvals
    };
  });

  /* --- 3. LEAVE BALANCE TABLE (all employees) --- */
  let balanceFilter = { companyId: companyObjectId, year: currentYear };
  if (employeeIds) {
    balanceFilter.employeeId = { $in: employeeIds };
  }

  const balances = await LeaveBalance.find(balanceFilter).lean();

  const balanceEmpIds = [...new Set(balances.map((b) => b.employeeId.toString()))];
  const balanceEmployees = await mongoose.connection
    .collection("employees")
    .find({
      _id: { $in: balanceEmpIds.map((id) => new mongoose.Types.ObjectId(id)) }
    })
    .project({ fullName: 1 })
    .toArray();

  const balanceEmpMap = {};
  balanceEmployees.forEach((e) => {
    balanceEmpMap[e._id.toString()] = e.fullName;
  });

  const leaveBalanceTable = balances.map((b) => ({
    employeeId: b.employeeId,
    employeeName: balanceEmpMap[b.employeeId.toString()] || "Unknown",
    annual: b.balances.annual.total - b.balances.annual.used,
    sick: b.balances.sick.total - b.balances.sick.used,
    casual: b.balances.casual.total - b.balances.casual.used,
    compOff: b.balances.compOff.total - b.balances.compOff.used
  }));

  /* --- 4. HOLIDAYS --- */
  const yearStart = new Date(currentYear, 0, 1);
  const yearEnd = new Date(currentYear, 11, 31, 23, 59, 59, 999);

  const holidays = await Holiday.find({
    companyId: companyObjectId,
    date: { $gte: yearStart, $lte: yearEnd }
  })
    .sort({ date: 1 })
    .lean();

  return {
    stats: {
      onLeaveToday,
      upcoming7Days,
      pendingApprovals,
      avgApprovalHours: `${avgApprovalHours}h`
    },
    approvalQueue: approvalQueueFormatted,
    leaveBalanceTable,
    holidays
  };
};
