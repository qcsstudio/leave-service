const Attendance = require("../attendance/attendance.model");
const Punch = require("../attendance/punch.model");

// ===== Helpers =====
const startOfDay = (d = new Date()) => {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  return date;
};

const diffMinutes = (a, b) => Math.floor((b - a) / 60000);

// ===== START BREAK =====
exports.startBreak = async ({ companyId, employeeId }) => {
  const today = startOfDay();

  // Employee must have an active work punch (punched in)
  const activePunch = await Punch.findOne({
    companyId,
    employeeId,
    type: "WORK",
    punchOut: null
  });

  if (!activePunch) throw new Error("You must punch in before starting a break");

  // Check for already active break
  const activeBreak = await Punch.findOne({
    companyId,
    employeeId,
    type: "BREAK",
    punchOut: null
  });

  if (activeBreak) throw new Error("Break already in progress");

  // Get or create attendance record
  const attendance = await Attendance.findOne({
    companyId,
    employeeId,
    date: today
  });

  if (!attendance) throw new Error("No attendance record found for today");

  const breakPunch = await Punch.create({
    companyId,
    employeeId,
    attendanceId: attendance._id,
    punchIn: new Date(),
    type: "BREAK"
  });

  return { break: breakPunch };
};

// ===== END BREAK =====
exports.endBreak = async ({ companyId, employeeId }) => {
  const activeBreak = await Punch.findOne({
    companyId,
    employeeId,
    type: "BREAK",
    punchOut: null
  });

  if (!activeBreak) throw new Error("No active break found");

  activeBreak.punchOut = new Date();
  await activeBreak.save();

  const minutes = diffMinutes(activeBreak.punchIn, activeBreak.punchOut);

  // Update breakMinutes in attendance
  await Attendance.findByIdAndUpdate(activeBreak.attendanceId, {
    $inc: { breakMinutes: minutes }
  });

  return {
    break: activeBreak,
    breakMinutes: minutes
  };
};

// ===== GET BREAK STATUS =====
exports.getBreakStatus = async ({ companyId, employeeId }) => {
  const activeBreak = await Punch.findOne({
    companyId,
    employeeId,
    type: "BREAK",
    punchOut: null
  }).lean();

  return {
    onBreak: !!activeBreak,
    breakStartTime: activeBreak?.punchIn || null
  };
};

// ===== GET TODAY'S BREAKS =====
exports.getTodayBreaks = async ({ companyId, employeeId }) => {
  const today = startOfDay();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const breaks = await Punch.find({
    companyId,
    employeeId,
    type: "BREAK",
    punchIn: { $gte: today, $lt: tomorrow }
  })
    .sort({ punchIn: 1 })
    .lean();

  let totalBreakMinutes = 0;

  const formatted = breaks.map((b) => {
    const mins = b.punchOut ? diffMinutes(b.punchIn, b.punchOut) : 0;
    totalBreakMinutes += mins;
    return {
      _id: b._id,
      start: b.punchIn,
      end: b.punchOut || null,
      minutes: mins
    };
  });

  return {
    breaks: formatted,
    totalBreakMinutes,
    count: breaks.length
  };
};
