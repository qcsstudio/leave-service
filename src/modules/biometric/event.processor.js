const attendanceService = require("../attendance/attendance.service");
const EmployeeClient = require("../../clients/employee.client");
const BiometricEvent = require("./biometricEvent.model");


exports.processEvent = async ({
  device,
  employeeCode,
  timestamp,
  rawPayload
}) => {

  const eventTime = new Date(timestamp);

  // Save RAW event
  const event = await BiometricEvent.create({
    deviceId: device._id,
    companyId: device.companyId,
    employeeCode,
    timestamp: eventTime,
    rawPayload
  });

  // Resolve employee
  const employee =
    await EmployeeClient.findByBiometricCode(
      employeeCode,
      device.companyId
    );

  if (!employee)
    throw new Error("Employee not found");


  // Decide punch
  const status =
    await attendanceService.getTodayStatus({
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

  event.processed = true;
  await event.save();

  return result;
};
