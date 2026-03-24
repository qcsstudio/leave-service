const Device = require("./device.model");
const processor = require("./event.processor");
const ZKLib = require("node-zklib");
const BiometricEvent = require("./biometricEvent.model");

const DEFAULT_PORT = 4370;

async function fetchLogsFromDevice(device) {
  let zk;

  try {
    const port = DEFAULT_PORT; // 🔥 force 4370

    console.log("====================================");
    console.log("📡 Trying to connect device");
    console.log("Device Name:", device.name);
    console.log("Device IP:", device.ipAddress);
    console.log("Device Port (forced):", port);
    console.log("====================================");

    zk = new ZKLib(device.ipAddress, port, 10000, 4000);

    await zk.createSocket();

    console.log("✅ Connected to device");

    const logs = await zk.getAttendances();

    const data = logs?.data || [];

    console.log("📥 Raw logs:", data.length);

    return data.map(log => ({
      employeeCode: log.deviceUserId,
      timestamp: log.recordTime
    }));

  } catch (error) {
    console.error("❌ Device connection failed:", error.message);
    return [];
  } finally {
    if (zk) {
      try {
        await zk.disconnect();
        console.log("🔌 Disconnected");
      } catch (e) {
        console.log("⚠️ Disconnect error ignored");
      }
    }
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