const crypto = require("crypto");
const Device = require("./device.model");

// Create Device
exports.createDevice = async (data) => {

  if (
    data.connectionMode === "WEBHOOK" ||
    data.connectionMode === "CLOUD"
  ) {
    data.apiKey = crypto.randomBytes(32).toString("hex");
  }

  return Device.create(data);
};


// List Devices
exports.getDevices = async (companyId) => {
  return Device.find({ companyId }).lean();
};


// Delete Device
exports.deleteDevice = async (id, companyId) => {

  const result = await Device.deleteOne({
    _id: id,
    companyId
  });

  if (!result.deletedCount)
    throw new Error("Device not found");
};


// ⭐ REQUIRED — MISSING BEFORE
exports.findByApiKey = async (apiKey) => {
  if (!apiKey) return null;
  return Device.findOne({ apiKey, isActive: true });
};
