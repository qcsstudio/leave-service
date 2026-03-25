const attendanceService = require("../attendance/attendance.service");
const EmployeeClient = require("../../clients/employee.client");
const BiometricEvent = require("./biometricEvent.model");

exports.processEvent = async ({ device, employeeCode, timestamp, rawPayload }) => {
  const eventTime = new Date(timestamp);

  // :small_blue_diamond: Save RAW event first
  const event = await BiometricEvent.create({
    deviceId: device._id,
    companyId: device.companyId,
    employeeCode,
    timestamp: eventTime,
    rawPayload
  });

  // :small_blue_diamond: Resolve employee using employeeCode
  const employee = await EmployeeClient.findByBiometricCode(employeeCode, device.companyId);

  if (!employee) throw new Error("Employee not found for code: " + employeeCode);

  // :small_blue_diamond: Check if employee has already punched in today
  const status = await attendanceService.getTodayStatus({
    companyId: device.companyId,
    employeeId: employee._id
  });

  let result;

  if (!status.isPunchedIn) {
    result = await attendanceService.punchIn({
      companyId: device.companyId,
      employeeId: employee._id,
      time: eventTime
    });
  } else {
    result = await attendanceService.punchOut({
      companyId: device.companyId,
      employeeId: employee._id,
      time: eventTime
    });
  }

  // :small_blue_diamond: Mark event as processed
  event.processed = true;
  await event.save();

  return result;
};