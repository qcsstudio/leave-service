const Device = require("./device.model");
const processor = require("./event.processor");

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

  console.log("📡 Polling device:", device.name, device.ipAddress);

  try {

    const logs = await fetchLogsFromDevice(device);

    for (const log of logs) {

      console.log("📥 Log received:", log);

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
