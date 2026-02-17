const Attendance = require("./attendance.model");
const Punch = require("./punch.model");
const mongoose = require("mongoose");

const startOfDay = (d = new Date()) => {
    const date = new Date(d);
    date.setHours(0, 0, 0, 0);
    return date;
};

const startOfMonth = (y, m) => new Date(y, m, 1);
const endOfMonth = (y, m) => new Date(y, m + 1, 0, 23, 59, 59);

const diffMinutes = (a, b) => Math.floor((b - a) / 60000);

exports.punchIn = async ({ companyId, employeeId }) => {
  const today = startOfDay();

  const openPunch = await Punch.findOne({
    companyId,
    employeeId,
    punchOut: null
  });

  if (openPunch) throw new Error("Already punched in");

  const attendance = await Attendance.findOneAndUpdate(
    { companyId, employeeId, date: today },
    {
      $setOnInsert: {
        companyId,
        employeeId,
        date: today
      }
    },
    { upsert: true, new: true }
  );

  const punch = await Punch.create({
    companyId,
    employeeId,
    attendanceId: attendance._id,
    punchIn: new Date()
  });

  await Attendance.findByIdAndUpdate(attendance._id, {
    $set: { firstPunchIn: punch.punchIn }
  });

  return punch;
};

exports.punchOut = async ({ companyId, employeeId }) => {
  const punch = await Punch.findOne({
    companyId,
    employeeId,
    punchOut: null
  });

  if (!punch) throw new Error("No active punch");

  punch.punchOut = new Date();
  await punch.save();

  const minutes = diffMinutes(punch.punchIn, punch.punchOut);

  await Attendance.findByIdAndUpdate(punch.attendanceId, {
    $inc: { workedMinutes: minutes },
    $set: { lastPunchOut: punch.punchOut }
  });

  return punch;
};

exports.getTodayStatus = async ({ companyId, employeeId }) => {
  const today = startOfDay();

  const attendance = await Attendance.findOne({
    companyId,
    employeeId,
    date: today
  });

  const openPunch = await Punch.findOne({
    companyId,
    employeeId,
    punchOut: null
  });

  return {
    attendance,
    isPunchedIn: !!openPunch,
    punchInTime: openPunch?.punchIn || null
  };
};



exports.getMonthlyCalendar = async ({
  companyId,
  employeeId,
  month,
  year
}) => {
  const m = month - 1;
  const start = startOfMonth(year, m);
  const end = endOfMonth(year, m);

  const records = await Attendance.find({
    companyId,
    employeeId,
    date: { $gte: start, $lte: end }
  }).lean();

  const map = {};
  records.forEach(r => {
    map[r.date.toISOString().slice(0, 10)] = r.status;
  });

  const daysInMonth = new Date(year, month, 0).getDate();
  const calendar = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, m, d);
    const key = date.toISOString().slice(0, 10);

    calendar.push({
      date,
      status: map[key] || "NOT_MARKED"
    });
  }

  return calendar;
};
