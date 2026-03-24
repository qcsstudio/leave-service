const Device = require("./device.model");
const processor = require("./event.processor");
const ZKLib = require("node-zklib");
const BiometricEvent = require("./biometricEvent.model");

async function fetchLogsFromDevice(device) {

  try {

 console.log("====================================");
    console.log("📡 Trying to connect device");
    console.log("Device Name:", device.name);
    console.log("Device IP:", device.ipAddress);
    console.log("Device Port:", device.port);
    console.log("====================================");

    const zk = new ZKLib(
      device.ipAddress,
      device.port,
      10000,
      4000
    );

    await zk.createSocket();

    console.log("✅ Connected to device");

    const logs = await zk.getAttendances();

    console.log("📥 Raw logs:", logs.data.length);

    await zk.disconnect();

    return logs.data.map(log => ({
      employeeCode: log.deviceUserId,
      timestamp: log.recordTime
    }));

  } catch (error) {

    console.error("❌ Device connection failed:", error.message);

    return [];
  }
}

exports.pollDevices = async () => {

  console.log("🚀 Poller started at:", new Date());

  const devices = await Device.find({
    connectionMode: { $in: ["LAN", "LAN/IP"] },
    isActive: true
  });

  console.log("📡 Total devices:", devices.length);

  for (const device of devices) {

    console.log("📡 Polling device:", device.name, device.ipAddress);

    try {
      const logs = await fetchLogsFromDevice(device);

      console.log("📥 Logs fetched count:", logs.length);

      for (const log of logs) {

        console.log("👉 Processing log:", log);

        const exists = await BiometricEvent.findOne({
          deviceId: device._id,
          employeeCode: log.employeeCode,
          timestamp: log.timestamp
        });

        if (exists) {
          console.log("⚠️ Duplicate skipped:", log);
          continue;
        }

        await processor.processEvent({
          device,
          employeeCode: log.employeeCode,
          timestamp: log.timestamp,
          rawPayload: log
        });

      }

    } catch (err) {
      console.error("❌ Polling failed:", err.message);
    }
  }
};