const BiometricEvent = require("./biometricEvent.model");
const deviceService = require("./device.service");
const EmployeeClient = require("../../clients/employee.client");
const attendanceService = require("../attendance/attendance.service");

exports.receiveEvent = async (req, res) => {
  try {
    const apiKey = req.headers["x-device-key"]; // optional if device uses key
    const device = await deviceService.findByApiKey(apiKey);

    if (!device) {
      console.log("❌ Invalid device API key:", apiKey);
      return res.status(403).json({ message: "Invalid device" });
    }

    // ADMS payload example: { deviceUserId: '123', timestamp: '2026-03-24T10:15:00' }
    const { deviceUserId, timestamp, deviceId } = req.body;

    if (!deviceUserId || !timestamp) {
      return res.status(400).json({ message: "Invalid payload" });
    }

    // Check duplicates
    const exists = await BiometricEvent.findOne({
      deviceId: deviceId || device._id,
      employeeCode: deviceUserId,
      timestamp: new Date(timestamp)
    });

    if (exists) {
      console.log("⚠️ Duplicate entry skipped for", deviceUserId);
      return res.send("OK");
    }

    // Map employee
    const employee = await EmployeeClient.findByBiometricCode(
      deviceUserId,
      device.companyId
    );

    if (!employee) {
      console.log("❌ Employee not found for code", deviceUserId);
      return res.status(404).send("Employee not found");
    }

    // Save attendance
    const punchResult = await attendanceService.biometricPunch({
      companyId: device.companyId,
      employeeId: employee._id,
      time: timestamp
    });

    const punchDoc = punchResult.punch;

    // Save raw payload
    await BiometricEvent.create({
      deviceId: deviceId || device._id,
      employeeCode: deviceUserId,
      timestamp: new Date(timestamp),
      rawPayload: req.body
    });

    console.log("✅ Attendance saved for:", deviceUserId);

    res.json({
      status: "accepted",
      employee: {
        id: employee._id,
        code: employee.employeeId,
        name: employee.fullName,
        email: employee.email || null
      },
      punch: {
        id: punchDoc._id,
        punchIn: punchDoc.punchIn,
        punchOut: punchDoc.punchOut || null,
        workedMinutes: punchResult.workedMinutes || null
      },
      time: timestamp
    });
  } catch (err) {
    console.error("❌ Error processing ADMS event:", err);
    res.status(500).json({ message: err.message });
  }
};