const Holiday = require("./holiday.model");

// ===== ADD HOLIDAY =====
exports.addHoliday = async ({ companyId, name, date, type, description, createdBy }) => {
  const holiday = await Holiday.create({
    companyId,
    name,
    date,
    type: type || "FIXED",
    description: description || "",
    createdBy
  });
  return holiday;
};

// ===== GET ALL HOLIDAYS (year wise) =====
exports.getHolidays = async ({ companyId, year }) => {
  const currentYear = year || new Date().getFullYear();
  const start = new Date(currentYear, 0, 1);
  const end = new Date(currentYear, 11, 31, 23, 59, 59, 999);

  const holidays = await Holiday.find({
    companyId,
    date: { $gte: start, $lte: end }
  })
    .sort({ date: 1 })
    .lean();

  return holidays;
};

// ===== UPDATE HOLIDAY =====
exports.updateHoliday = async ({ companyId, holidayId, updates }) => {
  const holiday = await Holiday.findOneAndUpdate(
    { _id: holidayId, companyId },
    { $set: updates },
    { new: true }
  );
  if (!holiday) throw new Error("Holiday not found");
  return holiday;
};

// ===== DELETE HOLIDAY =====
exports.deleteHoliday = async ({ companyId, holidayId }) => {
  const holiday = await Holiday.findOneAndDelete({
    _id: holidayId,
    companyId
  });
  if (!holiday) throw new Error("Holiday not found");
  return holiday;
};

// ===== GET UPCOMING HOLIDAYS =====
exports.getUpcomingHolidays = async ({ companyId, limit }) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const holidays = await Holiday.find({
    companyId,
    date: { $gte: today }
  })
    .sort({ date: 1 })
    .limit(limit || 5)
    .lean();

  return holidays;
};
