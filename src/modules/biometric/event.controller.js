// ===== event.controller.js =====
const deviceService = require("./device.service");
const processor = require("./event.processor");
const EmployeeClient = require("../../clients/employee.client");
const attendanceService = require("../attendance/attendance.service");

exports.receiveEvent = async (req, res) => {
  try {
    const apiKey = req.headers["x-device-key"];
    const device = await deviceService.findByApiKey(apiKey);

    if (!device)
      return res.status(403).json({ message: "Invalid device" });

    const { employeeCode, timestamp } = req.body;

    if (!employeeCode || !timestamp)
      return res.status(400).json({ message: "Invalid payload" });

    // Fetch employee first
    const employee = await EmployeeClient.findByBiometricCode(
      employeeCode,
      device.companyId
    );

    if (!employee)
      return res.status(404).json({ message: "Employee not found" });

    // Process event (punch in/out)
    const punchResult = await attendanceService.biometricPunch({
      companyId: device.companyId,
      employeeId: employee._id,  // use _id from found employee
      time: timestamp
    });

    const punchDoc = punchResult.punch; // unwrap punch doc
    const workedMinutes = punchResult.workedMinutes || null;

    // Respond with full details
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
        workedMinutes
      },
      time: timestamp
    });

  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};
