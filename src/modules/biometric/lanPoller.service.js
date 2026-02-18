const Device = require("./device.model");
const processor = require("./event.processor");


// ⭐ MOCK device log reader
// Replace with SDK integration later
async function fetchLogsFromDevice(device) {

  // Simulated response from device
  return [
    {
      employeeCode: "EMP001",
      timestamp: new Date()
    }
  ];
}


// ⭐ MAIN POLLER
exports.pollDevices = async () => {

  const devices = await Device.find({
    connectionMode: "LAN",
    isActive: true
  });

  for (const device of devices) {

    try {

      const logs = await fetchLogsFromDevice(device);

      for (const log of logs) {

        await processor.processEvent({
          device,
          employeeCode: log.employeeCode,
          timestamp: log.timestamp,
          rawPayload: log
        });

      }

    } catch (err) {
      console.error(
        "Polling failed for device",
        device._id,
        err.message
      );
    }
  }
};
