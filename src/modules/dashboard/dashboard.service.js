const mongoose = require("mongoose");
const Attendance = require("../attendance/attendance.model");
const Punch = require("../attendance/punch.model");
const Leave = require("../leave/leave.model");
const LeaveBalance = require("../leave/leaveBalance.model");
const Holiday = require("../holiday/holiday.model");
const Regularization = require("../regularization/regularization.model");

// Shift collection (schema-less)
const ShiftConfig = mongoose.model(
  "Shift",
  new mongoose.Schema({}, { strict: false, collection: "shifts" })
);

// ===== Helpers =====
const startOfDay = (d = new Date()) => {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  return date;
};

const formatMinutes = (mins) => {
  if (!mins || mins <= 0) return null;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
};

const formatTime12 = (date) => {
  if (!date) return null;
  const d = new Date(date);
  let hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${hours.toString().padStart(2, "0")}:${minutes} ${ampm}`;
};

// ===== GET EMPLOYEE SHIFT =====
const getEmployeeShift = async (employeeId) => {
  const shift = await ShiftConfig.findOne({
    "assignedEmployeeList.employeeId": employeeId,
    isActive: true
  }).lean();

  if (!shift) return null;

  const shiftTitle = shift.title || "N/A";
  const startTime = shift.shiftTimings?.[0]?.startTime || "00:00";
  const endTime = shift.shiftTimings?.[0]?.endTime || "00:00";
  const graceMinutes =
    (shift.shiftTimings?.[0]?.startOff?.hours || 0) * 60 +
    (shift.shiftTimings?.[0]?.startOff?.minutes || 0);

  const shiftDisplay = `${shiftTitle} (${startTime}-${endTime})`;

  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  const expectedMinutes = eh * 60 + em - (sh * 60 + sm);
  const expectedHours = `${Math.floor(expectedMinutes / 60)}h ${expectedMinutes % 60}m`;

  return {
    shiftDisplay,
    shiftTitle,
    startTime,
    endTime,
    graceMinutes,
    expectedMinutes,
    expectedHours
  };
};

// ===== MAIN DASHBOARD =====
exports.getAttendanceDashboard = async ({ companyId, employeeId, month, year }) => {
  const now = new Date();
  const currentMonth = month || now.getMonth() + 1;
  const currentYear = year || now.getFullYear();
  const m = currentMonth - 1;
  const today = startOfDay(now);

  // --- 1. Shift Info ---
  const shiftInfo = await getEmployeeShift(employeeId);

  // --- 2. Today's Attendance ---
  const todayAttendance = await Attendance.findOne({
    companyId,
    employeeId,
    date: today
  }).lean();

  const openPunch = await Punch.findOne({
    companyId,
    employeeId,
    punchOut: null
  }).lean();

  // Break minutes today
  const todayBreakPunches = await Punch.find({
    companyId,
    employeeId,
    attendanceId: todayAttendance?._id,
    type: "BREAK",
    punchOut: { $ne: null }
  }).lean();

  const breakMinutes = todayBreakPunches.reduce((sum, p) => {
    return sum + Math.floor((new Date(p.punchOut) - new Date(p.punchIn)) / 60000);
  }, 0);

  // Overtime
  let overtimeMinutes = 0;
  if (shiftInfo && todayAttendance?.workedMinutes > shiftInfo.expectedMinutes) {
    overtimeMinutes = todayAttendance.workedMinutes - shiftInfo.expectedMinutes;
  }

  const myActions = {
    shift: shiftInfo?.shiftDisplay || null,
    expectedHours: shiftInfo?.expectedHours || null,
    punchIn: formatTime12(todayAttendance?.firstPunchIn),
    punchOut: formatTime12(todayAttendance?.lastPunchOut),
    isPunchedIn: !!openPunch,
    overTime: formatMinutes(overtimeMinutes),
    worked: formatMinutes(todayAttendance?.workedMinutes || 0),
    breakTime: formatMinutes(todayAttendance?.breakMinutes || breakMinutes)
  };

  // --- 3. This Month Stats ---
  const monthStart = new Date(currentYear, m, 1);
  const monthEnd = new Date(currentYear, m + 1, 0, 23, 59, 59, 999);

  const monthRecords = await Attendance.find({
    companyId,
    employeeId,
    date: { $gte: monthStart, $lte: monthEnd }
  }).lean();

  const statusCounts = { PRESENT: 0, LATE: 0, ABSENT: 0, LEAVE: 0, WEEK_OFF: 0, NOT_MARKED: 0 };
  monthRecords.forEach((r) => {
    if (statusCounts[r.status] !== undefined) statusCounts[r.status]++;
  });

  // Count NOT_MARKED for past days that have no record
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  const todayDate = now.getDate();
  const maxDay = currentYear === now.getFullYear() && m === now.getMonth() ? todayDate : daysInMonth;
  const recordedDates = new Set(monthRecords.map((r) => new Date(r.date).getDate()));

  for (let d = 1; d <= maxDay; d++) {
    if (!recordedDates.has(d)) {
      statusCounts.NOT_MARKED++;
    }
  }

  const thisMonth = {
    shift: shiftInfo?.shiftDisplay || null,
    present: statusCounts.PRESENT,
    late: statusCounts.LATE,
    absent: statusCounts.ABSENT,
    leave: statusCounts.LEAVE,
    weekOff: statusCounts.WEEK_OFF,
    notMarked: statusCounts.NOT_MARKED
  };

  // --- 4. Weekly Calendar (current week Mon-Sun) ---
  const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon...
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = startOfDay(new Date(now.getTime() + mondayOffset * 86400000));

  const weekDays = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday.getTime() + i * 86400000);
    weekDays.push(startOfDay(d));
  }

  const weekRecords = await Attendance.find({
    companyId,
    employeeId,
    date: { $gte: weekDays[0], $lte: new Date(weekDays[6].getTime() + 86400000 - 1) }
  }).lean();

  const weekMap = {};
  weekRecords.forEach((r) => {
    weekMap[new Date(r.date).toISOString().slice(0, 10)] = r.status;
  });

  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const statusShortMap = {
    PRESENT: "P",
    LATE: "L",
    ABSENT: "A",
    LEAVE: "L",
    WEEK_OFF: "WO",
    NOT_MARKED: "NM"
  };

  const weeklyCalendar = weekDays.map((d, i) => {
    const key = d.toISOString().slice(0, 10);
    const status = weekMap[key] || (d <= today ? "NOT_MARKED" : null);
    return {
      day: dayNames[i],
      date: key,
      status,
      short: status ? statusShortMap[status] || status : null
    };
  });

  // --- 5. Attendance Log (last 7 days) ---
  const sevenDaysAgo = startOfDay(new Date(now.getTime() - 7 * 86400000));

  const recentAttendance = await Attendance.find({
    companyId,
    employeeId,
    date: { $gte: sevenDaysAgo, $lte: today }
  })
    .sort({ date: -1 })
    .lean();

  const attendanceLog = recentAttendance.map((r) => ({
    date: r.date,
    in: formatTime12(r.firstPunchIn),
    out: formatTime12(r.lastPunchOut),
    hours: formatMinutes(r.workedMinutes),
    status: r.status
  }));

  // Fill missing days in log
  for (let i = 0; i < 7; i++) {
    const d = startOfDay(new Date(now.getTime() - i * 86400000));
    const key = d.toISOString().slice(0, 10);
    const exists = attendanceLog.some(
      (a) => new Date(a.date).toISOString().slice(0, 10) === key
    );
    if (!exists) {
      attendanceLog.push({
        date: d,
        in: null,
        out: null,
        hours: null,
        status: "NOT_MARKED"
      });
    }
  }
  attendanceLog.sort((a, b) => new Date(b.date) - new Date(a.date));

  // --- 6. Leave Balance ---
  let balance = await LeaveBalance.findOne({
    companyId,
    employeeId,
    year: currentYear
  }).lean();

  let leaveBalance = null;
  if (balance) {
    leaveBalance = {
      annual: balance.balances.annual.total - balance.balances.annual.used,
      sick: balance.balances.sick.total - balance.balances.sick.used,
      casual: balance.balances.casual.total - balance.balances.casual.used,
      compOff: balance.balances.compOff.total - balance.balances.compOff.used
    };
  }

  // --- 7. Upcoming Holidays ---
  const upcomingHolidays = await Holiday.find({
    companyId,
    date: { $gte: today }
  })
    .sort({ date: 1 })
    .limit(5)
    .lean();

  // --- 8. My Regularization Requests (recent 5) ---
  const myRegularizations = await Regularization.find({
    companyId,
    employeeId
  })
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();

  const regularizationRequests = myRegularizations.map((r) => ({
    _id: r._id,
    date: r.date,
    type: r.type,
    status: r.status,
    reason: r.reason,
    note: r.note,
    createdAt: r.createdAt
  }));

  return {
    myActions,
    thisMonth,
    weeklyCalendar,
    attendanceLog,
    leaveBalance,
    upcomingHolidays,
    regularizationRequests
  };
};
