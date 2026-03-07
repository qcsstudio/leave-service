const Regularization = require("./regularization.model");
const Attendance = require("../attendance/attendance.model");
const Punch = require("../attendance/punch.model");

const startOfDay = (d) => {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  return date;
};

const diffMinutes = (a, b) => Math.floor((new Date(b) - new Date(a)) / 60000);

// ===== EMPLOYEE: Create Regularization =====
exports.createRegularization = async ({
  companyId, employeeId, date, type,
  punchIn, punchOut, hours, minutes, mode,
  reason, note, attachmentUrl
}) => {
  // Check duplicate for same date + type
  const existing = await Regularization.findOne({
    companyId, employeeId,
    date: startOfDay(date),
    type,
    status: { $in: ["PENDING", "APPROVED"] }
  });

  if (existing) {
    throw new Error("Regularization already exists for this date and type");
  }

  const reg = await Regularization.create({
    companyId,
    employeeId,
    date: startOfDay(date),
    type,
    punchIn: punchIn || null,
    punchOut: punchOut || null,
    hours: hours || 0,
    minutes: minutes || 0,
    mode: mode || null,
    reason: reason || null,
    note: note || "",
    attachmentUrl: attachmentUrl || null
  });

  return reg;
};

// ===== EMPLOYEE: My Requests =====
exports.getMyRequests = async ({ companyId, employeeId, status, limit }) => {
  const filter = { companyId, employeeId };
  if (status) filter.status = status;

  const requests = await Regularization.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit || 20)
    .lean();

  return requests;
};

// ===== HR: Get All Pending Requests =====
exports.getPendingRequests = async ({ companyId }) => {
  const requests = await Regularization.aggregate([
    { $match: { companyId, status: "PENDING" } },
    { $sort: { createdAt: -1 } },
    {
      $lookup: {
        from: "employees",
        localField: "employeeId",
        foreignField: "_id",
        as: "employee"
      }
    },
    { $unwind: { path: "$employee", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 1, companyId: 1, employeeId: 1, date: 1, type: 1,
        punchIn: 1, punchOut: 1, hours: 1, minutes: 1, mode: 1,
        reason: 1, note: 1, attachmentUrl: 1, status: 1,
        createdAt: 1,
        employeeName: "$employee.fullName"
      }
    }
  ]);

  return requests;
};

// ===== HR: Get All Requests (with optional filters) =====
exports.getAllRequests = async ({ companyId, status, employeeId }) => {
  const filter = { companyId };
  if (status) filter.status = status;
  if (employeeId) filter.employeeId = employeeId;

  const requests = await Regularization.aggregate([
    { $match: filter },
    { $sort: { createdAt: -1 } },
    {
      $lookup: {
        from: "employees",
        localField: "employeeId",
        foreignField: "_id",
        as: "employee"
      }
    },
    { $unwind: { path: "$employee", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 1, companyId: 1, employeeId: 1, date: 1, type: 1,
        punchIn: 1, punchOut: 1, hours: 1, minutes: 1, mode: 1,
        reason: 1, note: 1, attachmentUrl: 1, status: 1,
        actionBy: 1, actionDate: 1, actionRemark: 1,
        createdAt: 1,
        employeeName: "$employee.fullName"
      }
    }
  ]);

  return requests;
};

// ===== HR: Take Action (Approve / Reject) =====
exports.takeAction = async ({ companyId, regularizationId, action, actionBy, remark }) => {
  if (!["APPROVED", "REJECTED"].includes(action)) {
    throw new Error("Invalid action");
  }

  const reg = await Regularization.findOne({
    _id: regularizationId,
    companyId
  });

  if (!reg) throw new Error("Regularization not found");
  if (reg.status !== "PENDING") throw new Error("Already processed");

  reg.status = action;
  reg.actionBy = actionBy;
  reg.actionDate = new Date();
  reg.actionRemark = remark || (action === "APPROVED" ? "Approved" : "Rejected");
  await reg.save();

  // If approved, update attendance
  if (action === "APPROVED") {
    await applyRegularization(reg);
  }

  return reg;
};

// ===== Apply Regularization to Attendance =====
async function applyRegularization(reg) {
  const { companyId, employeeId, date, type } = reg;
  const dayStart = startOfDay(date);

  switch (type) {
    case "ADD_MISSING_PUNCH": {
      // Upsert attendance record
      const attendance = await Attendance.findOneAndUpdate(
        { companyId, employeeId, date: dayStart },
        { $setOnInsert: { companyId, employeeId, date: dayStart } },
        { upsert: true, returnDocument: "after" }
      );

      // Create punch record
      if (reg.punchIn) {
        const punch = await Punch.create({
          companyId, employeeId,
          attendanceId: attendance._id,
          punchIn: reg.punchIn,
          punchOut: reg.punchOut || null
        });

        const updates = {};
        if (!attendance.firstPunchIn || new Date(reg.punchIn) < new Date(attendance.firstPunchIn)) {
          updates.firstPunchIn = reg.punchIn;
        }
        if (reg.punchOut) {
          if (!attendance.lastPunchOut || new Date(reg.punchOut) > new Date(attendance.lastPunchOut)) {
            updates.lastPunchOut = reg.punchOut;
          }
          const worked = diffMinutes(reg.punchIn, reg.punchOut);
          updates.$inc = { workedMinutes: worked };
        }

        if (updates.$inc) {
          const inc = updates.$inc;
          delete updates.$inc;
          await Attendance.findByIdAndUpdate(attendance._id, { $set: updates, $inc: inc });
        } else if (Object.keys(updates).length) {
          await Attendance.findByIdAndUpdate(attendance._id, { $set: updates });
        }
      }

      // Update status to PRESENT if it was NOT_MARKED
      await Attendance.findOneAndUpdate(
        { _id: (await Attendance.findOne({ companyId, employeeId, date: dayStart }))._id, status: "NOT_MARKED" },
        { $set: { status: "PRESENT" } }
      );
      break;
    }

    case "CORRECT_TIME": {
      const totalMinutes = (reg.hours || 0) * 60 + (reg.minutes || 0);
      await Attendance.findOneAndUpdate(
        { companyId, employeeId, date: dayStart },
        {
          $set: { workedMinutes: totalMinutes, status: "PRESENT" },
          $setOnInsert: { companyId, employeeId, date: dayStart }
        },
        { upsert: true }
      );
      break;
    }

    case "MARK_AS_PRESENT":
    case "ON_DUTY":
    case "WORK_FROM_HOME": {
      const totalMinutes = (reg.hours || 0) * 60 + (reg.minutes || 0);
      await Attendance.findOneAndUpdate(
        { companyId, employeeId, date: dayStart },
        {
          $set: {
            workedMinutes: totalMinutes || 0,
            status: "PRESENT"
          },
          $setOnInsert: { companyId, employeeId, date: dayStart }
        },
        { upsert: true }
      );
      break;
    }
  }
}
