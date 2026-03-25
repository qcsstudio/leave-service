



const util = require('util');
const exec = util.promisify(require('child_process').exec);
const ZKLib = require('node-zklib');
const DeviceModel = require("./device.model");

const DEFAULT_PORT = 4370;

// :mag: Ping check
async function isReachableByPing(ip) {
  try {
    await exec(`ping -c 1 -W 1 ${ip}`);
    return true;
  } catch {
    return false;
  }
}

// :repeat: Retry connection
async function connectWithRetries(ip, port, attempts = 3, timeout = 10000) {
  let lastErr;

  for (let i = 0; i < attempts; i++) {
    try {
      const zk = new ZKLib(ip, port, timeout, 4000);
      await zk.createSocket();
      return zk;
    } catch (err) {
      lastErr = err;
      const delay = 1000 * (i + 1);
      console.log(`:repeat: Retry ${i + 1} in ${delay}ms`);
      await new Promise(r => setTimeout(r, delay));
    }
  }

  throw lastErr;
}

// :inbox_tray: Fetch logs
async function fetchLogsFromDevice(device) {
  let zk;
  const port = device.port || DEFAULT_PORT;

  // :white_check_mark: FIX: handle all IP formats
  const ip = device.ipAddress || device.ip || device.ip_address;

  console.log(":receipt: Device Data:", device);

  // :x: Prevent crash
  if (!ip) {
    console.error(":x: Missing IP for device:", device.name);
    return [];
  }

  console.log(`:satellite_antenna: Connecting to ${device.name} (${ip})`);

  try {
    const reachable = await isReachableByPing(ip);

    if (!reachable) {
      console.warn(":warning: Device not reachable, trying anyway...");
    }

    zk = await connectWithRetries(ip, port);

    console.log(":white_check_mark: Connected");

    const logs = await zk.getAttendances();
    const data = logs?.data || [];

    console.log(`:inbox_tray: Logs received: ${data.length}`);

    return data.map(log => ({
      employeeCode: log.deviceUserId,
      timestamp: log.recordTime
    }));

  } catch (err) {
    console.error(`:x: Error (${ip}):`, err);
    return [];
  } finally {
    if (zk) {
      try {
        await zk.disconnect();
        console.log(":electric_plug: Disconnected");
      } catch {}
    }
  }
}

// :fire: MAIN POLLER
async function pollDevices() {
  console.log(":arrows_counterclockwise: Checking biometric devices...");

  try {
    const devices = await DeviceModel.find();

    if (!devices || devices.length === 0) {
      console.log(":warning: No devices found in DB");
      return;
    }

    for (const dev of devices) {

      // :dart: ONLY YOUR DEVICE (IMPORTANT)
      if (dev.ipAddress !== "192.168.1.201") {
        console.log(`:black_right_pointing_double_triangle_with_vertical_bar: Skipping: ${dev.name}`);
        continue;
      }

      const logs = await fetchLogsFromDevice(dev);

      console.log(`:white_check_mark: ${dev.name}: ${logs.length} logs`);
    }

  } catch (err) {
    console.error(":x: Poller Error:", err.message);
  }
}

// :white_check_mark: EXPORT
module.exports = {
  pollDevices
};