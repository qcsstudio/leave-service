const Attendance = require("./attendance.model");
const Punch = require("./punch.model");
const mongoose = require("mongoose");

// ===== Date Helpers =====
const startOfDay = (d = new Date()) => {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  return date;
};

const startOfMonth = (y, m) => new Date(y, m, 1);
const endOfMonth = (y, m) => new Date(y, m + 1, 0, 23, 59, 59);

// Calculate worked minutes
const diffMinutes = (a, b) => Math.floor((b - a) / 60000);

// ===== PUNCH IN =====
exports.punchIn = async ({ companyId, employeeId, time }) => {
  const punchTime = time ? new Date(time) : new Date();
  const today = startOfDay(punchTime);

  // Check for existing open punch
  const openPunch = await Punch.findOne({
    companyId,
    employeeId,
    punchOut: null
  });

  if (openPunch) throw new Error("Already punched in");

  // Upsert attendance
  const attendance = await Attendance.findOneAndUpdate(
    { companyId, employeeId, date: today },
    { $setOnInsert: { companyId, employeeId, date: today } },
    { upsert: true, returnDocument: "after" } // fixed mongoose warning
  );

  // Create punch
  const punch = await Punch.create({
    companyId,
    employeeId,
    attendanceId: attendance._id,
    punchIn: punchTime
  });

  await Attendance.findByIdAndUpdate(attendance._id, {
    $set: { firstPunchIn: punch.punchIn }
  });

  return {
    punch,
    attendance
  };
};

// ===== PUNCH OUT =====
exports.punchOut = async ({ companyId, employeeId, time }) => {
  const punchTime = time ? new Date(time) : new Date();

  // Find open punch
  const punch = await Punch.findOne({
    companyId,
    employeeId,
    punchOut: null
  });

  if (!punch) throw new Error("No active punch");

  punch.punchOut = punchTime;
  await punch.save();

  // Calculate worked minutes
  const minutes = diffMinutes(punch.punchIn, punch.punchOut);

  await Attendance.findByIdAndUpdate(punch.attendanceId, {
    $inc: { workedMinutes: minutes },
    $set: { lastPunchOut: punch.punchOut }
  });

  return {
    punch,
    workedMinutes: minutes
  };
};

// ===== GET TODAY STATUS =====
exports.getTodayStatus = async ({ companyId, employeeId }) => {
  const today = startOfDay();

  const attendance = await Attendance.findOne({
    companyId,
    employeeId,
    date: today
  }).lean();

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

// ===== GET MONTHLY CALENDAR =====
exports.getMonthlyCalendar = async ({ companyId, employeeId, month, year }) => {
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

// ===== BIOMETRIC / MANUAL PUNCH =====
exports.biometricPunch = async ({ companyId, employeeId, time }) => {
  const openPunch = await Punch.findOne({
    companyId,
    employeeId,
    punchOut: null
  });

  if (!openPunch) {
    return exports.punchIn({ companyId, employeeId, time });
  } else {
    return exports.punchOut({ companyId, employeeId, time });
  }
};

// ===== DASHBOARD STATS (HR / TL) =====
exports.getDashboardStats = async ({ companyId, userId, role }) => {
  if (!["HR", "TL"].includes(role)) {
    throw new Error("Unauthorized access");
  }

  const companyObjectId = new mongoose.Types.ObjectId(companyId);
  const userObjectId = new mongoose.Types.ObjectId(userId);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  /* --- Scope: HR sees all, TL sees only their team --- */
  let employeeMatch = { companyId: companyObjectId };

  if (role === "TL") {
    const team = await mongoose.connection
      .collection("teams")
      .findOne({ teamLeadId: userObjectId });

    const teamEmployeeIds =
      team?.assignedEmployeeList?.map(
        (emp) => new mongoose.Types.ObjectId(emp.employeeId)
      ) || [];

    employeeMatch._id = { $in: teamEmployeeIds };
  }

  /* --- Aggregation --- */
  const result = await mongoose.connection
    .collection("employees")
    .aggregate([
      { $match: employeeMatch },
      {
        $facet: {
          /* TOTAL EMPLOYEES */
          totalEmployees: [{ $count: "count" }],

          /* STATUS COUNTS */
          presentCount: [
            {
              $lookup: {
                from: "attendances",
                let: { empId: "$_id" },
                pipeline: [
                  {
                    $match: {
                      companyId: companyObjectId,
                      date: { $gte: todayStart, $lte: todayEnd },
                      status: "PRESENT",
                      $expr: { $eq: ["$employeeId", "$$empId"] }
                    }
                  }
                ],
                as: "att"
              }
            },
            { $match: { att: { $ne: [] } } },
            { $count: "count" }
          ],

          absentCount: [
            {
              $lookup: {
                from: "attendances",
                let: { empId: "$_id" },
                pipeline: [
                  {
                    $match: {
                      companyId: companyObjectId,
                      date: { $gte: todayStart, $lte: todayEnd },
                      status: "ABSENT",
                      $expr: { $eq: ["$employeeId", "$$empId"] }
                    }
                  }
                ],
                as: "att"
              }
            },
            { $match: { att: { $ne: [] } } },
            { $count: "count" }
          ],

          lateCount: [
            {
              $lookup: {
                from: "attendances",
                let: { empId: "$_id" },
                pipeline: [
                  {
                    $match: {
                      companyId: companyObjectId,
                      date: { $gte: todayStart, $lte: todayEnd },
                      status: "LATE",
                      $expr: { $eq: ["$employeeId", "$$empId"] }
                    }
                  }
                ],
                as: "att"
              }
            },
            { $match: { att: { $ne: [] } } },
            { $count: "count" }
          ],

          onLeaveCount: [
            {
              $lookup: {
                from: "attendances",
                let: { empId: "$_id" },
                pipeline: [
                  {
                    $match: {
                      companyId: companyObjectId,
                      date: { $gte: todayStart, $lte: todayEnd },
                      status: "LEAVE",
                      $expr: { $eq: ["$employeeId", "$$empId"] }
                    }
                  }
                ],
                as: "att"
              }
            },
            { $match: { att: { $ne: [] } } },
            { $count: "count" }
          ]
        }
      },
      {
        $project: {
          totalEmployees: {
            $ifNull: [{ $arrayElemAt: ["$totalEmployees.count", 0] }, 0]
          },
          present: {
            $ifNull: [{ $arrayElemAt: ["$presentCount.count", 0] }, 0]
          },
          absent: {
            $ifNull: [{ $arrayElemAt: ["$absentCount.count", 0] }, 0]
          },
          late: {
            $ifNull: [{ $arrayElemAt: ["$lateCount.count", 0] }, 0]
          },
          onLeave: {
            $ifNull: [{ $arrayElemAt: ["$onLeaveCount.count", 0] }, 0]
          }
        }
      },
      {
        $addFields: {
          notMarked: {
            $subtract: [
              "$totalEmployees",
              { $add: ["$present", "$absent", "$late", "$onLeave"] }
            ]
          }
        }
      }
    ])
    .toArray();

  return result[0] || {
    totalEmployees: 0,
    present: 0,
    absent: 0,
    late: 0,
    onLeave: 0,
    notMarked: 0
  };
};
